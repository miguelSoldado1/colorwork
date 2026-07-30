import type { CSSProperties, RefObject } from "react";

interface BoardOverviewProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  puzzleHeight: number;
  puzzleWidth: number;
}

const MOBILE_MAX_SIZE = { height: 48, width: 96 };
const DESKTOP_MAX_SIZE = { height: 80, width: 160 };

export function fitOverview(width: number, height: number, maximum: typeof MOBILE_MAX_SIZE) {
  const scale = Math.min(maximum.width / width, maximum.height / height);
  return {
    height: height * scale,
    width: width * scale,
  };
}

export function BoardOverview({ canvasRef, puzzleHeight, puzzleWidth }: BoardOverviewProps) {
  const mobileSize = fitOverview(puzzleWidth, puzzleHeight, MOBILE_MAX_SIZE);
  const desktopSize = fitOverview(puzzleWidth, puzzleHeight, DESKTOP_MAX_SIZE);

  const canvasStyle = {
    "--overview-height": `${mobileSize.height}px`,
    "--overview-height-sm": `${desktopSize.height}px`,
    "--overview-width": `${mobileSize.width}px`,
    "--overview-width-sm": `${desktopSize.width}px`,
  } as CSSProperties;

  return (
    <aside className="shrink-0 rounded-lg border border-border bg-card/95 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.42)] backdrop-blur">
      <p className="mb-1 px-1 text-[10px] text-muted-foreground uppercase tracking-[0.16em]">View</p>
      <canvas
        aria-label="Puzzle overview showing the current visible area"
        className="block h-(--overview-height) w-(--overview-width) rounded-sm border border-border bg-canvas sm:h-(--overview-height-sm) sm:w-(--overview-width-sm)"
        height={puzzleHeight}
        ref={canvasRef}
        role="img"
        style={canvasStyle}
        width={puzzleWidth}
      />
    </aside>
  );
}
