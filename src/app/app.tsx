import { Brush } from "pixelarticons/react/Brush";
import { Image2Plus } from "pixelarticons/react/Image2Plus";
import { useRef, useState } from "react";
import { countRenderedImageColors, getRecommendedGridSize } from "@/coloring/import-image";
import { createProgressSummary, createPuzzleProgress } from "@/coloring/progress";
import { BoardOverview } from "@/components/board/board-overview";
import { ColoringBoard } from "@/components/board/coloring-board";
import { ImageImportDialog } from "@/components/import/image-import-dialog";
import { Palette } from "@/components/palette/palette";
import { ProgressDisplay } from "@/components/progress/progress-display";
import { ToolPicker } from "@/components/toolbar/tool-picker";
import { Button } from "@/components/ui/button";
import { napoleonDynamitePuzzle } from "@/puzzles/napoleon-dynamite-puzzle";
import type { ChangeEvent } from "react";
import type { ImageImportSource } from "@/coloring/import-image";
import type { ColoringTool, PuzzleDefinition } from "@/coloring/types";

export function App() {
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [puzzle, setPuzzle] = useState<PuzzleDefinition>(napoleonDynamitePuzzle);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ColoringTool>("pencil");
  const [showNumbers, setShowNumbers] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [progress, setProgress] = useState(() => createPuzzleProgress(napoleonDynamitePuzzle));
  const [summary, setSummary] = useState(() => createProgressSummary(napoleonDynamitePuzzle, progress));
  const [importSource, setImportSource] = useState<ImageImportSource | null>(null);
  const [importError, setImportError] = useState("");

  function toggleNumbers() {
    setShowNumbers((visible) => !visible);
  }

  function toggleMissingHighlight() {
    setHighlightMissing((highlighted) => !highlighted);
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!file) {
      return;
    }

    setImportError("");
    try {
      const bitmap = await createImageBitmap(file);
      const recommendedSize = getRecommendedGridSize(bitmap.width, bitmap.height);
      setImportSource({
        bitmap,
        detectedColorCount: countRenderedImageColors(bitmap, recommendedSize.width, recommendedSize.height),
        fileName: file.name,
        height: bitmap.height,
        width: bitmap.width,
      });
    } catch {
      setImportError("That image could not be opened. Try a PNG, JPG, or WebP file.");
    }
  }

  function closeImporter() {
    importSource?.bitmap.close();
    setImportSource(null);
  }

  function useImportedPuzzle(nextPuzzle: PuzzleDefinition) {
    const nextProgress = createPuzzleProgress(nextPuzzle);
    setPuzzle(nextPuzzle);
    setProgress(nextProgress);
    setSummary(createProgressSummary(nextPuzzle, nextProgress));
    setSelectedColor(0);
    closeImporter();
  }

  return (
    <main className="relative h-svh overflow-hidden bg-background p-3 text-foreground sm:p-5">
      <div className="mx-auto grid h-full max-w-384 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4">
        <header className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border bg-card/90 px-4 py-3 text-card-foreground shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-[0_3px_0_#5148a8]">
              <Brush aria-hidden height={24} width={24} />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Color Byte</p>
              <h1 className="truncate text-lg leading-none sm:text-xl">{puzzle.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <input accept="image/*" className="sr-only" onChange={selectImage} ref={fileInputRef} type="file" />
            <Button className="sm:px-4" onClick={() => fileInputRef.current?.click()} size="compact" variant="outline">
              <Image2Plus aria-hidden height={20} width={20} />
              <span className="hidden sm:inline">Import art</span>
              <span className="sr-only sm:hidden">Import art</span>
            </Button>
            <div className="w-24 sm:w-52">
              <ProgressDisplay summary={summary} />
            </div>
          </div>
        </header>

        {importError ? (
          <p
            className="absolute top-20 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-card px-4 py-3 text-card-foreground text-sm shadow-xl"
            role="alert"
          >
            {importError}
          </p>
        ) : null}

        <div className="flex min-h-0 gap-3 sm:gap-4">
          <aside className="scrollbar-none max-h-full min-h-0 self-center overflow-y-auto overscroll-contain rounded-lg border border-border bg-card/95 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.42)] backdrop-blur [&::-webkit-scrollbar]:hidden">
            <ToolPicker
              highlightMissing={highlightMissing}
              numbersVisible={showNumbers}
              onSelect={setSelectedTool}
              onToggleMissing={toggleMissingHighlight}
              onToggleNumbers={toggleNumbers}
              selectedTool={selectedTool}
            />
          </aside>

          <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <ColoringBoard
              highlightMissing={highlightMissing}
              onProgress={setSummary}
              onSelectColor={setSelectedColor}
              overviewCanvasRef={overviewCanvasRef}
              progress={progress}
              puzzle={puzzle}
              selectedColor={selectedColor}
              showNumbers={showNumbers}
              tool={selectedTool}
            />
          </section>
        </div>

        <div className="flex min-w-0 items-end justify-between gap-3">
          <BoardOverview canvasRef={overviewCanvasRef} puzzleHeight={puzzle.height} puzzleWidth={puzzle.width} />
          <aside className="scrollbar-none flex max-w-full overflow-x-auto rounded-lg border border-border bg-card/95 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.42)] backdrop-blur [&::-webkit-scrollbar]:hidden">
            <Palette onSelect={setSelectedColor} puzzle={puzzle} selectedColor={selectedColor} summary={summary} />
          </aside>
        </div>
      </div>
      {importSource ? (
        <ImageImportDialog onCancel={closeImporter} onConfirm={useImportedPuzzle} source={importSource} />
      ) : null}
    </main>
  );
}
