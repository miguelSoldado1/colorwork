import { LevelPreview } from "@/components/levels/level-preview";
import type { LevelDescription } from "@/levels/describe-level";

// The card spaces its own children, so sections never double up borders where one is absent.
export const INDEX_CARD = "min-w-0 divide-y divide-border overflow-hidden rounded-xl border border-border";
const INDEX_COLUMNS = "grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-4 sm:gap-6";

interface IndexColumnHeaderProps {
  counted: boolean;
  label: string;
}

export function IndexColumnHeader({ counted, label }: IndexColumnHeaderProps) {
  return (
    <div
      aria-hidden
      className={`${INDEX_COLUMNS} bg-card/40 px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-[0.2em] sm:px-6`}
    >
      <span>{label}</span>
      <span />
      <span className="text-right">{counted ? "Pixels" : ""}</span>
    </div>
  );
}

interface IndexRowProps {
  level: LevelDescription;
  onSelect: (id: string) => void;
  selected: boolean;
}

export function IndexRow({ level, onSelect, selected }: IndexRowProps) {
  const { completedColors, finished, paintedCount, puzzle, totalPixels } = level;

  return (
    <li>
      <button
        aria-label={`${puzzle.name}${puzzle.artist ? `, artwork by ${puzzle.artist.name}` : ""}, ${puzzle.width} by ${puzzle.height} cells, ${completedColors} of ${puzzle.palette.length} colors finished, ${paintedCount} of ${totalPixels} pixels painted`}
        aria-pressed={selected}
        className={`${INDEX_COLUMNS} w-full cursor-pointer px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 data-[selected=true]:bg-primary/8 sm:px-6`}
        data-selected={selected}
        onClick={() => onSelect(puzzle.id)}
        type="button"
      >
        <LevelPreview
          className="size-12 overflow-hidden rounded-[3px] bg-canvas"
          colored={finished}
          numbers
          puzzle={puzzle}
        />

        <span className="min-w-0 truncate text-sm">{puzzle.name}</span>

        <span
          className="text-right text-sm tabular-nums data-[finished=true]:text-primary data-[started=false]:text-muted-foreground"
          data-finished={finished}
          data-started={level.started}
        >
          {paintedCount.toLocaleString()} | {totalPixels.toLocaleString()}
        </span>
      </button>
    </li>
  );
}
