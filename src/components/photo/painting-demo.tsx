import { useEffect, useRef } from "react";
import { createColoringBoard, SELECTION_ALPHA, TARGET_GUIDE_MAX_ALPHA } from "@/coloring/create-coloring-board";
import { mutedTargetGray, parseHexColor } from "@/coloring/pixel-raster";
import { createPuzzleProgress } from "@/coloring/progress";
import type { PuzzleDefinition } from "@/coloring/types";

interface PaintingDemoProps {
  duration: number;
  puzzle: PuzzleDefinition;
}

interface PaintStep {
  at: number;
  color: number;
  index?: number;
}

const START_DELAY_MS = 400;
const PREPAINTED_COLOR = 0;
const FIRST_COLOR = 1;

export function PaintingDemo({ duration, puzzle }: PaintingDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!(container && canvas)) {
      return;
    }

    const progress = createPuzzleProgress(puzzle);
    puzzle.targetPixels.forEach((color, index) => {
      if (color === PREPAINTED_COLOR) {
        progress.paintedPixels[index] = color;
        progress.paintedCount += 1;
        progress.paintedByColor[color] += 1;
      }
    });

    const board = createColoringBoard({
      canvas,
      container,
      gridVisible: true,
      highlightMissing: false,
      numbersVisible: false,
      onProgress: () => undefined,
      onSelectColor: () => undefined,
      overviewCanvas: document.createElement("canvas"),
      progress,
      puzzle,
      selectedColor: FIRST_COLOR,
      tool: "pencil",
    });

    const steps = planPainting(puzzle, START_DELAY_MS + duration);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let next = 0;
    let startTime: number | undefined;
    let frameId = requestAnimationFrame(play);

    return () => {
      cancelAnimationFrame(frameId);
      board.destroy();
    };

    function play(now: number) {
      startTime ??= now;
      const elapsed = reducedMotion ? Number.POSITIVE_INFINITY : now - startTime;
      for (; next < steps.length && steps[next].at <= elapsed; next += 1) {
        const { color, index } = steps[next];
        if (index === undefined) {
          board.setSelectedColor(color);
        } else {
          board.paintCell(index);
        }
      }
      if (next < steps.length) {
        frameId = requestAnimationFrame(play);
      }
    }
  }, [duration, puzzle]);

  return (
    <div
      className="mx-auto grid place-items-center"
      ref={containerRef}
      style={{ aspectRatio: `${puzzle.width} / ${puzzle.height}`, width: `round(down, 100%, ${puzzle.width}px)` }}
    >
      <FirstFrame puzzle={puzzle} />
      <canvas aria-hidden className="col-start-1 row-start-1 block touch-none select-none" ref={canvasRef} />
    </div>
  );
}

interface FirstFrameProps {
  puzzle: PuzzleDefinition;
}

function FirstFrame({ puzzle }: FirstFrameProps) {
  const { height, palette, targetPixels, width } = puzzle;
  const prepainted = targetPixels.filter((color) => color === PREPAINTED_COLOR).length;
  const guideAlpha = TARGET_GUIDE_MAX_ALPHA * (1 - prepainted / targetPixels.length);
  const grid = [
    ...Array.from({ length: width + 1 }, (_, x) => `M${x} 0V${height}`),
    ...Array.from({ length: height + 1 }, (_, y) => `M0 ${y}H${width}`),
  ].join("");

  return (
    <svg
      aria-hidden="true"
      className="col-start-1 row-start-1 size-full shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] ring-1 ring-border"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect className="fill-muted" height={height} width={width} />
      <g opacity={guideAlpha}>
        {palette.map((hex, color) => {
          const gray = mutedTargetGray(parseHexColor(hex));
          return (
            <path d={cellRuns(puzzle, (target) => target === color)} fill={`rgb(${gray} ${gray} ${gray})`} key={hex} />
          );
        })}
      </g>
      <path
        className="fill-foreground"
        d={cellRuns(puzzle, (target) => target === FIRST_COLOR)}
        opacity={SELECTION_ALPHA}
      />
      <path className="stroke-foreground/12" d={grid} fill="none" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d={cellRuns(puzzle, (target) => target === PREPAINTED_COLOR)} fill={palette[PREPAINTED_COLOR]} />
    </svg>
  );
}

