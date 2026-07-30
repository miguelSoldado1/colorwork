const GLYPH_WIDTH = 3;
const GLYPH_HEIGHT = 5;
const GLYPH_GAP = 1;
const ATLAS_GAP = 1;

// Immutable 3x5 source glyphs keep number shapes independent of browser fonts.
// Each string describes one row of a digit, from left to right.
const DIGIT_GLYPHS = Object.freeze([
  Object.freeze(["111", "101", "101", "101", "111"]),
  Object.freeze(["010", "110", "010", "010", "111"]),
  Object.freeze(["111", "001", "111", "100", "111"]),
  Object.freeze(["111", "001", "111", "001", "111"]),
  Object.freeze(["101", "101", "111", "001", "001"]),
  Object.freeze(["111", "100", "111", "001", "111"]),
  Object.freeze(["111", "100", "111", "101", "111"]),
  Object.freeze(["111", "001", "001", "001", "001"]),
  Object.freeze(["111", "101", "111", "101", "111"]),
  Object.freeze(["111", "101", "111", "001", "111"]),
]);

interface NumberGlyphSprite {
  height: number;
  selectedY: number;
  unselectedY: number;
  width: number;
  x: number;
}

interface NumberGlyphAtlas {
  canvas: HTMLCanvasElement;
  sprites: readonly NumberGlyphSprite[];
}

interface NumberGlyphColors {
  selected: string;
  unselected: string;
}

// Cache every palette label and semantic color variant in one compact offscreen atlas.
export function createNumberGlyphAtlas(labelCount: number, colors: NumberGlyphColors): NumberGlyphAtlas {
  const labels = Array.from({ length: labelCount }, (_, index) => String(index + 1));
  const widths = labels.map(getLabelWidth);
  const canvas = document.createElement("canvas");
  canvas.width = widths.reduce((width, labelWidth) => width + labelWidth + ATLAS_GAP, ATLAS_GAP);
  canvas.height = GLYPH_HEIGHT * 2 + ATLAS_GAP * 3;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D is not available in this browser.");
  }

  context.imageSmoothingEnabled = false;
  const unselectedY = ATLAS_GAP;
  const selectedY = GLYPH_HEIGHT + ATLAS_GAP * 2;
  const sprites: NumberGlyphSprite[] = [];
  let x = ATLAS_GAP;

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const width = widths[index];
    drawLabel(context, label, x, unselectedY, colors.unselected);
    drawLabel(context, label, x, selectedY, colors.selected);
    sprites.push({ height: GLYPH_HEIGHT, selectedY, unselectedY, width, x });
    x += width + ATLAS_GAP;
  }

  return { canvas, sprites };
}

// Multi-digit labels share a fixed one-pixel gap so their proportions remain predictable.
function getLabelWidth(label: string) {
  return label.length * GLYPH_WIDTH + (label.length - 1) * GLYPH_GAP;
}

// Rasterize source glyphs once; board frames only need to scale cached sprite rectangles.
function drawLabel(context: CanvasRenderingContext2D, label: string, x: number, y: number, color: string) {
  context.fillStyle = color;
  for (let characterIndex = 0; characterIndex < label.length; characterIndex += 1) {
    const glyph = DIGIT_GLYPHS[Number(label[characterIndex])];
    const glyphX = x + characterIndex * (GLYPH_WIDTH + GLYPH_GAP);
    for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
      const rowPixels = glyph[row];
      for (let column = 0; column < GLYPH_WIDTH; column += 1) {
        if (rowPixels[column] === "1") {
          context.fillRect(glyphX + column, y + row, 1, 1);
        }
      }
    }
  }
}
