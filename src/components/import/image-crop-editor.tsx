import { useEffect, useId, useRef, useState } from "react";
import {
  type CropRect,
  type CropSize,
  constrainImageCrop,
  DEFAULT_IMAGE_CROP,
  fitCropFrame,
  getImageCropRect,
  type ImageCrop,
  MAX_IMAGE_CROP_ZOOM,
  MIN_IMAGE_CROP_ZOOM,
  moveImageCrop,
  zoomImageCrop,
} from "@/coloring/image-crop";
import { getCanvasContext, readThemeColor } from "@/coloring/pixel-raster";
import { Button } from "@/components/ui/button";
import type { KeyboardEvent, PointerEvent } from "react";
import type { ImageImportSource } from "@/coloring/import-image";

const FRAME_PADDING = 26;
const KEYBOARD_STEP = 0.015;
const FAST_KEYBOARD_STEP = 0.06;
const KEYBOARD_ZOOM_STEP = 0.08;
const WHEEL_ZOOM_RATE = 0.0022;
/** Below this the lattice stops describing cells and becomes a grey wash, so it is not drawn. */
const MIN_LATTICE_SPACING = 13;
/**
 * The processed preview and the crop stage share one box, so switching between them cannot reflow
 * the dialog.
 */
/**
 * The processed preview and the crop stage share one box that fills the artwork column. Its size
 * comes from the dialog rather than from the artwork, so switching modes cannot reflow it. The zero
 * flex basis matters: a canvas reports an intrinsic size, which would otherwise feed back into the
 * column height it is being measured against.
 */
export const IMPORT_STAGE_CLASS =
  "min-h-[clamp(12rem,34svh,26rem)] shrink basis-0 grow overflow-hidden rounded-lg border border-border sm:min-h-56";
/** Both modes reserve the same slot under the box, so the artwork never changes height. */
export const IMPORT_STAGE_FOOTER_CLASS = "min-h-11";

interface DragPoint {
  pointerId: number;
  x: number;
  y: number;
}

interface ImageCropEditorProps {
  initialCrop: ImageCrop;
  /** Reports the settled selection so the dialog footer can apply it. */
  onDraftChange: (crop: ImageCrop) => void;
  output: CropSize;
  source: ImageImportSource;
}

