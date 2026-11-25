import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { reconcileAchievements } from "@/achievements/process-achievements";
import { checkAndShowAchievementUnlocks } from "@/achievements/show-achievement-toast";
import {
  trackArtworkOpened,
  trackProgressMilestones,
  trackPuzzleCompleted,
  trackPuzzleReset,
  trackPuzzleStarted,
} from "@/analytics/posthog";
import { clonePuzzleProgress, createProgressSummary, createPuzzleProgress } from "@/coloring/progress";
import {
  clearPuzzleProgress,
  createProgressSaveController,
  type ProgressSaveStatus,
} from "@/coloring/progress-storage";
import { ArtworkCredit } from "@/components/artwork/artwork-credit";
import { ArtworkLoadError, ArtworkLoading } from "@/components/artwork/artwork-load-state";
import { BoardOverview } from "@/components/board/board-overview";
import { BoardHeader, BoardHeading, BoardShell, BoardTitle, BoardTitleRow } from "@/components/board/board-shell";
import { ColoringBoard } from "@/components/board/coloring-board";
import { ControlsSheet } from "@/components/board/controls-sheet";
import { DownloadArtworkButton } from "@/components/board/download-artwork-button";
import { RenameArtworkTitle } from "@/components/board/rename-artwork-title";
import { StartOverPopover } from "@/components/board/start-over-popover";
import { DebugFillControl } from "@/components/debug/debug-fill-control";
import { Palette } from "@/components/palette/palette";
import { ProgressDisplay } from "@/components/progress/progress-display";
import { SaveStatus } from "@/components/progress/save-status";
import { ToolPicker } from "@/components/toolbar/tool-picker";
import { TOOL_SHORTCUTS, TOOLBAR_SHORTCUTS } from "@/keyboard/game-shortcuts";
import { useKeyboardShortcuts } from "@/keyboard/use-keyboard-shortcuts";
import { useSpaceHeld } from "@/keyboard/use-space-held";
import { renameImportedPuzzle } from "@/levels/imported-levels";
import { saveLastPaintedArtworkId } from "@/levels/last-painted-artwork";
import { findLevel, LEVELS } from "@/levels/level-catalog";
import {
  artworkDefinitionQueryOptions,
  artworkDescriptionsQueryOptions,
  artworkProgressQueryOptions,
  artworkQueryKeys,
} from "@/query/artwork-queries";
import { usePageMetadata } from "@/seo/use-page-metadata";
import { loadUserPreferences, saveUserPreferences } from "@/user-preferences";
import type { QueryClient } from "@tanstack/react-query";
import type { PuzzleCompletionFact } from "@/achievements/process-achievements";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

export const Route = createFileRoute("/play/$levelId")({ component: PlayRoute });

function playMetadata({ height, id, width }: PuzzleDefinition, name: string) {
  return {
    description: `Color ${name}, a ${width} by ${height} pixel art color-by-number puzzle, in your browser.`,
    path: `/play/${encodeURIComponent(id)}`,
    title: `${name} - Colorwork`,
  };
}

