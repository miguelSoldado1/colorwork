import { useEffect, useRef } from "react";
import { getCanvasContext, mutedTargetGray, parseHexColor, readThemeColor } from "@/coloring/pixel-raster";
import type { PuzzleDefinition } from "@/coloring/types";

interface PaintingDemoProps {
  duration: number;
  puzzle: PuzzleDefinition;
}

const START_DELAY_MS = 400;
const GUIDE_ALPHA = 0.42;
const SELECTION_ALPHA = 0.3;
const MIN_GRID_CELL_SIZE = 8;

export function PaintingDemo({ duration, puzzle }: PaintingDemoProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!(frame && canvas)) {
      return;
    }

    const theme = {
      foreground: readThemeColor(canvas, "--color-foreground"),
      muted: readThemeColor(canvas, "--color-muted"),
      primary: readThemeColor(canvas, "--color-primary"),
    };

    const { height, palette, targetPixels, width } = puzzle;

    const grays = palette.map((hex) => {
      const gray = mutedTargetGray(parseHexColor(hex));
      return `rgb(${gray} ${gray} ${gray})`;
    });
    const plan = planPainting(puzzle, START_DELAY_MS + duration);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cellSize = 0;
    let frameId: number | undefined;
    let startTime: number | undefined;

    const observer = new ResizeObserver(([entry]) => {
      cellSize = Math.max(1, Math.floor(entry.contentRect.width / width));
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${cellSize * width}px`;
      canvas.style.height = `${cellSize * height}px`;
      canvas.width = Math.round(cellSize * width * dpr);
      canvas.height = Math.round(cellSize * height * dpr);
      schedule();
    });
    observer.observe(frame);

    return () => {
      observer.disconnect();
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };

    function schedule() {
      if (frameId === undefined) {
        frameId = requestAnimationFrame(draw);
      }
    }

    function draw(now: number) {
      frameId = undefined;
      startTime ??= now;
      const elapsed = reducedMotion ? plan.end : Math.min(plan.end, now - startTime);
      const context = getCanvasContext(canvas as HTMLCanvasElement, { alpha: false });
      const dpr = (canvas as HTMLCanvasElement).width / Math.max(1, cellSize * width);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
      context.fillStyle = theme.muted;
      context.fillRect(0, 0, cellSize * width, cellSize * height);

      let unpainted = 0;
      for (const time of plan.times) {
        if (time > elapsed) {
          unpainted += 1;
        }
      }
      const selected = plan.selectedAt(elapsed);

      context.globalAlpha = GUIDE_ALPHA * (unpainted / plan.times.length);
      forEachCell((index, left, top) => {
        context.fillStyle = grays[targetPixels[index]];
        context.fillRect(left, top, cellSize, cellSize);
      });
      context.globalAlpha = SELECTION_ALPHA;
      context.fillStyle = theme.primary;
      forEachCell((index, left, top) => {
        if (targetPixels[index] === selected && plan.times[index] > elapsed) {
          context.fillRect(left, top, cellSize, cellSize);
        }
      });
      context.globalAlpha = 1;

      if (cellSize >= MIN_GRID_CELL_SIZE) {
        drawGrid(context);
      }

      forEachCell((index, left, top) => {
        if (plan.times[index] <= elapsed) {
          context.fillStyle = palette[targetPixels[index]];
          context.fillRect(left, top, cellSize, cellSize);
        }
      });

      if (elapsed < plan.end) {
        schedule();
      }
    }

    function forEachCell(callback: (index: number, left: number, top: number) => void) {
      for (let index = 0; index < targetPixels.length; index += 1) {
        callback(index, (index % width) * cellSize, Math.floor(index / width) * cellSize);
      }
    }

    function drawGrid(context: CanvasRenderingContext2D) {
      context.beginPath();
      context.strokeStyle = theme.foreground;
      context.globalAlpha = 0.12;
      context.lineWidth = 1;
      for (let column = 0; column <= width; column += 1) {
        context.moveTo(column * cellSize + 0.5, 0);
        context.lineTo(column * cellSize + 0.5, height * cellSize);
      }
      for (let row = 0; row <= height; row += 1) {
        context.moveTo(0, row * cellSize + 0.5);
        context.lineTo(width * cellSize, row * cellSize + 0.5);
      }
      context.stroke();
      context.globalAlpha = 1;
    }
  }, [duration, puzzle]);

  return (
    <div className="grid w-full place-items-center" ref={frameRef}>
      <canvas
        aria-hidden
        className="block bg-canvas shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] ring-1 ring-border [image-rendering:pixelated]"
        ref={canvasRef}
      />
    </div>
  );
}

interface Stroke {
  between: (min: number, max: number) => number;
  random: () => number;
  times: Float64Array;
  width: number;
}

function planPainting(puzzle: PuzzleDefinition, end: number) {
  const { palette, targetPixels, width } = puzzle;
  const random = createRandom(7);
  const stroke: Stroke = {
    between: (min, max) => min + random() * (max - min),
    random,
    times: new Float64Array(targetPixels.length).fill(Number.POSITIVE_INFINITY),
    width,
  };
  const colorStarts: number[] = [];
  let time = START_DELAY_MS;
  let cursor = 0;

  targetPixels.forEach((color, index) => {
    if (color === 0) {
      stroke.times[index] = 0;
    }
  });

  for (let color = 1; color < palette.length && time < end; color += 1) {
    time += stroke.between(380, 620);
    colorStarts.push(time);
    const regions = findRegions(puzzle, color);
    while (regions.length > 0 && time < end) {
      ({ cursor, time } = pencil(takeNearest(regions, cursor, width), cursor, time, stroke));
    }
  }

  return {
    end,
    selectedAt: (elapsed: number) =>
      Math.max(
        0,
        colorStarts.findLastIndex((start) => start <= elapsed)
      ) + 1,
    times: stroke.times,
  };
}

function pencil(region: number[], cursor: number, start: number, stroke: Stroke) {
  let time = start;
  let previous = cursor;
  for (const index of traceOrder(region, cursor, stroke.width, stroke.random)) {
    time += cellDistance(previous, index, stroke.width) > 1.5 ? stroke.between(80, 180) : stroke.between(16, 34);
    stroke.times[index] = time;
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
