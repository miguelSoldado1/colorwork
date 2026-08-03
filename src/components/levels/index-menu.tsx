import { ImportArtworkRow } from "@/components/levels/import-artwork-row";
import { LevelPreview } from "@/components/levels/level-preview";
import type { LevelDescription } from "@/levels/describe-level";

interface IndexMenuProps {
  levels: readonly LevelDescription[];
  onSelect: (id: string) => void;
  selectedId: string | undefined;
}

const COLUMNS = "grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-4 sm:gap-6";

export function IndexMenu({ levels, onSelect, selectedId }: IndexMenuProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border">
      <div
        aria-hidden
        className={`${COLUMNS} border-border border-b bg-card/40 px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-[0.2em] sm:px-6`}
      >
        <span>Artwork</span>
        <span />
        <span className="text-right">Pixels</span>
      </div>

      <ul className="divide-y divide-border">
        {levels.map((level) => (
          <IndexRow key={level.puzzle.id} level={level} onSelect={onSelect} selected={level.puzzle.id === selectedId} />
        ))}
      </ul>

      <ImportArtworkRow />
    </div>
  );
}

function IndexRow({
  level,
  onSelect,
  selected,
}: {
  level: LevelDescription;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const { completedColors, finished, paintedCount, puzzle, totalPixels } = level;

  return (
    <li>
      <button
        aria-label={`${puzzle.name}${puzzle.artist ? `, artwork by ${puzzle.artist.name}` : ""}, ${puzzle.width} by ${puzzle.height} cells, ${completedColors} of ${puzzle.palette.length} colors finished, ${paintedCount} of ${totalPixels} pixels painted`}
        aria-pressed={selected}
        className={`${COLUMNS} w-full cursor-pointer px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 data-[selected=true]:bg-primary/8 sm:px-6`}
        data-selected={selected}
        onClick={() => onSelect(puzzle.id)}
        type="button"
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
      </button>
    </li>
  );
}
