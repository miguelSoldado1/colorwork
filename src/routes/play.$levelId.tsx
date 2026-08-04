import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { clonePuzzleProgress, createProgressSummary, createPuzzleProgress } from "@/coloring/progress";
import { createProgressSaveController, type ProgressSaveStatus } from "@/coloring/progress-storage";
import { ArtworkCredit } from "@/components/artwork/artwork-credit";
import { ArtworkLoadError, ArtworkLoading } from "@/components/artwork/artwork-load-state";
import { BoardOverview } from "@/components/board/board-overview";
import { ColoringBoard } from "@/components/board/coloring-board";
import { DebugFillControl } from "@/components/debug/debug-fill-control";
import ArrowLeft from "@/components/icons/arrow-left.svg?react";
import { Palette } from "@/components/palette/palette";
import { ProgressDisplay } from "@/components/progress/progress-display";
import { SaveStatus } from "@/components/progress/save-status";
import { ToolPicker } from "@/components/toolbar/tool-picker";
import { TOOL_SHORTCUTS, TOOLBAR_SHORTCUTS } from "@/keyboard/game-shortcuts";
import { useKeyboardShortcuts } from "@/keyboard/use-keyboard-shortcuts";
import { findImportedPuzzle } from "@/levels/imported-levels";
import { findLevel } from "@/levels/level-catalog";
import { artworkProgressQueryOptions } from "@/query/artwork-queries";
import { loadUserPreferences, saveUserPreferences } from "@/user-preferences";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

export const Route = createFileRoute("/play/$levelId")({
  // An unknown artwork is a dead end, so send the player back to the menu instead of an error. An
  // imported one reloaded from a fresh tab is unknown too, since imports live only in memory.
  beforeLoad: ({ params }) => {
    if (!resolvePuzzle(params.levelId)) {
      throw redirect({ to: "/" });
    }
  },
  component: PlayRoute,
});

function PlayRoute() {
  const { levelId } = Route.useParams();
  const catalogPuzzle = findLevel(levelId);
  const puzzle = catalogPuzzle ?? findImportedPuzzle(levelId);

  if (!puzzle) {
    return null;
  }

  // Keyed so switching artworks rebuilds board state instead of inheriting the previous puzzle's.
  if (catalogPuzzle) {
    return <StoredColoringApp key={puzzle.id} puzzle={puzzle} />;
  }
  return (
    <ColoringApp
      initialProgress={createPuzzleProgress(puzzle)}
      key={puzzle.id}
      persistProgress={false}
      puzzle={puzzle}
    />
  );
}

function StoredColoringApp({ puzzle }: { puzzle: PuzzleDefinition }) {
  const progressQuery = useQuery(artworkProgressQueryOptions(puzzle));

  if (progressQuery.isPending || progressQuery.isFetching) {
    return <ArtworkLoading puzzle={puzzle} />;
  }
  if (progressQuery.isError) {
    return <ArtworkLoadError onRetry={retry} puzzle={puzzle} />;
  }

  return <ColoringApp initialProgress={progressQuery.data} persistProgress puzzle={puzzle} />;

  async function retry() {
    await progressQuery.refetch();
  }
}

interface ColoringAppProps {
  initialProgress: PuzzleProgress;
  persistProgress: boolean;
  puzzle: PuzzleDefinition;
}

