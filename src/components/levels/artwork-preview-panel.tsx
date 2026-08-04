import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArtworkCredit } from "@/components/artwork/artwork-credit";
import Eye from "@/components/icons/eye.svg?react";
import { ArtworkRevealDialog } from "@/components/levels/artwork-reveal-dialog";
import { DeleteArtworkControl } from "@/components/levels/delete-artwork-control";
import { LevelPreview } from "@/components/levels/level-preview";
import { describeLevelState, LevelSpecs, paintActionLabel } from "@/components/levels/level-specs";
import { StartOverControl } from "@/components/levels/start-over-control";
import { Button } from "@/components/ui/button";
import type { LevelDescription } from "@/levels/describe-level";

interface ArtworkPreviewPanelProps {
  level: LevelDescription;
}

const ACTION_LINK =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-4 transition-[filter,transform,color,border-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-px";

export function ArtworkPreviewPanel({ level }: ArtworkPreviewPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [revealing, setRevealing] = useState(false);

  // Deleting removes the control that held focus, so hand it to the panel now showing another artwork.
  function focusPanel() {
    panelRef.current?.focus();
  }

  return (
    <aside
      aria-label="Artwork preview"
      className="rounded-xl border border-border bg-card/60 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 lg:sticky lg:top-8"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="border-border border-b px-4 py-3" role="status">
        <h2 className="truncate leading-tight">{level.puzzle.name}</h2>
        <ArtworkCredit artist={level.puzzle.artist} />
        <p className="mt-1 text-muted-foreground text-xs">{describeLevelState(level)}</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="overflow-hidden rounded-lg bg-canvas">
          <LevelPreview className="aspect-square w-full" colored={level.finished} numbers puzzle={level.puzzle} />
        </div>

        <LevelSpecs level={level} />

        <div className="flex flex-col gap-2">
          <Link
            className={`${ACTION_LINK} border-primary bg-primary text-primary-foreground hover:brightness-108`}
            params={{ levelId: level.puzzle.id }}
            to="/play/$levelId"
          >
            {paintActionLabel(level)}
          </Link>

          <Button aria-haspopup="dialog" onClick={() => setRevealing(true)} variant="ghost">
            <Eye height={19} width={19} />
            See full artwork
          </Button>

          {/* Keyed by artwork so a pending confirmation never carries over to another piece. */}
          <div className="mt-1 flex flex-col gap-2 border-border border-t pt-3">
            <StartOverControl key={`start-over-${level.puzzle.id}`} level={level} />
            {level.source === "imported" ? (
              <DeleteArtworkControl key={`delete-${level.puzzle.id}`} level={level} onDeleted={focusPanel} />
            ) : null}
          </div>
        </div>
      </div>

      {revealing ? <ArtworkRevealDialog onClose={() => setRevealing(false)} puzzle={level.puzzle} /> : null}
    </aside>
  );
}
