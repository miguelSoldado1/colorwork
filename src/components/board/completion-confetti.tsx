import type { CSSProperties } from "react";

/** Tuned by eye: count, flight, and stagger carry the burst, not distance. */
const CONFETTI = {
  count: 50,
  flightMs: 2000,
  /** Smallest pixel; the mix runs 5, 7, 9. */
  sizePx: 5,
  spreadPx: 50,
  staggerMs: 20,
};

export const PING_DELAY_MS = 160;

interface CompletionConfettiProps {
  palette: readonly string[];
}

/** Every particle takes a color the player just finished using, so the burst suits any artwork. */
export function CompletionConfetti({ palette }: CompletionConfettiProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ "--fly-life": `${CONFETTI.flightMs}ms` } as CSSProperties}
    >
      {PIXELS.map((pixel) => (
        <span
          className="board-confetti-pixel absolute"
          key={pixel.id}
          style={{ ...pixel.style, backgroundColor: palette[pixel.paletteIndex % palette.length] }}
        />
      ))}
    </div>
  );
}

/** Spread around the perimeter and thrown outward. Derived from the index, so every board bursts alike. */
function createPixel(index: number) {
  const { count, sizePx, spreadPx, staggerMs } = CONFETTI;
  const wobble = ((index * 7) % 5) / 4;
  const drift = (wobble - 0.5) * 28;
  const distance = spreadPx + wobble * spreadPx;
  const along = `${8 + (((index / count) * 4) % 1) * 84}%`;
  const edges = [
    { left: along, top: "0%", x: drift, y: -distance },
    { left: "100%", top: along, x: distance, y: drift },
    { left: along, top: "100%", x: drift, y: distance },
    { left: "0%", top: along, x: -distance, y: drift },
  ];
  const edge = edges[index % 4];

  return {
    id: `confetti-${index}`,
    paletteIndex: index,
    style: {
      "--fly-delay": `${index * staggerMs}ms`,
      "--fly-size": `${sizePx + ((index * 5) % 3) * 2}px`,
      "--fly-x": `${edge.x}px`,
      "--fly-y": `${edge.y}px`,
      left: edge.left,
      top: edge.top,
    } as CSSProperties,
  };
}

const PIXELS = Array.from({ length: CONFETTI.count }, (_, index) => createPixel(index));