function ColoringApp({ initialProgress, persistProgress, puzzle }: ColoringAppProps) {
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ColoringTool>("pencil");
  const [preferences, setPreferences] = useState(loadUserPreferences);
  const [highlightMissing, setHighlightMissing] = useState(false);
  // The Canvas controller mutates progress in place, so never hand it TanStack Query's cached value.
  const [progress, setProgress] = useState<PuzzleProgress>(() => clonePuzzleProgress(initialProgress));
  const [summary, setSummary] = useState(() => createProgressSummary(puzzle, progress));
  const [saveStatus, setSaveStatus] = useState<ProgressSaveStatus>("idle");
  const [progressSaver] = useState(() => createProgressSaveController({ onStatus: setSaveStatus, puzzle }));
  const [celebrateCompletion, setCelebrateCompletion] = useState(false);
  const completedRef = useRef(isPuzzleComplete(summary));

  useEffect(() => (persistProgress ? progressSaver.connect() : undefined), [persistProgress, progressSaver]);

  useEffect(() => {
    saveUserPreferences(preferences);
  }, [preferences]);

  useKeyboardShortcuts([
    ...puzzle.palette.slice(0, 9).map((_color, colorIndex) => ({
      key: String(colorIndex + 1),
      onTrigger: () => setSelectedColor(colorIndex),
    })),
    { key: TOOL_SHORTCUTS.pencil, onTrigger: () => setSelectedTool("pencil") },
    { key: TOOL_SHORTCUTS.bucket, onTrigger: () => setSelectedTool("bucket") },
    { key: TOOL_SHORTCUTS.picker, onTrigger: () => setSelectedTool("picker") },
    { key: TOOL_SHORTCUTS["zoom-in"], onTrigger: () => setSelectedTool("zoom-in") },
    { key: TOOL_SHORTCUTS["zoom-out"], onTrigger: () => setSelectedTool("zoom-out") },
    { key: TOOL_SHORTCUTS.pan, onTrigger: () => setSelectedTool("pan") },
    { key: TOOLBAR_SHORTCUTS.grid, onTrigger: toggleGrid },
    { key: TOOLBAR_SHORTCUTS.numbers, onTrigger: toggleNumbers },
    { key: TOOLBAR_SHORTCUTS.missing, onTrigger: toggleMissingHighlight },
  ]);

  const complete = isPuzzleComplete(summary);

  function toggleNumbers() {
    setPreferences((current) => ({ ...current, showNumbers: !current.showNumbers }));
  }

  function toggleGrid() {
    setPreferences((current) => ({ ...current, showGrid: !current.showGrid }));
  }

  function toggleMissingHighlight() {
    setHighlightMissing((highlighted) => !highlighted);
  }

  function updateBoardProgress(nextSummary: ProgressSummary) {
    updateProgressSummary(nextSummary);
    if (persistProgress) {
      progressSaver.schedule(progress, isPuzzleComplete(nextSummary));
    }
  }

  function updateProgressSummary(nextSummary: ProgressSummary) {
    const nextComplete = isPuzzleComplete(nextSummary);

    if (nextComplete !== completedRef.current) {
      completedRef.current = nextComplete;
      setCelebrateCompletion(nextComplete);
    }

    setSummary(nextSummary);
  }

  function replaceDebugProgress(nextProgress: PuzzleProgress) {
    setProgress(nextProgress);
    if (persistProgress) {
      progressSaver.schedule(nextProgress, nextProgress.paintedCount >= puzzle.width * puzzle.height);
    }
  }

  return (
    <main className="relative h-svh overflow-hidden p-3 text-foreground sm:p-5">
      <div className="mx-auto grid h-full max-w-384 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4">
        <header className="flex min-w-0 items-end justify-between gap-4 border-border border-b px-1 pb-3 sm:pb-4">
          <div className="min-w-0">
            <Link
              className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.24em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              to="/"
            >
              <ArrowLeft height={13} width={13} />
              All artworks
            </Link>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate font-semibold text-xl leading-none sm:text-2xl">{puzzle.name}</h1>
              {persistProgress ? <SaveStatus status={saveStatus} /> : null}
            </div>
            <ArtworkCredit artist={puzzle.artist} />
          </div>
          <div className="flex min-h-11 shrink-0 items-center gap-3 sm:gap-5">
            <div className="w-24 sm:w-56">
              <ProgressDisplay summary={summary} />
            </div>
            <DebugFillControl
              key={puzzle.id}
              onProgress={replaceDebugProgress}
              onSummary={updateProgressSummary}
              progress={progress}
              puzzle={puzzle}
            />
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
          {/* Scrolls horizontally above the board on phones; a fixed rail beside it on desktop. */}
          <aside className="scrollbar-none min-h-0 w-full min-w-0 self-start overflow-x-auto overscroll-contain rounded-xl border border-border bg-card/80 p-2 sm:max-h-full sm:w-auto sm:shrink-0 sm:self-center sm:overflow-y-auto">
            <ToolPicker
              gridVisible={preferences.showGrid}
              highlightMissing={highlightMissing}
              numbersVisible={preferences.showNumbers}
              onSelect={setSelectedTool}
              onToggleGrid={toggleGrid}
              onToggleMissing={toggleMissingHighlight}
              onToggleNumbers={toggleNumbers}
              selectedTool={selectedTool}
            />
          </aside>

          {/* Clipped, not hidden, with room for the completion burst to fly past the board edge. */}
          <section className="min-h-0 min-w-0 flex-1 overflow-clip [overflow-clip-margin:8rem]">
            <ColoringBoard
              celebrateCompletion={celebrateCompletion}
              highlightMissing={highlightMissing}
              onProgress={updateBoardProgress}
              onSelectColor={setSelectedColor}
              overviewCanvasRef={overviewCanvasRef}
              progress={progress}
              puzzle={puzzle}
              selectedColor={selectedColor}
              showGrid={preferences.showGrid}
              showNumbers={preferences.showNumbers}
              tool={selectedTool}
            />
          </section>
        </div>

        <aside className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card/80 p-2.5 sm:gap-5 sm:p-3">
          <BoardOverview
            canvasRef={overviewCanvasRef}
            celebrateCompletion={celebrateCompletion}
            puzzleHeight={puzzle.height}
            puzzleWidth={puzzle.width}
          />
          <div className="min-w-0 flex-1">
            <Palette
              complete={complete}
              onSelect={setSelectedColor}
              puzzle={puzzle}
              selectedColor={selectedColor}
              summary={summary}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

function resolvePuzzle(levelId: string) {
  return findLevel(levelId) ?? findImportedPuzzle(levelId);
}

function isPuzzleComplete(summary: ProgressSummary) {
  return summary.totalPixels > 0 && summary.paintedCount >= summary.totalPixels;
}
