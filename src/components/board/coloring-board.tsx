import { useEffect, useRef } from "react";
import { createColoringBoard } from "@/coloring/create-coloring-board";
import type { RefObject } from "react";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

interface ColoringBoardProps {
  onProgress: (summary: ProgressSummary) => void;
  onSelectColor: (colorIndex: number) => void;
  overviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  progress: PuzzleProgress;
  puzzle: PuzzleDefinition;
  selectedColor: number;
  showNumbers: boolean;
  tool: ColoringTool;
}

export function ColoringBoard({
  onProgress,
  onSelectColor,
  overviewCanvasRef,
  progress,
  puzzle,
  selectedColor,
  showNumbers,
  tool,
}: ColoringBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ReturnType<typeof createColoringBoard> | null>(null);

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
    controllerRef.current?.setShowNumbers(showNumbers);
  }, [showNumbers]);

  useEffect(() => {
    controllerRef.current?.setTool(tool);
  }, [tool]);

  return (
    <div className="grid h-full min-h-0 w-full min-w-0 place-items-center" ref={containerRef}>
      <canvas
        aria-label="Color-by-number puzzle. Choose a tool and interact with cells on the board."
        className="block max-h-full max-w-full touch-none select-none rounded-lg bg-canvas shadow-[0_18px_60px_rgba(0,0,0,0.3)] ring-1 ring-border"
        ref={canvasRef}
        role="img"
      />
    </div>
  );
}
