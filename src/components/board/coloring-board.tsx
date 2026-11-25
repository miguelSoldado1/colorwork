import { useEffect, useEffectEvent, useId, useRef } from "react";
import { createColoringBoard } from "@/coloring/create-coloring-board";
import { CompletionConfetti } from "@/components/board/completion-confetti";
import type { RefObject } from "react";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

interface ColoringBoardProps {
  celebrateCompletion: boolean;
  colorSelection: { colorIndex: number };
  highlightMissing: boolean;
  onProgress: (summary: ProgressSummary) => void;
  onSelectColor: (colorIndex: number) => void;
  overviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  progress: PuzzleProgress;
  puzzle: PuzzleDefinition;
  showGrid: boolean;
  showNumbers: boolean;
  tool: ColoringTool;
}

export function ColoringBoard({
  celebrateCompletion,
  colorSelection,
  highlightMissing,
  onProgress,
  onSelectColor,
  overviewCanvasRef,
  progress,
  puzzle,
  showGrid,
  showNumbers,
  tool,
}: ColoringBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ReturnType<typeof createColoringBoard> | null>(null);
  const boardInstructionsId = useId();
  const getBoardSettings = useEffectEvent(() => ({
    gridVisible: showGrid,
    highlightMissing,
    numbersVisible: showNumbers,
    selectedColor: colorSelection.colorIndex,
    tool,
  }));

  const reportProgress = useEffectEvent(onProgress);
  const selectColor = useEffectEvent(onSelectColor);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const overviewCanvas = overviewCanvasRef.current;
    if (!(canvas && container && overviewCanvas)) {
      return;
    }

    const controller = createColoringBoard({
      canvas,
      container,
      ...getBoardSettings(),
      onProgress: reportProgress,
      onSelectColor: selectColor,
      overviewCanvas,
      progress,
      puzzle,
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [overviewCanvasRef, progress, puzzle]);

  useEffect(() => {
    controllerRef.current?.setSelectedColor(colorSelection.colorIndex);
  }, [colorSelection]);

  useEffect(() => {
    controllerRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    controllerRef.current?.setShowNumbers(showNumbers);
  }, [showNumbers]);

  useEffect(() => {
    controllerRef.current?.setHighlightMissing(highlightMissing);
  }, [highlightMissing]);

  useEffect(() => {
    controllerRef.current?.setTool(tool);
  }, [tool]);

  return (
    <div className="grid h-full min-h-0 w-full min-w-0 place-items-center" ref={containerRef}>
      <p className="sr-only" id={boardInstructionsId}>
        Focus the board, then use the arrow keys to move the active cell. Press Enter to use the selected tool. Hold
        Space to pan.
      </p>
      {/* Shrink-wraps the canvas so the confetti can fill this box instead of measuring the board. */}
      <div className="relative">
        <canvas
          aria-describedby={boardInstructionsId}
          aria-label="Color-by-number puzzle. Choose a tool and interact with cells on the board."
          className="block touch-none select-none bg-canvas shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] ring-1 ring-border focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
          ref={canvasRef}
          role="img"
          tabIndex={0}
        />
        {celebrateCompletion ? (
          <>
            <CompletionConfetti palette={puzzle.palette} />
            <p className="sr-only" role="status">
              Puzzle complete. Every pixel is painted.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
