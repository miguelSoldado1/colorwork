import { Link } from "@tanstack/react-router";
import { ImportArtworkRow } from "@/components/levels/import-artwork-row";
import { LevelPreview } from "@/components/levels/level-preview";
import type { LevelDescription } from "@/levels/describe-level";

interface IndexMenuProps {
  levels: readonly LevelDescription[];
}

const COLUMNS = "grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-4 sm:gap-6";

export function IndexMenu({ levels }: IndexMenuProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border">
      <div
        aria-hidden
        className={`${COLUMNS} border-border border-b bg-card/40 px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-[0.2em] sm:px-6`}
      >
        <span />
        <span>Artwork</span>
        <span className="text-right">Pixels</span>
      </div>

      <ul className="divide-y divide-border">
        {levels.map((level) => (
          <IndexRow key={level.puzzle.id} level={level} />
        ))}
      </ul>

      <ImportArtworkRow />
    </div>
  );
}

function IndexRow({ level }: { level: LevelDescription }) {
  const { completedColors, finished, paintedCount, puzzle, totalPixels } = level;

  return (
    <li>
      <Link
        aria-label={`${puzzle.name}, ${puzzle.width} by ${puzzle.height} cells, ${completedColors} of ${puzzle.palette.length} colors finished, ${paintedCount} of ${totalPixels} pixels painted`}
        className={`${COLUMNS} px-4 py-3.5 transition-colors duration-150 ease-out hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 sm:px-6`}
        search={(previous) => ({ ...previous, artwork: puzzle.id })}
        to="/"
      >
        <LevelPreview className="size-12 rounded-[3px] bg-canvas" colored={finished} puzzle={puzzle} />

        <span className="min-w-0 truncate text-sm">{puzzle.name}</span>

        <span
          className="text-right text-sm tabular-nums data-[finished=true]:text-primary data-[started=false]:text-muted-foreground"
          data-finished={finished}
          data-started={level.started}
        >
          {paintedCount.toLocaleString()} | {totalPixels.toLocaleString()}
        </span>
      </Link>
    </li>
  );
}
