import type { PuzzleDefinition } from "@/coloring/types";

interface ArtworkLoadingProps {
  puzzle: PuzzleDefinition;
}

export function ArtworkLoading({ puzzle }: ArtworkLoadingProps) {
  return (
    <main className="grid h-svh place-items-center p-5 text-foreground">
      <div className="text-center" role="status">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{puzzle.name}</p>
        <p className="mt-2 text-muted-foreground text-sm">Loading artwork…</p>
      </div>
    </main>
  );
}

interface ArtworkLoadErrorProps {
  onRetry: () => void;
  puzzle: PuzzleDefinition;
}

export function ArtworkLoadError({ onRetry, puzzle }: ArtworkLoadErrorProps) {
  return (
    <main className="grid h-svh place-items-center p-5 text-foreground">
      <div className="max-w-sm text-center" role="alert">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{puzzle.name}</p>
        <h1 className="mt-2 font-semibold text-lg">Couldn&apos;t load this artwork</h1>
        <p className="mt-2 text-muted-foreground text-sm">Your stored progress couldn&apos;t be opened.</p>
        <button
          className="mt-4 min-h-11 rounded-md border border-border px-4 text-sm transition-colors hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
