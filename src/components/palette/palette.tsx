import { PaletteColor } from "./palette-color";
import type { ProgressSummary, PuzzleDefinition } from "@/coloring/types";

interface PaletteProps {
  onSelect: (colorIndex: number) => void;
  puzzle: PuzzleDefinition;
  selectedColor: number;
  summary: ProgressSummary;
}

export function Palette({ onSelect, puzzle, selectedColor, summary }: PaletteProps) {
  const painted = summary.paintedByColor[selectedColor] ?? 0;
  const total = summary.totalByColor[selectedColor] ?? 0;

  return (
    <div>
      <div
        aria-label={`${painted} pixels painted, ${total} pixels total for color ${selectedColor + 1}`}
        className="mb-1.5 flex items-center justify-center gap-2 px-1 text-faint text-sm tabular-nums"
        role="status"
      >
        <span>{painted.toLocaleString()} painted</span>
        <span aria-hidden className="text-faint/40">
          |
        </span>
        <span>{total.toLocaleString()} total</span>
      </div>
      <ul aria-label="Puzzle colors" className="flex gap-2">
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
              selected={colorIndex === selectedColor}
              total={colorTotal}
            />
          );
        })}
      </ul>
    </div>
  );
}
