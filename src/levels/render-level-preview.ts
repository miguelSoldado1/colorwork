import { createNumberGlyphAtlas } from "@/coloring/number-glyphs";
import {
  getCanvasContext,
  mutedTargetGray,
  parseHexColor,
  readThemeColor,
  writePaintedPixel,
} from "@/coloring/pixel-raster";
import type { PuzzleDefinition } from "@/coloring/types";

interface PreviewFrame {
  height: number;
  width: number;
}

interface RenderLevelPreviewOptions {
  canvas: HTMLCanvasElement;
  colored: boolean;
  frame: PreviewFrame;
  numbers: boolean;
  puzzle: PuzzleDefinition;
}

interface PreviewLayerOptions {
  canvas: HTMLCanvasElement;
  cellSize: number;
  context: CanvasRenderingContext2D;
  puzzle: PuzzleDefinition;
}

const NUMBER_MIN_CELL_SIZE = 13;
const GLYPH_CELL_DIVISOR = 7;

interface ArtworkLayers {
  colored?: HTMLCanvasElement;
  muted?: HTMLCanvasElement;
}

const artworkLayers = new WeakMap<PuzzleDefinition, ArtworkLayers>();
const glyphAtlases = new Map<string, ReturnType<typeof createNumberGlyphAtlas>>();

/** Whole pixels once the artwork is upscaled, so a caller can size a frame the render will fill exactly. */
export function fitCellSize(puzzle: PuzzleDefinition, frame: PreviewFrame) {
  const scale = Math.min(frame.width / puzzle.width, frame.height / puzzle.height);
  return scale >= 1 ? Math.floor(scale) : scale;
}

export function renderLevelPreview({ canvas, colored, frame, numbers, puzzle }: RenderLevelPreviewOptions) {
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

  if (colored) {
    return;
  }

  const layer = { canvas, cellSize, context, puzzle };
  if (numbers && cellSize >= NUMBER_MIN_CELL_SIZE) {
    drawNumbers(layer);
  }
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

function drawNumbers({ canvas, cellSize, context, puzzle }: PreviewLayerOptions) {
  const atlas = getGlyphAtlas(puzzle.palette.length, readThemeColor(canvas, "--color-muted-foreground"));
  const scale = Math.max(1, Math.floor(cellSize / GLYPH_CELL_DIVISOR));

  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      const sprite = atlas.sprites[puzzle.targetPixels[y * puzzle.width + x]];
      const spriteWidth = sprite.width * scale;
      const spriteHeight = sprite.height * scale;
      context.drawImage(
        atlas.canvas,
        sprite.x,
        sprite.unselectedY,
        sprite.width,
        sprite.height,
        Math.round(x * cellSize + (cellSize - spriteWidth) / 2),
        Math.round(y * cellSize + (cellSize - spriteHeight) / 2),
        spriteWidth,
        spriteHeight
      );
    }
  }
}

/** Palettes repeat across the catalog, so rasterize each label set once per color. */
function getGlyphAtlas(labelCount: number, color: string) {
  const key = `${labelCount}|${color}`;
  const cached = glyphAtlases.get(key);
  if (cached) {
    return cached;
  }

  const atlas = createNumberGlyphAtlas(labelCount, { selected: color, unselected: color });
  glyphAtlases.set(key, atlas);
  return atlas;
}
