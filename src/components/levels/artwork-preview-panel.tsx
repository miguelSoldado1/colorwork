import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Eye from "@/components/icons/eye.svg?react";
import EyeOff from "@/components/icons/eye-off.svg?react";
import Reload from "@/components/icons/reload.svg?react";
import { LevelPreview } from "@/components/levels/level-preview";
import { describeLevelState, LevelSpecs, paintActionLabel } from "@/components/levels/level-specs";
import { Button } from "@/components/ui/button";
import type { LevelDescription } from "@/levels/describe-level";

interface ArtworkPreviewPanelProps {
  level: LevelDescription;
}

const ACTION_LINK =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-4 transition-[filter,transform,color,border-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-px";

export function ArtworkPreviewPanel({ level }: ArtworkPreviewPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const scrolledIdRef = useRef(level.puzzle.id);
  // Keyed by id rather than by a flag, so choosing another artwork drops the previous reveal.
  const [revealedId, setRevealedId] = useState("");
  const revealed = revealedId === level.puzzle.id;

  useEffect(() => {
    if (scrolledIdRef.current === level.puzzle.id) {
      return;
    }

    scrolledIdRef.current = level.puzzle.id;
    panelRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [level.puzzle.id]);

  return (
    <aside
      aria-label="Artwork preview"
      className="rounded-xl border border-border bg-card/60 lg:sticky lg:top-8"
      ref={panelRef}
    >
      <div className="border-border border-b px-4 py-3" role="status">
        <h2 className="truncate leading-tight">{level.puzzle.name}</h2>
        <p className="mt-1 text-muted-foreground text-xs">{describeLevelState(level)}</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-center rounded-lg border border-border bg-canvas p-3">
          <LevelPreview
            className="size-52 sm:size-56"
            colored={level.finished || revealed}
            numbers
            puzzle={level.puzzle}
          />
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

          {level.finished ? null : (
            <Button
              aria-pressed={revealed}
              onClick={() => setRevealedId(revealed ? "" : level.puzzle.id)}
              variant="ghost"
            >
              {revealed ? <EyeOff aria-hidden height={19} width={19} /> : <Eye aria-hidden height={19} width={19} />}
              {revealed ? "Hide full artwork" : "See full artwork"}
            </Button>
          )}

          {/* Inert on purpose: what starting over should do to stored progress is still undecided. */}
          <Button variant="ghost">
            <Reload aria-hidden height={19} width={19} />
            Start over
          </Button>
        </div>
      </div>
    </aside>
  );
}
