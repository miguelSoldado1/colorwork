import { useEffect, useState } from "react";
import { loadPuzzleProgress, subscribeToStoredProgress } from "@/coloring/progress-storage";
import { ArtworkPreviewPanel } from "@/components/levels/artwork-preview-panel";
import { IndexMenu } from "@/components/levels/index-menu";
import { describeLevel } from "@/levels/describe-level";
import { LEVELS } from "@/levels/level-catalog";

interface LevelsMenuProps {
  previewId: string | undefined;
}

export function LevelsMenu({ previewId }: LevelsMenuProps) {
  const [levels, setLevels] = useState(readMenuLevels);
  const preview = levels.find((level) => level.puzzle.id === previewId) ?? levels[0];

  useEffect(() => subscribeToStoredProgress(() => setLevels(readMenuLevels())), []);

  return (
    <main className="min-h-svh px-3 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex min-w-0 max-w-384 flex-col gap-6 sm:gap-8">
        <header className="min-w-0 border-border border-b pb-4 sm:pb-6">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Color Byte</p>
          <h1 className="mt-1 font-semibold text-xl leading-none sm:text-2xl">Artworks</h1>
          <p className="mt-2 text-muted-foreground text-sm">{summarizeCatalog(levels)}</p>
        </header>

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
          <IndexMenu levels={levels} />
          {preview ? <ArtworkPreviewPanel level={preview} /> : null}
        </div>
      </div>
    </main>
  );
}

function readMenuLevels() {
  return LEVELS.map((puzzle) => describeLevel(puzzle, loadPuzzleProgress(puzzle)));
}

function summarizeCatalog(levels: ReturnType<typeof readMenuLevels>) {
  const finished = levels.filter((level) => level.finished).length;
  const started = levels.filter((level) => level.started && !level.finished).length;
  const parts = [`${levels.length} ${levels.length === 1 ? "artwork" : "artworks"}`];

  if (started > 0) {
    parts.push(`${started} started`);
  }
  if (finished > 0) {
    parts.push(`${finished} finished`);
  }
  return parts.join(" · ");
}
