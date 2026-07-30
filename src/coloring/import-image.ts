import type { PuzzleDefinition } from "./types";

const DEFAULT_GRID_LIMIT = 256;
const TRANSPARENT_PIXEL_COLOR = "#11141e";
const MAX_INDEXED_COLORS = 255;
const FILE_EXTENSION_PATTERN = /\.[^.]+$/;
const FILE_NAME_SEPARATOR_PATTERN = /[-_]+/g;
const PUZZLE_ID_CHARACTER_PATTERN = /[^a-z0-9]+/g;
const PUZZLE_ID_EDGE_PATTERN = /^-|-$/g;

interface WeightedColor {
  blue: number;
  count: number;
  green: number;
  red: number;
}

interface ColorBucket {
  colors: WeightedColor[];
  population: number;
}

interface QuantizedPalette {
  colorIndexes: Map<number, number>;
  colors: WeightedColor[];
}

export interface ImageImportSource {
  bitmap: ImageBitmap;
  detectedColorCount: number;
  fileName: string;
  height: number;
  width: number;
}

export interface ImageImportOptions {
  height: number;
  name: string;
  paletteSize: number;
  width: number;
}

export interface IndexedPixelData {
  palette: string[];
  targetPixels: Uint8Array;
}

// Import defaults and source metadata.
export function getRecommendedGridSize(sourceWidth: number, sourceHeight: number) {
  const scale = Math.min(1, DEFAULT_GRID_LIMIT / Math.max(sourceWidth, sourceHeight));

  return {
    height: Math.max(1, Math.round(sourceHeight * scale)),
    width: Math.max(1, Math.round(sourceWidth * scale)),
  };
}

export function getImportName(fileName: string) {
  const name = fileName.replace(FILE_EXTENSION_PATTERN, "").replaceAll(FILE_NAME_SEPARATOR_PATTERN, " ").trim();
  if (!name) {
    return "Custom puzzle";
  }

  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function countRenderedImageColors(bitmap: ImageBitmap, width: number, height: number) {
  const data = renderImage(bitmap, width, height);
  return countPixelColors(data);
}

// Rasterize the source and turn its colors into a canvas-ready puzzle definition.
export function createPuzzleFromImage(source: ImageImportSource, options: ImageImportOptions): PuzzleDefinition {
  const data = renderImage(source.bitmap, options.width, options.height);
  const indexedPixels = createIndexedPixelData(data, options.paletteSize);

  return {
    height: options.height,
    id: createPuzzleId(options.name),
    name: options.name.trim() || "Custom puzzle",
    ...indexedPixels,
    width: options.width,
  };
}

export function createIndexedPixelData(data: Uint8ClampedArray, paletteSize: number): IndexedPixelData {
  validatePixelData(data);
  if (!(Number.isInteger(paletteSize) && paletteSize >= 1 && paletteSize <= MAX_INDEXED_COLORS)) {
    throw new RangeError(`Palette size must be an integer between 1 and ${MAX_INDEXED_COLORS}.`);
  }

  const colors = collectColors(data);
  // Preserve exact source colors until the requested palette is smaller than the source palette.
  const quantizedPalette = colors.length <= paletteSize ? undefined : createQuantizedPalette(colors, paletteSize);
  const paletteColors = quantizedPalette?.colors ?? colors.toSorted((left, right) => right.count - left.count);
  const targetPixels = mapPixelsToPalette(data, paletteColors, quantizedPalette?.colorIndexes);

  return {
    palette: paletteColors.map(toHexColor),
    targetPixels,
  };
}

export function countPixelColors(data: Uint8ClampedArray) {
  validatePixelData(data);
  return collectColors(data).length;
}

// Render at the logical grid size with crisp sampling and a paintable color behind transparency.
function renderImage(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("This browser could not prepare the image.");
  }

  context.fillStyle = TRANSPARENT_PIXEL_COLOR;
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0, width, height);

  return context.getImageData(0, 0, width, height).data;
}

