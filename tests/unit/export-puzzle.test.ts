import { describe, expect, it } from "vitest";
import { createPuzzleModuleSource } from "../../src/coloring/export-puzzle";

describe("createPuzzleModuleSource", () => {
  it("creates a ready-to-drop module using the existing compact puzzle format", () => {
    const targetPixels = Uint8Array.from({ length: 101 }, (_, index) => index % 3);
    const source = createPuzzleModuleSource({
      height: 101,
      id: "sunset-scene-abc123",
      name: "Sunset scene",
      palette: ["#112233", "#445566", "#778899"],
      targetPixels,
      width: 1,
    });

    expect(source).toContain('import type { PuzzleDefinition } from "@/coloring/types";');
    expect(source).toContain("export default {");
    expect(source).toContain('  id: "sunset-scene-abc123",');
    expect(source).toContain('  name: "Sunset scene",');
    expect(source).toContain('import { decodePixels } from "./decode-pixels";');
    expect(source).not.toContain("function decodePixels(value: string)");

    const encodedPixels = [...source.matchAll(/^ {2}"([A-Za-z0-9+/=]+)",$/gm)].map(([, line]) => line).join("");
    const decodedPixels = Uint8Array.from(atob(encodedPixels), (character) => character.charCodeAt(0));

    expect(decodedPixels).toEqual(targetPixels);
  });

  it("uses a default export regardless of the puzzle name", () => {
    const source = createPuzzleModuleSource({
      height: 1,
      id: "custom-puzzle-abc123",
      name: "🌈",
      palette: ["#000000"],
      targetPixels: new Uint8Array([0]),
      width: 1,
    });

    expect(source).toContain("export default {");
  });
});
