export const DARK_INK = "#14130f";
export const LIGHT_INK = "#f2efe6";

/**
 * Choose the ink that actually contrasts more with a swatch, so palette numbers stay legible on
 * any imported artwork. Comparing measured contrast beats a fixed luminance threshold, which
 * picks the wrong ink on mid-tone colors like a mid orange or a desaturated sage.
 */
export function readableInk(swatchHex: string) {
  const swatch = relativeLuminance(swatchHex);
  const onDark = contrastRatio(swatch, relativeLuminance(DARK_INK));
  const onLight = contrastRatio(swatch, relativeLuminance(LIGHT_INK));
  return onDark >= onLight ? DARK_INK : LIGHT_INK;
}

export function relativeLuminance(hex: string) {
  const [red, green, blue] = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(a: number, b: number) {
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}
