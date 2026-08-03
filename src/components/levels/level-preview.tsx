import { useEffect, useRef, useState } from "react";
import { renderLevelPreview } from "@/levels/render-level-preview";
import type { PuzzleDefinition } from "@/coloring/types";

interface LevelPreviewProps {
  className: string;
  colored: boolean;
  fit?: "contain" | "cover";
  /** Names the artwork for assistive tech; omit where a nearby heading already does. */
  label?: string;
  numbers?: boolean;
  puzzle: PuzzleDefinition;
}

export function LevelPreview({
  className,
  colored,
  fit = "contain",
  label,
  numbers = false,
  puzzle,
}: LevelPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setFrame({ height: entry.contentRect.height, width: entry.contentRect.width });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frame.width === 0 || frame.height === 0) {
      return;
    }

    renderLevelPreview({ canvas, colored, fit, frame, numbers, puzzle });
  }, [colored, fit, frame, numbers, puzzle]);

  return (
    <div className={`grid place-items-center ${className}`} ref={frameRef}>
      <canvas
        aria-hidden={label ? undefined : true}
        aria-label={label}
        className={`block ${fit === "cover" ? "[image-rendering:pixelated]" : ""}`}
        ref={canvasRef}
        role={label ? "img" : undefined}
      />
    </div>
  );
}
