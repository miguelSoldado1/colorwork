import { Brush } from "pixelarticons/react/Brush";
import { useRef, useState } from "react";
import { createProgressSummary, createPuzzleProgress } from "@/coloring/progress";
import { BoardOverview } from "@/components/board/board-overview";
import { ColoringBoard } from "@/components/board/coloring-board";
import { Palette } from "@/components/palette/palette";
import { ProgressDisplay } from "@/components/progress/progress-display";
import { ToolPicker } from "@/components/toolbar/tool-picker";
import { testPuzzle } from "@/puzzles/test-puzzle";
import type { ColoringTool } from "@/coloring/types";

export function App() {
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState(1);
  const [selectedTool, setSelectedTool] = useState<ColoringTool>("pencil");
  const [showNumbers, setShowNumbers] = useState(true);
  const [progress] = useState(() => createPuzzleProgress(testPuzzle));
  const [summary, setSummary] = useState(() => createProgressSummary(testPuzzle, progress));

  function toggleNumbers() {
    setShowNumbers((visible) => !visible);
  }

  return (
    <main className="relative h-svh overflow-hidden bg-paper p-3 text-ink sm:p-5">
      <div className="mx-auto grid h-full max-w-384 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4">
        <header className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-panel/90 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet text-ink shadow-[0_3px_0_#5148a8]">
              <Brush aria-hidden height={24} width={24} />
            </span>
            <div className="min-w-0">
              <p className="text-faint text-xs uppercase tracking-[0.16em]">Color Byte</p>
              <h1 className="truncate text-lg leading-none sm:text-xl">Aurora valley</h1>
            </div>
          </div>
          <div className="w-28 sm:w-52">
            <ProgressDisplay summary={summary} />
          </div>
        </header>

        <div className="flex min-h-0 gap-3 sm:gap-4">
          <aside className="max-h-full min-h-0 self-center overflow-y-auto overscroll-contain rounded-2xl border border-ink/10 bg-panel/95 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.42)] backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ToolPicker
              numbersVisible={showNumbers}
              onSelect={setSelectedTool}
              onToggleNumbers={toggleNumbers}
              selectedTool={selectedTool}
            />
          </aside>

          <section className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-ink/10 bg-board shadow-[0_18px_60px_rgba(0,0,0,0.3)]">
            <ColoringBoard
              onProgress={setSummary}
              onSelectColor={setSelectedColor}
              overviewCanvasRef={overviewCanvasRef}
              progress={progress}
              puzzle={testPuzzle}
              selectedColor={selectedColor}
              showNumbers={showNumbers}
              tool={selectedTool}
            />
          </section>
        </div>

        <div className="flex min-w-0 items-end justify-between gap-3">
          <BoardOverview canvasRef={overviewCanvasRef} />
          <aside className="scrollbar-none flex max-w-full overflow-x-auto rounded-2xl border border-ink/10 bg-panel/95 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.42)] backdrop-blur [&::-webkit-scrollbar]:hidden">
            <Palette onSelect={setSelectedColor} puzzle={testPuzzle} selectedColor={selectedColor} summary={summary} />
          </aside>
        </div>
      </div>
    </main>
  );
}
