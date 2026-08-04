import { afterEach, describe, expect, it, vi } from "vitest";
import { renderLevelPreview } from "../../src/levels/render-level-preview";
import type { PuzzleDefinition } from "../../src/coloring/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("renderLevelPreview", () => {
  it("rasterizes each colored state once per puzzle identity", () => {
    const harness = createCanvasHarness();
    const puzzle = createPuzzle();
    const options = {
      canvas: harness.canvas,
      frame: { height: 20, width: 20 },
      puzzle,
    };

    renderLevelPreview({ ...options, colored: false });
    renderLevelPreview({ ...options, colored: false });
    renderLevelPreview({ ...options, colored: true });
    renderLevelPreview({ ...options, colored: true });

    expect(harness.createdLayers).toHaveLength(2);
    expect(harness.rasterizations).toBe(2);

    renderLevelPreview({ ...options, colored: true, puzzle: createPuzzle() });

    expect(harness.createdLayers).toHaveLength(3);
    expect(harness.rasterizations).toBe(3);
  });
});

function createPuzzle() {
  return {
    height: 2,
    id: "preview-cache",
    name: "Preview cache",
    palette: ["#102030", "#abcdef"],
    targetPixels: new Uint8Array([0, 1, 1, 0]),
    width: 2,
  } satisfies PuzzleDefinition;
}

function createCanvasHarness() {
  let rasterizations = 0;
  const createdLayers: Array<{ height: number; width: number }> = [];
  const outputContext = {
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
    setTransform: vi.fn(),
  };
  const canvas = {
    getContext: () => outputContext,
    height: 0,
    style: {},
    width: 0,
  } as unknown as HTMLCanvasElement;

  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal("document", {
    createElement: () => {
      const layer = {
        getContext: () => ({
          createImageData: (width: number, height: number) => ({
            data: new Uint8ClampedArray(width * height * 4),
          }),
          putImageData: () => {
            rasterizations += 1;
          },
        }),
        height: 0,
        width: 0,
      };
      createdLayers.push(layer);
      return layer;
    },
  });

  return {
    canvas,
    createdLayers,
    get rasterizations() {
      return rasterizations;
    },
  };
}
