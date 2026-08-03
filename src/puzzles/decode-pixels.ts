export function decodePixels(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
