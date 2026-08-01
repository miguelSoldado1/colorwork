import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { createProgressSummary, createPuzzleProgress } from "@/coloring/progress";
import { BoardOverview } from "@/components/board/board-overview";
import { ColoringBoard } from "@/components/board/coloring-board";
import { DebugFillControl } from "@/components/debug/debug-fill-control";
import ArrowLeft from "@/components/icons/arrow-left.svg?react";
import { Palette } from "@/components/palette/palette";
import { ProgressDisplay } from "@/components/progress/progress-display";
import { ToolPicker } from "@/components/toolbar/tool-picker";
import type { ColoringTool, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

interface AppProps {
  puzzle: PuzzleDefinition;
}

export function App({ puzzle }: AppProps) {
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ColoringTool>("pencil");
  const [showGrid, setShowGrid] = useState(true);
  const [showNumbers, setShowNumbers] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [progress, setProgress] = useState<PuzzleProgress>(() => createPuzzleProgress(puzzle));
  const [summary, setSummary] = useState(() => createProgressSummary(puzzle, progress));

  const complete = summary.totalPixels > 0 && summary.paintedCount >= summary.totalPixels;

  function toggleNumbers() {
    setShowNumbers((visible) => !visible);
  }

  function toggleGrid() {
    setShowGrid((visible) => !visible);
  }

  function toggleMissingHighlight() {
    setHighlightMissing((highlighted) => !highlighted);
  }

  return (
    <main className="relative h-svh overflow-hidden p-3 text-foreground sm:p-5">
      <div className="mx-auto grid h-full max-w-384 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4">
        <header className="flex min-w-0 items-end justify-between gap-4 border-border border-b px-1 pb-3 sm:pb-4">
          <div className="min-w-0">
            <Link
              className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.2em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              to="/"
            >
              <ArrowLeft height={13} width={13} />
              All artworks
            </Link>
            <h1 className="mt-1 truncate font-semibold text-xl leading-none sm:text-2xl">{puzzle.name}</h1>
          </div>
          <div className="flex min-h-11 shrink-0 items-center gap-3 sm:gap-5">
            <div className="w-24 sm:w-56">
              <ProgressDisplay summary={summary} />
            </div>
            <DebugFillControl
              key={puzzle.id}
              onProgress={setProgress}
              onSummary={setSummary}
              progress={progress}
              puzzle={puzzle}
            />
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
          {/* Scrolls horizontally above the board on phones; a fixed rail beside it on desktop. The card
              carries the border and the strip inside it carries the scroll, so fading the strip's ends
              cannot dissolve the outline. */}
          <aside className="min-h-0 w-full min-w-0 self-start rounded-xl border border-border bg-card/80 p-2 sm:flex sm:max-h-full sm:w-auto sm:shrink-0 sm:self-center">
            <div className="scrollbar-none max-sm:scroll-fade-x min-h-0 overflow-x-auto overscroll-contain sm:overflow-y-auto sm:overflow-x-visible">
              <ToolPicker
                gridVisible={showGrid}
                highlightMissing={highlightMissing}
                numbersVisible={showNumbers}
                onSelect={setSelectedTool}
                onToggleGrid={toggleGrid}
                onToggleMissing={toggleMissingHighlight}
                onToggleNumbers={toggleNumbers}
                selectedTool={selectedTool}
              />
            </div>
          </aside>

          {/* Clipped, not hidden, with room for the completion burst to fly past the board edge. */}
          <section className="min-h-0 min-w-0 flex-1 overflow-clip [overflow-clip-margin:8rem]">
            <ColoringBoard
              complete={complete}
              highlightMissing={highlightMissing}
              onProgress={setSummary}
              onSelectColor={setSelectedColor}
              overviewCanvasRef={overviewCanvasRef}
              progress={progress}
              puzzle={puzzle}
              selectedColor={selectedColor}
              showGrid={showGrid}
              showNumbers={showNumbers}
              tool={selectedTool}
            />
          </section>
        </div>

        <aside className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card/80 p-2.5 sm:gap-5 sm:p-3">
          <BoardOverview
            canvasRef={overviewCanvasRef}
            complete={complete}
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