export function ImageCropEditor({ initialCrop, onDraftChange, output, source }: ImageCropEditorProps) {
  const animationFrameRef = useRef<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragPoint | null>(null);
  const instructionsId = useId();
  const zoomId = useId();
  const wheelRef = useRef<(event: WheelEvent) => void>(() => undefined);
  const [crop, setCrop] = useState(() => constrainImageCrop(initialCrop, source, output));
  const cropRef = useRef(crop);
  const [frame, setFrame] = useState({ height: 0, width: 0 });
  const constrainedCrop = constrainImageCrop(crop, source, output);
  const cropCenterX = constrainedCrop.centerX;
  const cropCenterY = constrainedCrop.centerY;
  const cropZoom = constrainedCrop.zoom;
  const frameHeight = frame.height;
  const frameWidth = frame.width;
  const outputHeight = output.height;
  const outputWidth = output.width;

  useEffect(() => {
    // The stage is already in view, so taking focus must not scroll the dialog body.
    canvasRef.current?.focus({ preventScroll: true });
    return () => {
      if (animationFrameRef.current !== undefined) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setFrame({ height: entry.contentRect.height, width: entry.contentRect.width });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && frameWidth > 0 && frameHeight > 0)) {
      return;
    }

    renderCropPreview(
      canvas,
      source,
      { height: outputHeight, width: outputWidth },
      { centerX: cropCenterX, centerY: cropCenterY, zoom: cropZoom },
      { height: frameHeight, width: frameWidth }
    );
  }, [cropCenterX, cropCenterY, cropZoom, frameHeight, frameWidth, outputHeight, outputWidth, source]);

  useEffect(() => {
    wheelRef.current = zoomWithWheel;
  });

  // React listens for wheel passively, so the zoom gesture needs its own non-passive listener.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      wheelRef.current(event);
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  function updateCrop(nextCrop: ImageCrop) {
    const next = constrainImageCrop(nextCrop, source, output);
    cropRef.current = next;
    onDraftChange(next);
    setCrop(next);
  }

  function updateCropBeforeRender(nextCrop: ImageCrop) {
    const next = constrainImageCrop(nextCrop, source, output);
    cropRef.current = next;
    onDraftChange(next);
    scheduleCropRender();
  }

  /** Pointer and wheel gestures outrun the frame rate, so they settle once per frame. */
  function scheduleCropRender() {
    if (animationFrameRef.current !== undefined) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = undefined;
      setCrop(cropRef.current);
    });
  }

  function zoomWithWheel(event: WheelEvent) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const cropFrame = getStageCropFrame({ height: bounds.height, width: bounds.width }, output);
    if (cropFrame.width <= 0 || cropFrame.height <= 0) {
      return;
    }

    const anchor = {
      x: clamp01((event.clientX - bounds.left - cropFrame.x) / cropFrame.width),
      y: clamp01((event.clientY - bounds.top - cropFrame.y) / cropFrame.height),
    };
    updateCropBeforeRender(
      zoomImageCrop(
        cropRef.current,
        cropRef.current.zoom * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE),
        anchor,
        source,
        output
      )
    );
  }

  function startDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (!(event.isPrimary && event.button === 0)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function drag(event: PointerEvent<HTMLCanvasElement>) {
    const previous = dragRef.current;
    if (!(previous && previous.pointerId === event.pointerId)) {
      return;
    }

    const cropFrame = getStageCropFrame(frame, output);
    if (cropFrame.width <= 0 || cropFrame.height <= 0) {
      return;
    }

    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    dragRef.current = { ...previous, x: event.clientX, y: event.clientY };
    updateCropBeforeRender(
      moveImageCrop(
        cropRef.current,
        {
          x: -deltaX / cropFrame.width,
          y: -deltaY / cropFrame.height,
        },
        source,
        output
      )
    );
  }

  function stopDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? FAST_KEYBOARD_STEP : KEYBOARD_STEP;
    let movement: { x: number; y: number } | undefined;

    if (event.key === "ArrowLeft") {
      movement = { x: -step, y: 0 };
    } else if (event.key === "ArrowRight") {
      movement = { x: step, y: 0 };
    } else if (event.key === "ArrowUp") {
      movement = { x: 0, y: -step };
    } else if (event.key === "ArrowDown") {
      movement = { x: 0, y: step };
    }

    if (movement) {
      event.preventDefault();
      updateCrop(moveImageCrop(cropRef.current, movement, source, output));
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateCrop({ ...cropRef.current, zoom: cropRef.current.zoom + KEYBOARD_ZOOM_STEP });
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      updateCrop({ ...cropRef.current, zoom: cropRef.current.zoom - KEYBOARD_ZOOM_STEP });
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={`${IMPORT_STAGE_CLASS} bg-canvas`}>
        <canvas
          aria-describedby={instructionsId}
          aria-label="Image crop area"
          className="block size-full cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 active:cursor-grabbing"
          onKeyDown={moveWithKeyboard}
          onPointerCancel={stopDrag}
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          ref={canvasRef}
          tabIndex={0}
        />
      </div>

      <div className={`${IMPORT_STAGE_FOOTER_CLASS} flex flex-wrap items-center justify-between gap-x-10 gap-y-3`}>
        <p className="min-w-0 text-muted-foreground text-xs" id={instructionsId}>
          Drag to move, scroll to zoom, arrow keys to nudge.
        </p>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-sm">
          <label className="shrink-0 text-muted-foreground" htmlFor={zoomId}>
            Crop zoom
          </label>
          <input
            className="h-6 min-w-0 max-w-72 flex-1 accent-primary"
            id={zoomId}
            max={MAX_IMAGE_CROP_ZOOM}
            min={MIN_IMAGE_CROP_ZOOM}
            onChange={(event) => updateCrop({ ...cropRef.current, zoom: event.target.valueAsNumber })}
            step="0.01"
            type="range"
            value={cropZoom}
          />
          <strong className="w-11 shrink-0 text-right tabular-nums">{Math.round(cropZoom * 100)}%</strong>
          <Button
            className="-mr-3 shrink-0 px-2 text-xs"
            onClick={() => updateCrop(DEFAULT_IMAGE_CROP)}
            variant="ghost"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderCropPreview(
  canvas: HTMLCanvasElement,
  source: ImageImportSource,
  output: CropSize,
  crop: ImageCrop,
  frame: CropSize
) {
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(frame.width * dpr);
  const pixelHeight = Math.round(frame.height * dpr);
  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }
  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }

  const context = getCanvasContext(canvas, { alpha: false });
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  const canvasColor = readThemeColor(canvas, "--color-canvas");
  context.fillStyle = canvasColor;
  context.fillRect(0, 0, frame.width, frame.height);

  const cropFrame = getStageCropFrame(frame, output);
  const cropRect = getImageCropRect(crop, source, output);
  const scale = cropFrame.width / cropRect.width;
  context.drawImage(
    source.bitmap,
    cropFrame.x - cropRect.x * scale,
    cropFrame.y - cropRect.y * scale,
    source.width * scale,
    source.height * scale
  );

  drawCropMask(context, frame, cropFrame, canvasColor);
  drawCellLattice(context, cropFrame, output, readThemeColor(canvas, "--color-foreground"));
  drawCropFrame(
    context,
    cropFrame,
    readThemeColor(canvas, "--color-foreground"),
    readThemeColor(canvas, "--color-canvas-edge")
  );
}

