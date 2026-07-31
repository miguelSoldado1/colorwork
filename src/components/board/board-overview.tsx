import { PING_DELAY_MS } from "@/components/board/completion-confetti";
import type { CSSProperties, RefObject } from "react";

interface BoardOverviewProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  complete: boolean;
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

export function BoardOverview({ canvasRef, complete, puzzleHeight, puzzleWidth }: BoardOverviewProps) {
  const mobileSize = fitOverview(puzzleWidth, puzzleHeight, MOBILE_MAX_SIZE);
  const desktopSize = fitOverview(puzzleWidth, puzzleHeight, DESKTOP_MAX_SIZE);

  const canvasStyle = {
    "--overview-height": `${mobileSize.height}px`,
    "--overview-height-sm": `${desktopSize.height}px`,
    "--overview-width": `${mobileSize.width}px`,
    "--overview-width-sm": `${desktopSize.width}px`,
  } as CSSProperties;

  return (
    <span className="relative block shrink-0">
      <canvas
        aria-label="Puzzle overview showing the current visible area. Click or drag to pan the board."
        className="block h-(--overview-height) w-(--overview-width) touch-none select-none rounded-md border border-border bg-canvas sm:h-(--overview-height-sm) sm:w-(--overview-width-sm)"
        height={puzzleHeight}
        ref={canvasRef}
        role="img"
        style={canvasStyle}
        width={puzzleWidth}
      />
      {/* The ring sits outside the thumbnail, so nothing lands on the artwork inside it. */}
      {complete ? (
        <span
          aria-hidden
          className="board-confetti-ping pointer-events-none absolute -inset-1 rounded-lg ring-1 ring-foreground/60"
          style={{ "--confetti-ping": `${PING_DELAY_MS}ms` } as CSSProperties}
        />
      ) : null}
    </span>
  );
}
