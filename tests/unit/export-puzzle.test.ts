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
    expect(source).toContain("export const sunsetScenePuzzle = {");
    expect(source).toContain('  id: "sunset-scene-abc123",');
    expect(source).toContain('  name: "Sunset scene",');
    expect(source).toContain("function decodePixels(value: string)");

    const encodedPixels = [...source.matchAll(/^ {2}"([A-Za-z0-9+/=]+)",$/gm)].map(([, line]) => line).join("");
    const decodedPixels = Uint8Array.from(atob(encodedPixels), (character) => character.charCodeAt(0));

    expect(decodedPixels).toEqual(targetPixels);
  });

  it("falls back to a valid export name for names without identifier characters", () => {
    const source = createPuzzleModuleSource({
      height: 1,
      id: "custom-puzzle-abc123",
      name: "🌈",
      palette: ["#000000"],
      targetPixels: new Uint8Array([0]),
      width: 1,
    });

    expect(source).toContain("export const customPuzzle = {");
  });

  it("prefixes names that begin with a number so the export remains valid TypeScript", () => {
    const source = createPuzzleModuleSource({
      height: 1,
      id: "123-puzzle-abc123",
      name: "123 scene",
      palette: ["#000000"],
      targetPixels: new Uint8Array([0]),
      width: 1,
    });

    expect(source).toContain("export const puzzle123ScenePuzzle = {");
  });
});
