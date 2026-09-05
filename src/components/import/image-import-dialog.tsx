import { useEffect, useRef, useState } from "react";
import Check from "@/assets/icons/check.svg?react";
import Close from "@/assets/icons/close.svg?react";
import Link from "@/assets/icons/link.svg?react";
import Target from "@/assets/icons/target.svg?react";
import Unlink from "@/assets/icons/unlink.svg?react";
import { downloadPuzzleModule } from "@/coloring/export-puzzle";
import { constrainImageCrop, DEFAULT_IMAGE_CROP, type ImageCrop } from "@/coloring/image-crop";
import {
  createImageImportPreview,
  createImportedPuzzleId,
  getCropGridSize,
  getImportName,
  getMaximumImportGridSide,
  getRecommendedGridSize,
  type ImageImportSource,
  MAX_IMPORT_GRID_SIDE,
} from "@/coloring/import-image";
import { IMPORT_STAGE_CLASS, IMPORT_STAGE_FOOTER_CLASS, ImageCropEditor } from "@/components/import/image-crop-editor";
import { Button } from "@/components/ui/button";
import { isDebugMode } from "@/debug/debug-mode";
import { constrainArtworkName, MAX_ARTWORK_NAME_LENGTH } from "@/levels/artwork-name";
import type { PuzzleDefinition } from "@/coloring/types";

const MIN_GRID_SIZE = 1;
const MIN_PALETTE_SIZE = 1;
const MAX_PALETTE_SIZE = 32;
// The slider still reaches 32; a board only opens with about as many colours as a catalogued one.
const DEFAULT_PALETTE_SIZE = 16;

interface ImageImportDialogProps {
  onCancel: () => void;
  onConfirm: (puzzle: PuzzleDefinition) => void;
  saveError?: string;
  source: ImageImportSource;
}

