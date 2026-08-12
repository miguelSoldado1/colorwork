export const DEFAULT_ARTWORK_NAME = "Custom puzzle";
export const MAX_ARTWORK_NAME_LENGTH = 60;

export function normalizeArtworkName(name: string) {
  return name.trim() || DEFAULT_ARTWORK_NAME;
}

export function constrainArtworkName(name: string) {
  const normalized = normalizeArtworkName(name);
  return normalized.slice(0, MAX_ARTWORK_NAME_LENGTH).trimEnd() || DEFAULT_ARTWORK_NAME;
}

export function isArtworkNameWithinLimit(name: string) {
  return name.length <= MAX_ARTWORK_NAME_LENGTH;
}
