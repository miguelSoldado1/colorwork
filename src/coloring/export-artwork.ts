import { createSimplifiedPuzzleId } from "@/coloring/export-puzzle";
import { getCanvasContext, parseHexColor, writePaintedPixel } from "@/coloring/pixel-raster";
import type { PuzzleDefinition } from "@/coloring/types";

const EXPORT_LONG_SIDE = 1024;

export function createArtworkExportSize(puzzle: Pick<PuzzleDefinition, "height" | "width">) {
  const longSide = Math.max(puzzle.width, puzzle.height);
  const scale = Math.max(1, Math.floor(EXPORT_LONG_SIDE / longSide));

  return {
    height: puzzle.height * scale,
    scale,
    width: puzzle.width * scale,
  };
}

export function renderArtworkForExport(puzzle: PuzzleDefinition) {
  const source = document.createElement("canvas");
  source.width = puzzle.width;
  source.height = puzzle.height;

  const sourceContext = getCanvasContext(source, { alpha: false });
  const image = sourceContext.createImageData(puzzle.width, puzzle.height);
  const paletteRgba = puzzle.palette.map(parseHexColor);

  for (let index = 0; index < puzzle.targetPixels.length; index += 1) {
    writePaintedPixel(image.data, index, paletteRgba[puzzle.targetPixels[index]]);
  }
  sourceContext.putImageData(image, 0, 0);

  const size = createArtworkExportSize(puzzle);
  const output = document.createElement("canvas");
  output.width = size.width;
  output.height = size.height;

  const outputContext = getCanvasContext(output, { alpha: false });
  outputContext.imageSmoothingEnabled = false;
  outputContext.drawImage(source, 0, 0, size.width, size.height);
  return output;
}

export function downloadPuzzleArtwork(puzzle: PuzzleDefinition, name = puzzle.name) {
  const link = document.createElement("a");
  link.download = `${createSimplifiedPuzzleId(name)}.png`;
  link.href = renderArtworkForExport(puzzle).toDataURL("image/png");
  document.body.append(link);
  link.click();
  link.remove();
}
