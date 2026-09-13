import { Link } from "@tanstack/react-router";
import { LevelPreview } from "@/components/levels/level-preview";
import type { LevelDescription } from "@/levels/describe-level";

// The card spaces its own children, so sections never double up borders where one is absent.
export const INDEX_CARD = "min-w-0 divide-y divide-border overflow-hidden rounded-xl border border-border";

// Each row is its own grid, so the right-hand tracks are floored; sized to content they drift per row.
const INDEX_COLUMNS =
  "grid grid-cols-[3rem_minmax(0,1fr)_3.25rem_minmax(4.5rem,auto)] items-center gap-4 px-4 sm:gap-6 sm:px-6";

interface IndexColumnHeaderProps {
  counted: boolean;
  label: string;
}

export function IndexColumnHeader({ counted, label }: IndexColumnHeaderProps) {
  return (
    <div
      aria-hidden
      className={`${INDEX_COLUMNS} bg-card/40 py-3 text-[10px] text-muted-foreground uppercase tracking-[0.2em]`}
    >
      <span>{label}</span>
      <span />
      <span>{counted ? "Play" : ""}</span>
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
    <li
      className={`${INDEX_COLUMNS} relative transition-colors duration-150 ease-out has-[button:hover]:bg-foreground/4 data-[selected=true]:bg-primary/8`}
      data-selected={selected}
    >
      {/* The counts sit outside the button, so it reaches the row's edges through a stretched overlay. */}
      <button
        aria-label={`${puzzle.name}${puzzle.artist ? `, artwork by ${puzzle.artist.name}` : ""}, ${puzzle.width} by ${puzzle.height} cells, ${completedColors} of ${puzzle.palette.length} colors finished, ${paintedCount} of ${totalPixels} pixels painted`}
        aria-pressed={selected}
        className="col-span-2 grid cursor-pointer grid-cols-subgrid items-center py-3.5 text-left after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
        onClick={() => onSelect(puzzle.id)}
        type="button"
      >
        <LevelPreview className="size-12 overflow-hidden rounded-[3px] bg-canvas" colored={finished} puzzle={puzzle} />

        <span className="min-w-0 truncate text-sm">{puzzle.name}</span>
      </button>

      {/* Positioned above the overlay; the hidden name keeps nine links from all reading as "Play". */}
      <Link
        className="relative flex min-h-11 cursor-pointer items-center gap-1.5 text-muted-foreground text-sm transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        params={{ levelId: puzzle.id }}
        to="/play/$levelId"
      >
        Play<span className="sr-only"> {puzzle.name}</span>
        <span aria-hidden>→</span>
      </Link>

      {/* The button's label already reports the counts. */}
      <span
        aria-hidden
        className="text-right text-sm tabular-nums data-[finished=true]:text-primary data-[started=false]:text-muted-foreground"
        data-finished={finished}
        data-started={level.started}
      >
        {paintedCount.toLocaleString()} | {totalPixels.toLocaleString()}
      </span>
    </li>
  );
}
