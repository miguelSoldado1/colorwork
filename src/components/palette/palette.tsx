import { PaletteColor } from "./palette-color";
import type { ProgressSummary, PuzzleDefinition } from "@/coloring/types";

interface PaletteProps {
  complete: boolean;
  onSelect: (colorIndex: number) => void;
  puzzle: PuzzleDefinition;
  selectedColor: number;
  summary: ProgressSummary;
}

export function Palette({ complete, onSelect, puzzle, selectedColor, summary }: PaletteProps) {
  const painted = summary.paintedByColor[selectedColor] ?? 0;
  const total = summary.totalByColor[selectedColor] ?? 0;

  return (
    // Sized to the swatches so the readout and the row stay one centered block.
    <div className="mx-auto w-fit max-w-full">
      <div
        aria-label={`${painted} pixels painted, ${total} pixels total for color ${selectedColor + 1}`}
        className="mb-1.5 flex min-w-0 items-baseline gap-2 px-2 text-muted-foreground text-xs tabular-nums"
        role="status"
      >
        <span className="shrink-0 text-foreground">Color {selectedColor + 1}</span>
        <span aria-hidden className="text-muted-foreground/35">
          ·
        </span>
        <span className="truncate">
          {painted.toLocaleString()} of {total.toLocaleString()} filled
        </span>
      </div>
      {/* Clears the selected swatch's ring, its focus outline, and the hover lift; the scroll container clips all three. */}
      <ul aria-label="Puzzle colors" className="scrollbar-none flex gap-2.5 overflow-x-auto p-2.5">
        {puzzle.palette.map((color, colorIndex) => {
          const colorPainted = summary.paintedByColor[colorIndex] ?? 0;
          const colorTotal = summary.totalByColor[colorIndex] ?? 0;

          return (
            <PaletteColor
              color={color}
              colorIndex={colorIndex}
              key={color}
              onSelect={onSelect}
              painted={colorPainted}
              puzzleComplete={complete}
              selected={colorIndex === selectedColor}
              total={colorTotal}
            />
          );
        })}
      </ul>
    </div>
  );
}
