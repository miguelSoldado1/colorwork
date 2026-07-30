import { Check } from "pixelarticons/react/Check";
import { Close } from "pixelarticons/react/Close";
import { Link } from "pixelarticons/react/Link";
import { Unlink } from "pixelarticons/react/Unlink";
import { useEffect, useRef, useState } from "react";
import {
  createPuzzleFromImage,
  getImportName,
  getRecommendedGridSize,
  type ImageImportSource,
} from "@/coloring/import-image";
import type { PuzzleDefinition } from "@/coloring/types";

const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 256;
const MIN_PALETTE_SIZE = 1;
const MAX_PALETTE_SIZE = 32;

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
  const [paletteSize, setPaletteSize] = useState(paletteMaximum);
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
        setProcessingError(error instanceof Error ? error.message : "The image could not be processed.");
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
    setWidth(safeWidth);
    if (dimensionsLinked) {
      setHeight(clampGridSize(Math.round((safeWidth / source.width) * source.height)));
    }
  }

  function updateHeight(nextHeight: number) {
    const safeHeight = clampGridSize(nextHeight);
    setHeight(safeHeight);
    if (dimensionsLinked) {
      setWidth(clampGridSize(Math.round((safeHeight / source.height) * source.width)));
    }
  }

  function confirmPuzzle() {
    if (puzzle) {
      onConfirm({
        ...puzzle,
        name: name.trim() || "Custom puzzle",
      });
    }
  }

  return (
    <dialog
      aria-labelledby="import-title"
      className="m-auto max-h-[calc(100svh-2rem)] w-[min(46rem,calc(100%-2rem))] overflow-y-auto rounded-3xl border border-ink/15 bg-panel p-0 text-ink shadow-[0_28px_100px_rgba(0,0,0,0.72)] backdrop:bg-paper/80 backdrop:backdrop-blur-sm"
      onCancel={onCancel}
      ref={dialogRef}
    >
      <div className="border-ink/10 border-b px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-faint text-xs uppercase tracking-[0.16em]">New puzzle</p>
            <h2 className="mt-1 text-2xl" id="import-title">
              Tune your pixel grid
            </h2>
          </div>
          <button
            aria-label="Cancel image import"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-faint transition hover:bg-ink/8 hover:text-ink focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2"
            onClick={onCancel}
            type="button"
          >
            <Close aria-hidden height={22} width={22} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_17rem] sm:p-6">
        <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-[linear-gradient(45deg,rgba(255,255,255,.025)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.025)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.025)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.025)_75%)] bg-board bg-position-[0_0,0_8px,8px_-8px,-8px_0] bg-size-[16px_16px] p-4">
          {puzzle ? (
            <canvas
              aria-label="Processed pixel art preview"
              className="h-auto max-h-[50svh] w-full bg-board [image-rendering:pixelated]"
              ref={previewRef}
              role="img"
            />
          ) : (
            <p className="text-faint text-sm">{processingError || "Building preview…"}</p>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <label className="grid gap-2 text-sm">
            <span className="text-faint">Puzzle name</span>
            <input
              className="h-11 rounded-xl border border-ink/10 bg-paper px-3 text-ink outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/25"
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-faint text-sm">Grid size</legend>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <NumberField label="Width" max={MAX_GRID_SIZE} min={MIN_GRID_SIZE} onChange={updateWidth} value={width} />
              <button
                aria-label={dimensionsLinked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                aria-pressed={dimensionsLinked}
                className="mb-0.5 grid size-10 place-items-center rounded-xl text-faint transition hover:bg-ink/8 hover:text-ink focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2"
                onClick={() => setDimensionsLinked((linked) => !linked)}
                type="button"
              >
                {dimensionsLinked ? (
                  <Link aria-hidden height={19} width={19} />
                ) : (
                  <Unlink aria-hidden height={19} width={19} />
                )}
              </button>
              <NumberField
                label="Height"
                max={MAX_GRID_SIZE}
                min={MIN_GRID_SIZE}
                onChange={updateHeight}
                value={height}
              />
            </div>
            <p className="mt-2 text-faint text-xs">
              Source: {source.width} × {source.height}px
            </p>
          </fieldset>

          <label className="grid gap-2 text-sm">
            <span className="flex items-center justify-between gap-3 text-faint">
              <span>Palette colors</span>
              <strong className="text-ink">{paletteSize}</strong>
            </span>
            <input
              aria-label="Palette colors"
              className="h-6 w-full accent-violet"
              disabled={paletteMaximum === MIN_PALETTE_SIZE}
              max={paletteMaximum}
              min={MIN_PALETTE_SIZE}
              onChange={(event) => setPaletteSize(event.target.valueAsNumber)}
              type="range"
              value={paletteSize}
            />
            <span className="text-faint text-xs">
              Detected {source.detectedColorCount.toLocaleString()}{" "}
              {source.detectedColorCount === 1 ? "color" : "colors"} at the initial grid size.
            </span>
          </label>

          <div>
            <p className="mb-2 text-faint text-sm">Generated palette {puzzle ? `(${puzzle.palette.length})` : ""}</p>
            <div className="flex min-h-8 flex-wrap gap-1.5">
              {puzzle?.palette.map((color) => (
                <span
                  className="size-7 rounded-lg border border-ink/15 shadow-inner"
                  key={color}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <p className="mt-auto text-faint text-xs">
            {(width * height).toLocaleString()} cells · {source.fileName}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-ink/10 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          className="h-11 rounded-xl px-4 text-faint transition hover:bg-ink/8 hover:text-ink focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet px-5 text-ink shadow-[0_3px_0_#5148a8] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2 active:translate-y-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-50"
          disabled={!puzzle}
          onClick={confirmPuzzle}
          type="button"
        >
          <Check aria-hidden height={19} width={19} />
          Use this puzzle
        </button>
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
    <label className="grid gap-1.5 text-faint text-xs">
      {label}
      <input
        className="h-10 min-w-0 rounded-xl border border-ink/10 bg-paper px-2.5 text-center text-ink outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/25"
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
  return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(value)));
}