export function ImageImportDialog({ onCancel, onConfirm, saveError, source }: ImageImportDialogProps) {
  const cropTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const recommendedSize = getRecommendedGridSize(source.width, source.height);
  const initialName = getImportName(source.fileName);
  const [name, setName] = useState(initialName);
  const [width, setWidth] = useState(recommendedSize.width);
  const [height, setHeight] = useState(recommendedSize.height);
  const [detectedColorCount, setDetectedColorCount] = useState(source.detectedColorCount);
  const [requestedPaletteSize, setRequestedPaletteSize] = useState(DEFAULT_PALETTE_SIZE);
  const [crop, setCrop] = useState<ImageCrop>();
  const [dimensionsLinked, setDimensionsLinked] = useState(true);
  const [editingCrop, setEditingCrop] = useState(false);
  const draftCropRef = useRef<ImageCrop>(DEFAULT_IMAGE_CROP);
  const [puzzle, setPuzzle] = useState<PuzzleDefinition | null>(null);
  const [processingError, setProcessingError] = useState("");
  const paletteMaximum = Math.min(MAX_PALETTE_SIZE, Math.max(MIN_PALETTE_SIZE, detectedColorCount));
  const paletteSize = Math.min(requestedPaletteSize, paletteMaximum);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    setPuzzle(null);
    setProcessingError("");

    const timeout = window.setTimeout(() => {
      try {
        const preview = createImageImportPreview(source, {
          crop,
          height,
          name: initialName,
          paletteSize: requestedPaletteSize,
          width,
        });
        setDetectedColorCount(preview.detectedColorCount);
        setPuzzle(preview.puzzle);
      } catch (error) {
        return setProcessingError(error instanceof Error ? error.message : "The image could not be processed.");
      }
    }, 80);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [crop, height, initialName, requestedPaletteSize, source, width]);

  useEffect(() => {
    if (editingCrop) {
      return;
    }

    const canvas = previewRef.current;
    if (!(canvas && puzzle)) {
      return;
    }

    canvas.width = puzzle.width;
    canvas.height = puzzle.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const image = context.createImageData(puzzle.width, puzzle.height);
    for (let pixelIndex = 0; pixelIndex < puzzle.targetPixels.length; pixelIndex += 1) {
      const color = puzzle.palette[puzzle.targetPixels[pixelIndex]];
      const dataIndex = pixelIndex * 4;
      image.data[dataIndex] = Number.parseInt(color.slice(1, 3), 16);
      image.data[dataIndex + 1] = Number.parseInt(color.slice(3, 5), 16);
      image.data[dataIndex + 2] = Number.parseInt(color.slice(5, 7), 16);
      image.data[dataIndex + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [editingCrop, puzzle]);

  function confirmPuzzle() {
    if (puzzle) {
      const finalName = constrainArtworkName(name);
      onConfirm({
        ...puzzle,
        id: createImportedPuzzleId(finalName),
        name: finalName,
      });
    }
  }

  function closeCropEditor() {
    setEditingCrop(false);
    window.requestAnimationFrame(() => cropTriggerRef.current?.focus());
  }

  function openCropEditor() {
    draftCropRef.current = constrainImageCrop(crop ?? DEFAULT_IMAGE_CROP, source, { height, width });
    setEditingCrop(true);
  }

  function applyCrop() {
    const nextCrop = draftCropRef.current;
    const previousZoom = crop?.zoom ?? DEFAULT_IMAGE_CROP.zoom;
    const nextSize = getCropGridSize({ height, width }, previousZoom, nextCrop.zoom);

    setPuzzle(null);
    setProcessingError("");
    setWidth(nextSize.width);
    setHeight(nextSize.height);
    setCrop(nextCrop);
    closeCropEditor();
  }

  function downloadCurrentPuzzle() {
    if (puzzle) {
      downloadPuzzleModule({
        ...puzzle,
        name: constrainArtworkName(name),
      });
    }
  }

  return (
    <dialog
      aria-describedby="import-description"
      aria-labelledby="import-title"
      className="dialog-surface m-auto flex h-[min(44rem,calc(100svh-2rem))] w-[min(56rem,calc(100%-2rem))] flex-col rounded-xl border border-border bg-card p-0 text-card-foreground shadow-[0_32px_90px_-24px_rgba(0,0,0,0.85)] backdrop:bg-background/75 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        if (editingCrop) {
          event.preventDefault();
          closeCropEditor();
          return;
        }
        onCancel();
      }}
      ref={dialogRef}
    >
      <div className="shrink-0 border-border border-b px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">New puzzle</p>
            <h2 className="mt-1 text-2xl" id="import-title">
              Tune your pixel grid
            </h2>
            <p className="text-muted-foreground text-xs" id="import-description">
              Colorwork processes your image in this browser. Your image and progress stay on this device. There is no
              account or cloud sync.
            </p>
          </div>
          <Button aria-label="Cancel image import" className="shrink-0" onClick={onCancel} size="icon" variant="ghost">
            <Close height={22} width={22} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto sm:overflow-hidden">
        <div className={`grid gap-6 p-5 sm:h-full sm:p-6 ${editingCrop ? "" : "sm:grid-cols-[minmax(0,1fr)_17rem]"}`}>
          {editingCrop ? (
            <ImageCropEditor
              initialCrop={crop ?? DEFAULT_IMAGE_CROP}
              onDraftChange={(nextCrop) => {
                draftCropRef.current = nextCrop;
              }}
              output={{ height, width }}
              source={source}
            />
          ) : (
            <>
              <div className="flex min-w-0 flex-col gap-3">
                <div className={`${IMPORT_STAGE_CLASS} flex items-center justify-center bg-canvas p-4`}>
                  {puzzle ? (
                    <canvas
                      aria-label="Processed pixel art preview"
                      className="size-full object-contain [image-rendering:pixelated]"
                      ref={previewRef}
                      role="img"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">{processingError || "Building preview…"}</p>
                  )}
                </div>
                <div className={`${IMPORT_STAGE_FOOTER_CLASS} -ml-3 flex items-center`}>
                  <Button onClick={openCropEditor} ref={cropTriggerRef} size="compact" variant="ghost">
                    <Target className="block shrink-0" height={17} width={17} />
                    {crop ? "Edit crop" : "Adjust crop"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-5 sm:min-h-0 sm:overflow-y-auto">
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">Puzzle name</span>
                  <input
                    className="h-11 rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
                    maxLength={MAX_ARTWORK_NAME_LENGTH}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                  />
                </label>

                <GridSizeField
                  dimensionsLinked={dimensionsLinked}
                  onChange={(size) => {
                    setWidth(size.width);
                    setHeight(size.height);
                  }}
                  onToggleLink={() => setDimensionsLinked((linked) => !linked)}
                  source={source}
                  value={{ height, width }}
                />

                <label className="grid gap-2 text-sm">
                  <span className="flex items-center justify-between gap-3 text-muted-foreground">
                    <span>Palette colors</span>
                    <strong className="text-foreground">{paletteSize}</strong>
                  </span>
                  <input
                    aria-label="Palette colors"
                    className="h-6 w-full accent-primary"
                    disabled={paletteMaximum === MIN_PALETTE_SIZE}
                    max={paletteMaximum}
                    min={MIN_PALETTE_SIZE}
                    onChange={(event) => setRequestedPaletteSize(event.target.valueAsNumber)}
                    type="range"
                    value={paletteSize}
                  />
                  <span className="text-muted-foreground text-xs">
                    Detected {detectedColorCount.toLocaleString()} {detectedColorCount === 1 ? "color" : "colors"} in
                    the current preview.
                  </span>
                </label>

                <div>
                  <p className="mb-2 text-muted-foreground text-sm">
                    Generated palette {puzzle ? `(${puzzle.palette.length})` : ""}
                  </p>
                  <div className="flex min-h-8 flex-wrap gap-1.5">
                    {puzzle?.palette.map((color) => (
                      <span
                        className="size-7 rounded-sm border border-foreground/15 shadow-inner"
                        key={color}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-auto text-muted-foreground text-xs">
                  {(width * height).toLocaleString()} cells · {source.fileName}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 border-border border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        {editingCrop ? (
          <>
            <Button onClick={closeCropEditor} variant="ghost">
              Cancel
            </Button>
            <Button onClick={applyCrop} variant="primary">
              <Check className="block shrink-0" height={19} width={19} />
              Apply crop
            </Button>
          </>
        ) : (
          <>
            {saveError ? (
              <p className="self-center text-destructive text-xs sm:mr-auto" role="alert">
                {saveError}
              </p>
            ) : null}
            {isDebugMode ? (
              <Button className="sm:mr-auto" disabled={!puzzle} onClick={downloadCurrentPuzzle} variant="outline">
                Download .ts module
              </Button>
            ) : null}
            <Button onClick={onCancel} variant="ghost">
              Cancel
            </Button>
            <Button disabled={!puzzle} onClick={confirmPuzzle} variant="primary">
              <Check className="block shrink-0" height={19} width={19} />
              Import this puzzle
            </Button>
          </>
        )}
      </div>
    </dialog>
  );
}

interface GridSizeFieldProps {
  dimensionsLinked: boolean;
  onChange: (size: { height: number; width: number }) => void;
  onToggleLink: () => void;
  source: ImageImportSource;
  value: { height: number; width: number };
}

/** Grid size with an optional ratio lock, so the linked and free cases stay in one place. */
function GridSizeField({ dimensionsLinked, onChange, onToggleLink, source, value }: GridSizeFieldProps) {
  function updateWidth(nextWidth: number) {
    const safeWidth = clampGridSize(nextWidth);
    if (dimensionsLinked) {
      return onChange(
        getRecommendedGridSize(
          safeWidth,
          Math.max(MIN_GRID_SIZE, Math.round((safeWidth / source.width) * source.height))
        )
      );
    }

    onChange({ height: Math.min(value.height, getMaximumImportGridSide(safeWidth)), width: safeWidth });
  }

  function updateHeight(nextHeight: number) {
    const safeHeight = clampGridSize(nextHeight);
    if (dimensionsLinked) {
      return onChange(
        getRecommendedGridSize(
          Math.max(MIN_GRID_SIZE, Math.round((safeHeight / source.height) * source.width)),
          safeHeight
        )
      );
    }

    onChange({ height: safeHeight, width: Math.min(value.width, getMaximumImportGridSide(safeHeight)) });
  }

  return (
    <fieldset>
      <legend className="mb-2 text-muted-foreground text-sm">Grid size</legend>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NumberField
          label="Width"
          max={MAX_IMPORT_GRID_SIDE}
          min={MIN_GRID_SIZE}
          onChange={updateWidth}
          value={value.width}
        />
        <Button
          aria-label={dimensionsLinked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-pressed={dimensionsLinked}
          className="mb-0.5"
          onClick={onToggleLink}
          size="icon"
          variant="ghost"
        >
          {dimensionsLinked ? <Link height={19} width={19} /> : <Unlink height={19} width={19} />}
        </Button>
        <NumberField
          label="Height"
          max={MAX_IMPORT_GRID_SIDE}
          min={MIN_GRID_SIZE}
          onChange={updateHeight}
          value={value.height}
        />
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        Source: {source.width} × {source.height}px
      </p>
    </fieldset>
  );
}

interface NumberFieldProps {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}

function NumberField({ label, max, min, onChange, value }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <label className="grid gap-1.5 text-muted-foreground text-xs">
      {label}
      <input
        className="h-10 min-w-0 rounded-md border border-input bg-background px-2.5 text-center text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
        max={max}
        min={min}
        onBlur={() => {
          const parsedValue = parseNumberDraft(draft);
          if (parsedValue === undefined) {
            return setDraft(String(value));
          }

          onChange(parsedValue);
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);

          const parsedValue = parseNumberDraft(nextDraft);
          if (parsedValue !== undefined) {
            onChange(parsedValue);
          }
        }}
        type="number"
        value={draft}
      />
    </label>
  );
}

function parseNumberDraft(draft: string) {
  if (draft.trim() === "") {
    return;
  }

  const parsedValue = Number(draft);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function clampGridSize(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_GRID_SIZE;
  }
  return Math.min(MAX_IMPORT_GRID_SIDE, Math.max(MIN_GRID_SIZE, Math.round(value)));
}