function cellRuns({ targetPixels, width }: PuzzleDefinition, matches: (target: number) => boolean) {
  let d = "";
  for (let start = 0; start < targetPixels.length; start += 1) {
    if (!matches(targetPixels[start])) {
      continue;
    }
    let end = start + 1;
    while (end % width !== 0 && matches(targetPixels[end])) {
      end += 1;
    }
    d += `M${start % width} ${Math.floor(start / width)}h${end - start}v1h${start - end}z`;
    start = end - 1;
  }
  return d;
}

interface Stroke {
  between: (min: number, max: number) => number;
  random: () => number;
  steps: PaintStep[];
  width: number;
}

function planPainting(puzzle: PuzzleDefinition, end: number) {
  const { palette, width } = puzzle;
  const random = createRandom(7);
  const stroke: Stroke = {
    between: (min, max) => min + random() * (max - min),
    random,
    steps: [],
    width,
  };
  let time = START_DELAY_MS;
  let cursor = 0;

  for (let color = 1; color < palette.length && time < end; color += 1) {
    time += stroke.between(380, 620);
    stroke.steps.push({ at: time, color });
    const regions = findRegions(puzzle, color);
    while (regions.length > 0 && time < end) {
      ({ cursor, time } = pencil(takeNearest(regions, cursor, width), color, cursor, time, stroke));
    }
  }

  return stroke.steps.filter((step) => step.at <= end);
}

function pencil(region: number[], color: number, cursor: number, start: number, stroke: Stroke) {
  let time = start;
  let previous = cursor;
  for (const index of traceOrder(region, cursor, stroke.width, stroke.random)) {
    time += cellDistance(previous, index, stroke.width) > 1.5 ? stroke.between(80, 180) : stroke.between(16, 34);
    stroke.steps.push({ at: time, color, index });
    previous = index;
  }
  return { cursor: previous, time: time + stroke.between(160, 340) };
}

function findRegions(puzzle: PuzzleDefinition, color: number) {
  const { height, targetPixels, width } = puzzle;
  const seen = new Uint8Array(targetPixels.length);
  const regions: number[][] = [];

  for (let start = 0; start < targetPixels.length; start += 1) {
    if (seen[start] || targetPixels[start] !== color) {
      continue;
    }
    const region: number[] = [];
    const queue = [start];
    seen[start] = 1;
    while (queue.length > 0) {
      const index = queue.pop() as number;
      region.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        const next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !seen[next] && targetPixels[next] === color) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
    regions.push(region);
  }
  return regions;
}

function takeNearest(regions: number[][], cursor: number, width: number) {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  regions.forEach(([first], regionIndex) => {
    const candidate = cellDistance(cursor, first, width);
    if (candidate < bestDistance) {
      best = regionIndex;
      bestDistance = candidate;
    }
  });
  return regions.splice(best, 1)[0];
}

function traceOrder(region: number[], cursor: number, width: number, random: () => number) {
  const remaining = new Set(region);
  const order: number[] = [];
  let current = cursor;
  while (remaining.size > 0) {
    let next = -1;
    let nextDistance = Number.POSITIVE_INFINITY;
    for (const index of remaining) {
      const dx = (index % width) - (current % width);
      const dy = Math.floor(index / width) - Math.floor(current / width);
      const candidate = Math.hypot(dx, dy * 1.4) + random() * 0.9;
      if (candidate < nextDistance) {
        next = index;
        nextDistance = candidate;
      }
    }
    remaining.delete(next);
    order.push(next);
    current = next;
  }
  return order;
}

function cellDistance(first: number, second: number, width: number) {
  return Math.hypot((first % width) - (second % width), Math.floor(first / width) - Math.floor(second / width));
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