export const prerenderPages = LEVELS.map((level) => playMetadata(level, level.name));

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
    return (
      <BoardShell>
        <BoardHeader>
          <BoardHeading>
            <BoardTitleRow>
              <BoardTitle>{puzzle.name}</BoardTitle>
            </BoardTitleRow>
            <ArtworkCredit artist={puzzle.artist} />
          </BoardHeading>
        </BoardHeader>
        <div className="grid min-h-0 place-items-center text-muted-foreground text-sm" role="status">
          Loading artwork…
        </div>
      </BoardShell>
    );
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
  const queryClient = useQueryClient();
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const persistedArtworkNameRef = useRef(puzzle.name);
  const [artworkName, setArtworkName] = useState(puzzle.name);
  const [renaming, setRenaming] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ColoringTool>("pencil");
  const spaceHeld = useSpaceHeld();
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
  const paintedCellsRef = useRef(initialProgress.paintedCount);
  // Painting, not opening, is what the menu resumes.
  const rememberedRef = useRef(false);
  // A repeated selection must still reach the board to cancel pending color advancement.
  const [colorSelection, setColorSelection] = useState(() => ({
    colorIndex: Math.max(
      0,
      summary.paintedByColor.findIndex((painted, colorIndex) => painted < summary.totalByColor[colorIndex])
    ),
  }));

  usePageMetadata(playMetadata(puzzle, artworkName));

  const artworkSource = findLevel(puzzle.id) ? "catalog" : "imported";
  const totalCells = puzzle.width * puzzle.height;
  const activeTool = spaceHeld ? "pan" : selectedTool;

  useEffect(() => {
    trackArtworkOpened({ paintedCells: initialProgress.paintedCount, puzzle, source: artworkSource, totalCells });
  }, [artworkSource, initialProgress, puzzle, totalCells]);

  useEffect(() => progressSaver.connect(), [progressSaver]);

  useEffect(
    () => () => {
      const nextName = persistedArtworkNameRef.current;
      if (nextName === puzzle.name) {
        return;
      }

      // Updating this active query during play would replace `puzzle` and rebuild the Canvas.
      // Refresh it once the route is leaving, so a client-side return starts with the new name.
      queryClient.setQueryData(artworkQueryKeys.definition(puzzle.id), (cachedPuzzle) =>
        cachedPuzzle ? { ...cachedPuzzle, name: nextName } : cachedPuzzle
      );
    },
    [puzzle.id, puzzle.name, queryClient]
  );

  useEffect(() => {
    saveUserPreferences(preferences);
  }, [preferences]);

  const selectedColor = colorSelection.colorIndex;
  function setSelectedColor(colorIndex: number) {
    setColorSelection({ colorIndex });
  }

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

    if (!rememberedRef.current) {
      rememberedRef.current = true;
      saveLastPaintedArtworkId(puzzle.id);
    }
    updateProgressSummary(nextSummary);
    progressSaver.schedule(progress, isPuzzleComplete(nextSummary));
  }

  function updateProgressSummary(nextSummary: ProgressSummary) {
    const nextComplete = isPuzzleComplete(nextSummary);

    const previousPaintedCells = paintedCellsRef.current;
    paintedCellsRef.current = nextSummary.paintedCount;

    if (previousPaintedCells === 0 && nextSummary.paintedCount > 0) {
      trackPuzzleStarted({ paintedCells: nextSummary.paintedCount, puzzle, source: artworkSource });
    }
    trackProgressMilestones({
      paintedCells: nextSummary.paintedCount,
      previousPaintedCells,
      puzzle,
      source: artworkSource,
      totalCells,
    });

    if (nextComplete !== completedRef.current) {
      completedRef.current = nextComplete;
      setCelebrateCompletion(nextComplete);

      if (nextComplete) {
        trackPuzzleCompleted(puzzle, artworkSource);
        checkAndShowAchievementUnlocks(() =>
          reconcilePuzzleCompletionAchievements(queryClient, { artworkId: puzzle.id, source: artworkSource })
        );
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

  async function renameArtwork(nextName: string) {
    await renameImportedPuzzle(puzzle.id, nextName);
    persistedArtworkNameRef.current = nextName;
    setArtworkName(nextName);
    queryClient.setQueryData(artworkDescriptionsQueryOptions().queryKey, (levels) =>
      levels?.map((level) =>
        level.puzzle.id === puzzle.id ? { ...level, puzzle: { ...level.puzzle, name: nextName } } : level
      )
    );
  }

  async function resetBoard() {
    resettingRef.current = true;
    const paintedCellsBeforeReset = summary.paintedCount;

    try {
      await progressSaver.discard();
      await clearPuzzleProgress(puzzle);

      const emptyProgress = createPuzzleProgress(puzzle);
      trackPuzzleReset({ paintedCellsBeforeReset, puzzle, source: artworkSource, surface: "board" });
      paintedCellsRef.current = 0;
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
    <BoardShell>
      <BoardHeader>
        <BoardHeading>
          <BoardTitleRow>
            {artworkSource === "imported" ? (
              <RenameArtworkTitle
                editing={renaming}
                name={artworkName}
                onEditingChange={setRenaming}
                onRename={renameArtwork}
              />
            ) : (
              <BoardTitle>{artworkName}</BoardTitle>
            )}
            <div className={renaming ? "hidden" : undefined}>
              <SaveStatus status={saveStatus} />
            </div>
          </BoardTitleRow>
          <ArtworkCredit artist={puzzle.artist} />
        </BoardHeading>
        {/* Below `lg` the rename form and the board actions cannot share a row, so the name wins. */}
        <div className={`${renaming ? "hidden lg:flex" : "flex"} min-h-11 shrink-0 items-center gap-2 sm:gap-4`}>
          <DebugFillControl
            key={`${puzzle.id}-${resetVersion}`}
            onProgress={replaceDebugProgress}
            onSummary={updateProgressSummary}
            progress={progress}
            puzzle={puzzle}
          />
          <div className="flex items-center gap-2">
            {artworkSource === "imported" ? (
              <div className="hidden sm:block">
                <DownloadArtworkButton complete={complete} name={artworkName} puzzle={puzzle} />
              </div>
            ) : null}
            <StartOverPopover onStartOver={resetBoard} painted={summary.paintedCount > 0} />
          </div>
          <div aria-hidden className="h-6 w-px shrink-0 self-center bg-border" />
          <div className="w-20 sm:w-56">
            <ProgressDisplay summary={summary} />
          </div>
        </div>
      </BoardHeader>

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
            selectedTool={activeTool}
          />
        </aside>

        {/* The page shell clips viewport overflow; this stays visible so Safari does not crop the burst. */}
        <section className="min-h-0 min-w-0 flex-1 overflow-visible">
          <ColoringBoard
            celebrateCompletion={celebrateCompletion}
            colorSelection={colorSelection}
            highlightMissing={highlightMissing}
            onProgress={updateBoardProgress}
            onSelectColor={setSelectedColor}
            overviewCanvasRef={overviewCanvasRef}
            progress={progress}
            puzzle={puzzle}
            showGrid={preferences.showGrid}
            showNumbers={preferences.showNumbers}
            tool={activeTool}
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
        {artworkSource === "imported" ? (
          <div className="shrink-0 sm:hidden">
            <DownloadArtworkButton complete={complete} name={artworkName} puzzle={puzzle} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <Palette
            complete={complete}
            onSelect={setSelectedColor}
            puzzle={puzzle}
            selectedColor={selectedColor}
            summary={summary}
          />
        </div>
        <div className="shrink-0 max-sm:hidden">
          <ControlsSheet colorCount={puzzle.palette.length} />
        </div>
      </aside>
    </BoardShell>
  );
}

function isPuzzleComplete(summary: ProgressSummary) {
  return summary.totalPixels > 0 && summary.paintedCount >= summary.totalPixels;
}

async function reconcilePuzzleCompletionAchievements(queryClient: QueryClient, completion: PuzzleCompletionFact) {
  const levels = await queryClient.fetchQuery({
    ...artworkDescriptionsQueryOptions(),
    staleTime: 0,
  });
  const completedPuzzles = levels
    .filter((level) => level.finished)
    .map((level) => ({ artworkId: level.puzzle.id, source: level.source }));

  return reconcileAchievements([...completedPuzzles, completion]);
}
