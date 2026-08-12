import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { trackArtworkOpened, trackPuzzleCompleted, trackPuzzleReset, trackPuzzleStarted } from "@/analytics/posthog";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import { clonePuzzleProgress, createProgressSummary, createPuzzleProgress } from "@/coloring/progress";
import {
  clearPuzzleProgress,
  createProgressSaveController,
  type ProgressSaveStatus,
} from "@/coloring/progress-storage";
import { ArtworkCredit } from "@/components/artwork/artwork-credit";
import { ArtworkLoadError, ArtworkLoading } from "@/components/artwork/artwork-load-state";
import { BoardOverview } from "@/components/board/board-overview";
import { ColoringBoard } from "@/components/board/coloring-board";
import { StartOverPopover } from "@/components/board/start-over-popover";
import { DebugFillControl } from "@/components/debug/debug-fill-control";
import { Palette } from "@/components/palette/palette";
import { ProgressDisplay } from "@/components/progress/progress-display";
import { SaveStatus } from "@/components/progress/save-status";
import { ToolPicker } from "@/components/toolbar/tool-picker";
import { TOOL_SHORTCUTS, TOOLBAR_SHORTCUTS } from "@/keyboard/game-shortcuts";
import { useKeyboardShortcuts } from "@/keyboard/use-keyboard-shortcuts";
import { findLevel } from "@/levels/level-catalog";
import { artworkDefinitionQueryOptions, artworkProgressQueryOptions } from "@/query/artwork-queries";
import { usePageMetadata } from "@/seo/use-page-metadata";
import { loadUserPreferences, saveUserPreferences } from "@/user-preferences";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

export const Route = createFileRoute("/play/$levelId")({ component: PlayRoute });

function PlayRoute() {
  const { levelId } = Route.useParams();
  const artworkQuery = useQuery(artworkDefinitionQueryOptions(levelId));

  async function retry() {
    await artworkQuery.refetch();
  }

  if (artworkQuery.isPending) {
    return <ArtworkLoading />;
  }

  if (artworkQuery.isError) {
    return <ArtworkLoadError detail="Your saved artwork couldn't be opened." onRetry={retry} />;
  }

  if (!artworkQuery.data) {
    return <Navigate replace to="/" />;
  }

  // Keyed so switching artworks rebuilds board state instead of inheriting the previous puzzle's.
  return <StoredColoringApp key={levelId} puzzle={artworkQuery.data} />;
}

function StoredColoringApp({ puzzle }: { puzzle: PuzzleDefinition }) {
  const progressQuery = useQuery(artworkProgressQueryOptions(puzzle));

  if (progressQuery.isPending || progressQuery.isFetching) {
    return <ArtworkLoading puzzle={puzzle} />;
  }
  if (progressQuery.isError) {
    return <ArtworkLoadError onRetry={retry} puzzle={puzzle} />;
  }

  return <ColoringApp initialProgress={progressQuery.data} puzzle={puzzle} />;

  async function retry() {
    await progressQuery.refetch();
  }
}

interface ColoringAppProps {
  initialProgress: PuzzleProgress;
  puzzle: PuzzleDefinition;
}

function ColoringApp({ initialProgress, puzzle }: ColoringAppProps) {
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
  const [resetVersion, setResetVersion] = useState(0);
  const resettingRef = useRef(false);
  const completedRef = useRef(isPuzzleComplete(summary));
  const startedRef = useRef(initialProgress.paintedCount > 0);

  usePageMetadata({
    description: `Color ${puzzle.name}, a ${puzzle.width} by ${puzzle.height} pixel art color-by-number puzzle, in your browser.`,
    path: `/play/${encodeURIComponent(puzzle.id)}`,
    title: `${puzzle.name} - Colorwork`,
  });

  const artworkSource = findLevel(puzzle.id) ? "catalog" : "imported";
  const totalCells = puzzle.width * puzzle.height;

  useEffect(() => {
    trackArtworkOpened(puzzle, artworkSource, initialProgress.paintedCount, totalCells);
  }, [artworkSource, initialProgress, puzzle, totalCells]);

  useEffect(() => progressSaver.connect(), [progressSaver]);

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
    if (resettingRef.current) {
      return;
    }

    updateProgressSummary(nextSummary);
    progressSaver.schedule(progress, isPuzzleComplete(nextSummary));
  }

  function updateProgressSummary(nextSummary: ProgressSummary) {
    const nextComplete = isPuzzleComplete(nextSummary);

    if (!startedRef.current && nextSummary.paintedCount > 0) {
      startedRef.current = true;
      trackPuzzleStarted(puzzle, artworkSource, nextSummary.paintedCount);
    }

    if (nextComplete !== completedRef.current) {
      completedRef.current = nextComplete;
      setCelebrateCompletion(nextComplete);
      if (nextComplete) {
        trackPuzzleCompleted(puzzle, artworkSource);
      }
    }

    setSummary(nextSummary);
  }

  function replaceDebugProgress(nextProgress: PuzzleProgress) {
    if (resettingRef.current) {
      return;
    }

    setProgress(nextProgress);
    progressSaver.schedule(nextProgress, nextProgress.paintedCount >= puzzle.width * puzzle.height);
  }

  async function resetBoard() {
    resettingRef.current = true;
    const paintedCellsBeforeReset = summary.paintedCount;

    try {
      await progressSaver.discard();
      await clearPuzzleProgress(puzzle);

      const emptyProgress = createPuzzleProgress(puzzle);
      trackPuzzleReset(puzzle, artworkSource, paintedCellsBeforeReset, "board");
      startedRef.current = false;
      completedRef.current = false;
      setCelebrateCompletion(false);
      setProgress(emptyProgress);
      setSummary(createProgressSummary(puzzle, emptyProgress));
      setResetVersion((version) => version + 1);
    } catch (error) {
      // Discard removes the pending snapshot; restore it if deleting the stored record fails.
      progressSaver.schedule(progress, true);
      throw error;
    } finally {
      resettingRef.current = false;
    }
  }

  return (
    <main className="relative h-svh overflow-hidden p-3 text-foreground sm:p-5">
      <div className="mx-auto grid h-full max-w-384 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4">
        {/* Stacked so the start-over confirmation opens over the board, not under it. */}
        <header className="relative z-10 flex min-w-0 items-end justify-between gap-3 border-border border-b px-1 pb-3 sm:gap-4 sm:pb-4">
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
              <SaveStatus status={saveStatus} />
            </div>
            <ArtworkCredit artist={puzzle.artist} />
          </div>
          <div className="flex min-h-11 shrink-0 items-center gap-2 sm:gap-4">
            <DebugFillControl
              key={`${puzzle.id}-${resetVersion}`}
              onProgress={replaceDebugProgress}
              onSummary={updateProgressSummary}
              progress={progress}
              puzzle={puzzle}
            />
            <StartOverPopover onStartOver={resetBoard} painted={summary.paintedCount > 0} />
            <div aria-hidden className="h-6 w-px shrink-0 self-center bg-border" />
            <div className="w-20 sm:w-56">
              <ProgressDisplay summary={summary} />
            </div>
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

          {/* The page shell clips viewport overflow; this stays visible so Safari does not crop the burst. */}
          <section className="min-h-0 min-w-0 flex-1 overflow-visible">
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

function isPuzzleComplete(summary: ProgressSummary) {
  return summary.totalPixels > 0 && summary.paintedCount >= summary.totalPixels;
}
