const STORAGE_KEY = "color-byte:last-painted-artwork:v1";

export function loadLastPaintedArtworkId() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    // Some privacy modes expose localStorage but throw when it is accessed.
  }
}

export function saveLastPaintedArtworkId(artworkId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, artworkId);
  } catch {
    // Without storage the menu keeps its default selection.
  }
}
