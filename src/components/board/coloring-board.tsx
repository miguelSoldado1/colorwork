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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ReturnType<typeof createColoringBoard> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overviewCanvas = overviewCanvasRef.current;
    if (!(canvas && overviewCanvas)) {
      return;
    }

    const controller = createColoringBoard({ canvas, onProgress, onSelectColor, overviewCanvas, progress, puzzle });
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
    <canvas
      aria-label="Color-by-number puzzle. Choose a tool and interact with cells on the board."
      className="h-full min-h-0 w-full touch-none select-none"
      ref={canvasRef}
      role="img"
    />
  );
}
