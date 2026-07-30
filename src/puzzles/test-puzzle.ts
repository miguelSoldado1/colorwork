import type { PuzzleDefinition } from "@/coloring/types";

const sourceWidth = 320;
const sourceHeight = 160;
const pixelScale = 2;
const width = sourceWidth / pixelScale;
const height = sourceHeight / pixelScale;
const targetPixels = new Uint8Array(width * height);

function setPixel(x: number, y: number, colorIndex: number) {
  if (x >= 0 && x < sourceWidth && y >= 0 && y < sourceHeight) {
    const targetX = Math.floor(x / pixelScale);
    const targetY = Math.floor(y / pixelScale);
    targetPixels[targetY * width + targetX] = colorIndex;
  }
}

// A prepared panoramic aurora scene rasterized to a 160 × 80 logical pixel grid.
for (let y = 0; y < sourceHeight; y += 1) {
  for (let x = 0; x < sourceWidth; x += 1) {
    const distantRidge = 84 + Math.floor(Math.sin(x / 21) * 11 + Math.sin(x / 46) * 9);
    const nearRidge = 108 + Math.floor(Math.sin((x + 35) / 28) * 12 + Math.sin(x / 12) * 5);

    if (y >= 124) {
      setPixel(x, y, 6);
    } else if (y >= nearRidge) {
      setPixel(x, y, 5);
    } else if (y >= distantRidge) {
      setPixel(x, y, y < distantRidge + 8 ? 4 : 3);
    } else if (y > 52) {
      setPixel(x, y, 1);
    }
  }
}

for (let y = 11; y <= 53; y += 1) {
  for (let x = 227; x <= 269; x += 1) {
    if ((x - 248) ** 2 + (y - 32) ** 2 <= 21 ** 2) {
      setPixel(x, y, 2);
    }
  }
}

for (let x = 0; x < sourceWidth; x += 1) {
  const ribbonY = 27 + Math.floor(Math.sin(x / 24) * 9 + Math.sin(x / 57) * 6);
  const ribbonWidth = 4 + Math.floor((Math.sin(x / 16) + 1) * 1.5);
  for (let y = ribbonY; y < ribbonY + ribbonWidth; y += 1) {
    setPixel(x, y, 7);
  }
}

function drawPine(centerX: number, baseY: number, treeHeight: number) {
  for (let level = 0; level < treeHeight; level += 1) {
    const y = baseY - level;
    const radius = Math.max(1, Math.floor((level / treeHeight) * (treeHeight * 0.22)));
    if (level % 5 < 3) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        setPixel(x, y, 5);
      }
    }
  }
  for (let y = baseY - Math.floor(treeHeight * 0.4); y <= baseY; y += 1) {
    setPixel(centerX, y, 6);
  }
}

for (let treeIndex = 0; treeIndex < 18; treeIndex += 1) {
  const x = 9 + treeIndex * 18;
  const treeHeight = 21 + ((treeIndex * 15) % 29);
  drawPine(x, 143 + ((treeIndex * 6) % 9), treeHeight);
}

export const testPuzzle = {
  height,
  id: "aurora-valley",
  name: "Aurora valley",
  palette: ["#172044", "#29376f", "#f4d477", "#705b86", "#b9ccdc", "#2f6f62", "#12363e", "#62c6a5"],
  targetPixels,
  width,
} satisfies PuzzleDefinition;
