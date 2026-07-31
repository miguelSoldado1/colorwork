import { useEffect, useEffectEvent, useRef } from "react";
import { createColoringBoard } from "@/coloring/create-coloring-board";
import { CompletionConfetti } from "@/components/board/completion-confetti";
import type { RefObject } from "react";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

interface ColoringBoardProps {
  complete: boolean;
  highlightMissing: boolean;
  onProgress: (summary: ProgressSummary) => void;
  onSelectColor: (colorIndex: number) => void;
  overviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  progress: PuzzleProgress;
  puzzle: PuzzleDefinition;
  selectedColor: number;
  showGrid: boolean;
  showNumbers: boolean;
  tool: ColoringTool;
}

export function ColoringBoard({
  complete,
  highlightMissing,
  onProgress,
  onSelectColor,
  overviewCanvasRef,
  progress,
  puzzle,
  selectedColor,
  showGrid,
  showNumbers,
  tool,
}: ColoringBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ReturnType<typeof createColoringBoard> | null>(null);
  const getBoardSettings = useEffectEvent(() => ({
    gridVisible: showGrid,
    highlightMissing,
    numbersVisible: showNumbers,
    selectedColor,
    tool,
  }));

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
      onProgress,
      onSelectColor,
      overviewCanvas,
      progress,
      puzzle,
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [onProgress, onSelectColor, overviewCanvasRef, progress, puzzle]);

  useEffect(() => {
    controllerRef.current?.setSelectedColor(selectedColor);
  }, [selectedColor]);

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
      {/* Shrink-wraps the canvas so the confetti can fill this box instead of measuring the board. */}
      <div className="relative">
        <canvas
          aria-label="Color-by-number puzzle. Choose a tool and interact with cells on the board."
          className="block touch-none select-none bg-canvas shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] ring-1 ring-border"
          ref={canvasRef}
          role="img"
        />
        {complete ? (
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