function collectColors(data: Uint8ClampedArray) {
  const counts = new Map<number, number>();

  for (let index = 0; index < data.length; index += 4) {
    const key = toColorKey(data[index], data[index + 1], data[index + 2]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([key, count]) => ({
    blue: key % 256,
    count,
    green: Math.floor(key / 256) % 256,
    red: Math.floor(key / 65_536),
  }));
}

// Median-cut quantization repeatedly splits the most varied, populous color bucket.
function createQuantizedPalette(colors: WeightedColor[], paletteSize: number) {
  const buckets: ColorBucket[] = [{ colors, population: sumPopulation(colors) }];

  while (buckets.length < paletteSize) {
    let splitIndex = -1;
    let splitScore = -1;

    for (let index = 0; index < buckets.length; index += 1) {
      const bucket = buckets[index];
      if (bucket.colors.length < 2) {
        continue;
      }

      const range = getColorRange(bucket.colors);
      const score = Math.max(range.red, range.green, range.blue) * bucket.population;
      if (score > splitScore) {
        splitIndex = index;
        splitScore = score;
      }
    }

    if (splitIndex < 0) {
      break;
    }

    // Favor buckets whose color range affects the largest number of pixels.
    const [bucket] = buckets.splice(splitIndex, 1);
    buckets.push(...splitBucket(bucket));
  }

  const sortedBuckets = buckets.toSorted((left, right) => right.population - left.population);
  const colorIndexes = new Map<number, number>();

  for (let paletteIndex = 0; paletteIndex < sortedBuckets.length; paletteIndex += 1) {
    for (const color of sortedBuckets[paletteIndex].colors) {
      colorIndexes.set(toColorKey(color.red, color.green, color.blue), paletteIndex);
    }
  }

  return {
    colorIndexes,
    colors: sortedBuckets.map(averageBucket),
  } satisfies QuantizedPalette;
}

function getColorRange(colors: WeightedColor[]) {
  let minimumRed = 255;
  let minimumGreen = 255;
  let minimumBlue = 255;
  let maximumRed = 0;
  let maximumGreen = 0;
  let maximumBlue = 0;

  for (const color of colors) {
    minimumRed = Math.min(minimumRed, color.red);
    minimumGreen = Math.min(minimumGreen, color.green);
    minimumBlue = Math.min(minimumBlue, color.blue);
    maximumRed = Math.max(maximumRed, color.red);
    maximumGreen = Math.max(maximumGreen, color.green);
    maximumBlue = Math.max(maximumBlue, color.blue);
  }

  return {
    blue: maximumBlue - minimumBlue,
    green: maximumGreen - minimumGreen,
    red: maximumRed - minimumRed,
  };
}

function splitBucket(bucket: ColorBucket): [ColorBucket, ColorBucket] {
  const range = getColorRange(bucket.colors);
  let channel: "blue" | "green" | "red" = "blue";
  if (range.red >= range.green && range.red >= range.blue) {
    channel = "red";
  } else if (range.green >= range.blue) {
    channel = "green";
  }

  // Split near the population midpoint while keeping at least one color on each side.
  const sortedColors = bucket.colors.toSorted((firstColor, secondColor) => firstColor[channel] - secondColor[channel]);
  const midpoint = bucket.population / 2;
  let population = sortedColors[0].count;
  let splitAt = 1;

  while (splitAt < sortedColors.length - 1 && population < midpoint) {
    population += sortedColors[splitAt].count;
    splitAt += 1;
  }

  const left = sortedColors.slice(0, splitAt);
  const right = sortedColors.slice(splitAt);
  return [
    { colors: left, population: sumPopulation(left) },
    { colors: right, population: sumPopulation(right) },
  ];
}

function averageBucket(bucket: ColorBucket): WeightedColor {
  let red = 0;
  let green = 0;
  let blue = 0;

  for (const color of bucket.colors) {
    red += color.red * color.count;
    green += color.green * color.count;
    blue += color.blue * color.count;
  }

  return {
    blue: Math.round(blue / bucket.population),
    count: bucket.population,
    green: Math.round(green / bucket.population),
    red: Math.round(red / bucket.population),
  };
}

// Cache each source color's nearest palette match while producing the row-major pixel array.
function mapPixelsToPalette(
  data: Uint8ClampedArray,
  palette: WeightedColor[],
  colorIndexes = new Map<number, number>()
) {
  const targetPixels = new Uint8Array(data.length / 4);

  for (let pixelIndex = 0, dataIndex = 0; dataIndex < data.length; pixelIndex += 1, dataIndex += 4) {
    const red = data[dataIndex];
    const green = data[dataIndex + 1];
    const blue = data[dataIndex + 2];
    const key = toColorKey(red, green, blue);
    let closestIndex = colorIndexes.get(key);

    if (closestIndex === undefined) {
      let closestDistance = Number.POSITIVE_INFINITY;
      closestIndex = 0;

      for (let paletteIndex = 0; paletteIndex < palette.length; paletteIndex += 1) {
        const color = palette[paletteIndex];
        const redDistance = red - color.red;
        const greenDistance = green - color.green;
        const blueDistance = blue - color.blue;
        const distance = redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = paletteIndex;
        }
      }

      colorIndexes.set(key, closestIndex);
    }

    targetPixels[pixelIndex] = closestIndex;
  }

  return targetPixels;
}

function toColorKey(red: number, green: number, blue: number) {
  return red * 65_536 + green * 256 + blue;
}

function sumPopulation(colors: WeightedColor[]) {
  let population = 0;
  for (const color of colors) {
    population += color.count;
  }
  return population;
}

function toHexColor(color: WeightedColor) {
  return `#${color.red.toString(16).padStart(2, "0")}${color.green
    .toString(16)
    .padStart(2, "0")}${color.blue.toString(16).padStart(2, "0")}`;
}

function createPuzzleId(name: string) {
  const slug = name.toLowerCase().replaceAll(PUZZLE_ID_CHARACTER_PATTERN, "-").replace(PUZZLE_ID_EDGE_PATTERN, "");
  return `${slug || "custom-puzzle"}-${Date.now().toString(36)}`;
}

function validatePixelData(data: Uint8ClampedArray) {
  if (data.length === 0 || data.length % 4 !== 0) {
    throw new RangeError("Pixel data must contain one or more complete RGBA pixels.");
  }
}
