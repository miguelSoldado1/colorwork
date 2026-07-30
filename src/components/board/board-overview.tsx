import type { RefObject } from "react";

interface BoardOverviewProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function BoardOverview({ canvasRef }: BoardOverviewProps) {
  return (
    <aside className="shrink-0 rounded-lg border border-border bg-card/95 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.42)] backdrop-blur">
      <p className="mb-1 px-1 text-[10px] text-muted-foreground uppercase tracking-[0.16em]">View</p>
      <canvas
        aria-label="Puzzle overview showing the current visible area"
        className="block h-12 w-24 rounded-sm border border-border bg-canvas sm:h-20 sm:w-40"
        ref={canvasRef}
        role="img"
      />
    </aside>
  );
}
