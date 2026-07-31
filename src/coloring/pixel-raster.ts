export type PixelRgba = readonly [number, number, number, number];

export function getCanvasContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings) {
  const context = canvas.getContext("2d", options);
  if (!context) {
    throw new Error("Canvas 2D is not available in this browser.");
  }
  return context;
}

export function parseHexColor(color: string): PixelRgba {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
    255,
  ];
}

export function writePaintedPixel(data: Uint8ClampedArray, pixelIndex: number, [red, green, blue, alpha]: PixelRgba) {
  const offset = pixelIndex * 4;
  data[offset] = red;
  data[offset + 1] = green;
  data[offset + 2] = blue;
  data[offset + 3] = alpha;
}

export function mutedTargetGray([red, green, blue]: PixelRgba) {
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  return Math.round(52 + luminance * 0.35);
}

export function readThemeColor(element: Element, variable: string) {
  return getComputedStyle(element).getPropertyValue(variable).trim();
}
