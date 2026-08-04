import { getCanvasContext, mutedTargetGray, parseHexColor, writePaintedPixel } from "@/coloring/pixel-raster";
import type { PuzzleDefinition } from "@/coloring/types";

interface PreviewFrame {
  height: number;
  width: number;
}

interface RenderLevelPreviewOptions {
  canvas: HTMLCanvasElement;
  colored: boolean;
  frame: PreviewFrame;
  puzzle: PuzzleDefinition;
}

interface ArtworkLayers {
  colored?: HTMLCanvasElement;
  muted?: HTMLCanvasElement;
}

const artworkLayers = new WeakMap<PuzzleDefinition, ArtworkLayers>();

/** Whole pixels once the artwork is upscaled, so a caller can size a frame the render will fill exactly. */
export function fitCellSize(puzzle: PuzzleDefinition, frame: PreviewFrame) {
  const scale = Math.min(frame.width / puzzle.width, frame.height / puzzle.height);
  return scale >= 1 ? Math.floor(scale) : scale;
}

export function renderLevelPreview({ canvas, colored, frame, puzzle }: RenderLevelPreviewOptions) {
  const cellSize = fitCellSize(puzzle, frame);
  if (cellSize <= 0) {
    return;
  }

  const width = cellSize * puzzle.width;
  const height = cellSize * puzzle.height;
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.objectFit = "cover";
  canvas.style.objectPosition = "center";
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const context = getCanvasContext(canvas, { alpha: false });
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Upscaled pixel art has to stay hard-edged; a thumbnail smaller than its artwork needs averaging.
  context.imageSmoothingEnabled = cellSize < 1;
  context.drawImage(getArtworkLayer(puzzle, colored), 0, 0, width, height);
}

function getArtworkLayer(puzzle: PuzzleDefinition, colored: boolean) {
  const layers = artworkLayers.get(puzzle);
  const cached = colored ? layers?.colored : layers?.muted;
  if (cached) {
    return cached;
  }

  const layer = document.createElement("canvas");
  layer.width = puzzle.width;
  layer.height = puzzle.height;

  const context = getCanvasContext(layer);
  const image = context.createImageData(puzzle.width, puzzle.height);
  const paletteRgba = puzzle.palette.map(parseHexColor);

  for (let index = 0; index < puzzle.targetPixels.length; index += 1) {
    const color = paletteRgba[puzzle.targetPixels[index]];
    if (colored) {
      writePaintedPixel(image.data, index, color);
      continue;
    }
    const gray = mutedTargetGray(color);
    writePaintedPixel(image.data, index, [gray, gray, gray, 255]);
  }

  context.putImageData(image, 0, 0);
  const nextLayers = layers ?? {};
  if (colored) {
    nextLayers.colored = layer;
  } else {
    nextLayers.muted = layer;
  }
  artworkLayers.set(puzzle, nextLayers);
  return layer;
}
