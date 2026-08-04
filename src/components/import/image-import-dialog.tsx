import { useEffect, useRef, useState } from "react";
import { downloadPuzzleModule } from "@/coloring/export-puzzle";
import {
  createPuzzleFromImage,
  getImportName,
  getMaximumImportGridSide,
  getRecommendedGridSize,
  type ImageImportSource,
  MAX_IMPORT_GRID_SIDE,
} from "@/coloring/import-image";
import Check from "@/components/icons/check.svg?react";
import Close from "@/components/icons/close.svg?react";
import Link from "@/components/icons/link.svg?react";
import Unlink from "@/components/icons/unlink.svg?react";
import { Button } from "@/components/ui/button";
import { isDebugMode } from "@/debug/debug-mode";
import type { PuzzleDefinition } from "@/coloring/types";

const MIN_GRID_SIZE = 1;
const MIN_PALETTE_SIZE = 1;
const MAX_PALETTE_SIZE = 32;
// The slider still reaches 32; a board only opens with about as many colours as a catalogued one.
const DEFAULT_PALETTE_SIZE = 16;

interface ImageImportDialogProps {
  onCancel: () => void;
  onConfirm: (puzzle: PuzzleDefinition) => void;
  source: ImageImportSource;
}

export function ImageImportDialog({ onCancel, onConfirm, source }: ImageImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const recommendedSize = getRecommendedGridSize(source.width, source.height);
  const paletteMaximum = Math.min(MAX_PALETTE_SIZE, Math.max(MIN_PALETTE_SIZE, source.detectedColorCount));
  const initialName = getImportName(source.fileName);
  const [name, setName] = useState(initialName);
  const [width, setWidth] = useState(recommendedSize.width);
  const [height, setHeight] = useState(recommendedSize.height);
  const [paletteSize, setPaletteSize] = useState(Math.min(paletteMaximum, DEFAULT_PALETTE_SIZE));
  const [dimensionsLinked, setDimensionsLinked] = useState(true);
  const [puzzle, setPuzzle] = useState<PuzzleDefinition | null>(null);
  const [processingError, setProcessingError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();
  }, []);

  useEffect(() => {
    setPuzzle(null);
    setProcessingError("");

    const timeout = window.setTimeout(() => {
      try {
        setPuzzle(createPuzzleFromImage(source, { height, name: initialName, paletteSize, width }));
      } catch (error) {
        return setProcessingError(error instanceof Error ? error.message : "The image could not be processed.");
      }
    }, 80);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [height, initialName, paletteSize, source, width]);

  useEffect(() => {
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
  }, [puzzle]);

  function updateWidth(nextWidth: number) {
    const safeWidth = clampGridSize(nextWidth);
    if (dimensionsLinked) {
      const linkedSize = getRecommendedGridSize(
        safeWidth,
        Math.max(MIN_GRID_SIZE, Math.round((safeWidth / source.width) * source.height))
      );
      setWidth(linkedSize.width);
      setHeight(linkedSize.height);
      return;
    }

    setWidth(safeWidth);
    setHeight(Math.min(height, getMaximumImportGridSide(safeWidth)));
  }

  function updateHeight(nextHeight: number) {
    const safeHeight = clampGridSize(nextHeight);
    if (dimensionsLinked) {
      const linkedSize = getRecommendedGridSize(
        Math.max(MIN_GRID_SIZE, Math.round((safeHeight / source.height) * source.width)),
        safeHeight
      );
      setWidth(linkedSize.width);
      setHeight(linkedSize.height);
      return;
    }

    setWidth(Math.min(width, getMaximumImportGridSide(safeHeight)));
    setHeight(safeHeight);
  }

  function confirmPuzzle() {
    if (puzzle) {
      onConfirm({
        ...puzzle,
        name: name.trim() || "Custom puzzle",
      });
    }
  }

  function downloadCurrentPuzzle() {
    if (puzzle) {
      downloadPuzzleModule({
        ...puzzle,
        name: name.trim() || "Custom puzzle",
      });
    }
  }

  return (
    <dialog
      aria-labelledby="import-title"
      className="dialog-surface m-auto max-h-[calc(100svh-2rem)] w-[min(46rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-border bg-card p-0 text-card-foreground shadow-[0_32px_90px_-24px_rgba(0,0,0,0.85)] backdrop:bg-background/75 backdrop:backdrop-blur-sm"
      onCancel={onCancel}
      ref={dialogRef}
    >
      <div className="border-border border-b px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">New puzzle</p>
            <h2 className="mt-1 text-2xl" id="import-title">
              Tune your pixel grid
            </h2>
          </div>
          <Button aria-label="Cancel image import" className="shrink-0" onClick={onCancel} size="icon" variant="ghost">
            <Close height={22} width={22} />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_17rem] sm:p-6">
        <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-lg border border-border bg-[linear-gradient(45deg,rgba(255,255,255,.025)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.025)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.025)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.025)_75%)] bg-canvas bg-position-[0_0,0_8px,8px_-8px,-8px_0] bg-size-[16px_16px] p-4">
          {puzzle ? (
            <canvas
              aria-label="Processed pixel art preview"
              className="h-auto max-h-[50svh] w-full bg-canvas [image-rendering:pixelated]"
              ref={previewRef}
              role="img"
            />
          ) : (
            <p className="text-muted-foreground text-sm">{processingError || "Building preview…"}</p>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Puzzle name</span>
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-muted-foreground text-sm">Grid size</legend>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <NumberField
                label="Width"
                max={MAX_IMPORT_GRID_SIDE}
                min={MIN_GRID_SIZE}
                onChange={updateWidth}
                value={width}
              />
              <Button
                aria-label={dimensionsLinked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                aria-pressed={dimensionsLinked}
                className="mb-0.5"
                onClick={() => setDimensionsLinked((linked) => !linked)}
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
                value={height}
              />
            </div>
            <p className="mt-2 text-muted-foreground text-xs">
              Source: {source.width} × {source.height}px
            </p>
          </fieldset>

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
              onChange={(event) => setPaletteSize(event.target.valueAsNumber)}
              type="range"
              value={paletteSize}
            />
            <span className="text-muted-foreground text-xs">
              Detected {source.detectedColorCount.toLocaleString()}{" "}
              {source.detectedColorCount === 1 ? "color" : "colors"} at the initial grid size.
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
      </div>

      <div className="flex flex-col-reverse gap-3 border-border border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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
          Use this puzzle
        </Button>
      </div>
    </dialog>
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
  return (
    <label className="grid gap-1.5 text-muted-foreground text-xs">
      {label}
      <input
        className="h-10 min-w-0 rounded-md border border-input bg-background px-2.5 text-center text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        type="number"
        value={value}
      />
    </label>
  );
}

function clampGridSize(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_GRID_SIZE;
  }
  return Math.min(MAX_IMPORT_GRID_SIDE, Math.max(MIN_GRID_SIZE, Math.round(value)));
}
