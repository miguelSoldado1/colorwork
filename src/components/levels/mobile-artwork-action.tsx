import { Link } from "@tanstack/react-router";
import { paintActionLabel } from "@/components/levels/level-specs";
import type { LevelDescription } from "@/levels/describe-level";

interface MobileArtworkActionProps {
  level: LevelDescription;
}

export function MobileArtworkAction({ level }: MobileArtworkActionProps) {
  return (
    <section
      aria-label="Selected artwork action"
      className="fixed inset-x-0 bottom-0 z-20 border-border border-t bg-background/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
    >
      <div className="mx-auto flex min-w-0 max-w-384 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Selected artwork</p>
          <p className="truncate text-sm">{level.puzzle.name}</p>
        </div>

        <Link
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-primary bg-primary px-4 text-primary-foreground transition-[filter,transform,color,border-color] duration-200 ease-out hover:brightness-108 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-px"
          params={{ levelId: level.puzzle.id }}
          to="/play/$levelId"
        >
          {paintActionLabel(level)}
        </Link>
      </div>
    </section>
  );
}