function getStageCropFrame(frame: CropSize, output: CropSize): CropRect {
  const available = {
    height: Math.max(1, frame.height - FRAME_PADDING * 2),
    width: Math.max(1, frame.width - FRAME_PADDING * 2),
  };
  const size = fitCropFrame(output, available);
  return {
    ...size,
    x: (frame.width - size.width) / 2,
    y: (frame.height - size.height) / 2,
  };
}

/** Sinks everything outside the selection into the stage, so only the kept pixels carry colour. */
function drawCropMask(context: CanvasRenderingContext2D, frame: CropSize, cropFrame: CropRect, canvasColor: string) {
  context.save();
  context.fillStyle = canvasColor;
  context.globalAlpha = 0.88;
  context.fillRect(0, 0, frame.width, cropFrame.y);
  context.fillRect(0, cropFrame.y + cropFrame.height, frame.width, frame.height - cropFrame.y - cropFrame.height);
  context.fillRect(0, cropFrame.y, cropFrame.x, cropFrame.height);
  context.fillRect(
    cropFrame.x + cropFrame.width,
    cropFrame.y,
    frame.width - cropFrame.x - cropFrame.width,
    cropFrame.height
  );
  context.restore();
}

/**
 * The selection is divided into the cells the grid will sample, which ties cropping to grid size.
 * Fine grids fall below the legible spacing and get a bare frame instead of a wash.
 */
function drawCellLattice(
  context: CanvasRenderingContext2D,
  frame: CropRect,
  output: CropSize,
  foregroundColor: string
) {
  const spacingX = frame.width / output.width;
  const spacingY = frame.height / output.height;
  if (spacingX < MIN_LATTICE_SPACING || spacingY < MIN_LATTICE_SPACING) {
    return;
  }

  context.save();
  context.beginPath();
  for (let column = 1; column < output.width; column += 1) {
    const x = Math.round(frame.x + column * spacingX) + 0.5;
    context.moveTo(x, frame.y);
    context.lineTo(x, frame.y + frame.height);
  }
  for (let row = 1; row < output.height; row += 1) {
    const y = Math.round(frame.y + row * spacingY) + 0.5;
    context.moveTo(frame.x, y);
    context.lineTo(frame.x + frame.width, y);
  }
  context.globalAlpha = 0.13;
  context.lineWidth = 1;
  context.strokeStyle = foregroundColor;
  context.stroke();
  context.restore();
}

/**
 * A hairline edge plus registration marks that continue the edges into the masked margin. The marks
 * stay off the artwork, so nothing tinted sits on the image itself.
 */
function drawCropFrame(context: CanvasRenderingContext2D, frame: CropRect, foregroundColor: string, markColor: string) {
  const right = frame.x + frame.width;
  const bottom = frame.y + frame.height;

  context.save();
  context.lineWidth = 1;
  context.strokeStyle = foregroundColor;
  context.globalAlpha = 0.3;
  context.strokeRect(frame.x + 0.5, frame.y + 0.5, Math.max(0, frame.width - 1), Math.max(0, frame.height - 1));

  const gap = 5;
  const length = Math.min(12, Math.max(6, Math.min(frame.width, frame.height) * 0.06));
  context.strokeStyle = markColor;
  context.globalAlpha = 1;
  context.beginPath();
  for (const x of [frame.x, right]) {
    const alignedX = Math.round(x) + 0.5;
    context.moveTo(alignedX, frame.y - gap);
    context.lineTo(alignedX, frame.y - gap - length);
    context.moveTo(alignedX, bottom + gap);
    context.lineTo(alignedX, bottom + gap + length);
  }
  for (const y of [frame.y, bottom]) {
    const alignedY = Math.round(y) + 0.5;
    context.moveTo(frame.x - gap, alignedY);
    context.lineTo(frame.x - gap - length, alignedY);
    context.moveTo(right + gap, alignedY);
    context.lineTo(right + gap + length, alignedY);
  }
  context.stroke();
  context.restore();
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
