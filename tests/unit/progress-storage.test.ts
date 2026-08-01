import { afterEach, describe, expect, it, vi } from "vitest";
import { createPuzzleProgress } from "../../src/coloring/progress";
import {
  clearPuzzleProgress,
  createProgressSaveController,
  loadPuzzleProgress,
  savePuzzleProgress,
} from "../../src/coloring/progress-storage";
import type { PuzzleDefinition } from "../../src/coloring/types";

const puzzle = {
  height: 2,
  id: "stored-puzzle",
  name: "Stored puzzle",
  palette: ["#111111", "#eeeeee"],
  targetPixels: new Uint8Array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]),
  width: 5,
} satisfies PuzzleDefinition;

class MemoryStorage {
  readonly values = new Map<string, string>();
  failWrites: boolean;
  writeAttempts = 0;

  constructor() {
    this.failWrites = false;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.writeAttempts += 1;
    if (this.failWrites) {
      throw new DOMException("Storage is unavailable", "QuotaExceededError");
    }
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("puzzle progress storage", () => {
  it("round-trips painted cells and reconstructs their target colors and counts", () => {
    const storage = new MemoryStorage();
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0, 3, 9]);

    expect(savePuzzleProgress(puzzle, progress, storage)).toBe(true);
    expect(loadPuzzleProgress(puzzle, storage)).toEqual(progress);
  });

  it("stores one compact bit per cell instead of the painted pixel array", () => {
    const storage = new MemoryStorage();
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0, 9]);

    savePuzzleProgress(puzzle, progress, storage);

    const [serialized] = storage.values.values();
    const record = JSON.parse(serialized) as { paintedCells: string };
    expect(atob(record.paintedCells)).toHaveLength(2);
    expect(serialized).not.toContain("paintedByColor");
    expect(serialized).not.toContain("paintedCount");
  });

  it("ignores progress after the immutable puzzle definition changes", () => {
    const storage = new MemoryStorage();
    savePuzzleProgress(puzzle, createPuzzleProgress(puzzle), storage);
    const changedTarget = puzzle.targetPixels.slice();
    changedTarget[0] = 1;

    expect(loadPuzzleProgress({ ...puzzle, targetPixels: changedTarget }, storage)).toBeUndefined();
  });

  it("ignores malformed records and bitsets with the wrong length", () => {
    const storage = new MemoryStorage();
    savePuzzleProgress(puzzle, createPuzzleProgress(puzzle), storage);
    const [key] = storage.values.keys();
    const record = JSON.parse(storage.getItem(key) ?? "{}") as { paintedCells: string };
    storage.values.set(key, JSON.stringify({ ...record, paintedCells: btoa("\0") }));

    expect(loadPuzzleProgress(puzzle, storage)).toBeUndefined();
  });

  it("clears a stored puzzle and leaves other puzzles alone", () => {
    const storage = new MemoryStorage();
    const other = { ...puzzle, id: "other-puzzle" };
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0, 3]);
    savePuzzleProgress(puzzle, progress, storage);
    savePuzzleProgress(other, progress, storage);

    expect(clearPuzzleProgress(puzzle, storage)).toBe(true);
    expect(loadPuzzleProgress(puzzle, storage)).toBeUndefined();
    expect(loadPuzzleProgress(other, storage)).toEqual(progress);
  });

  it("treats clearing an untouched puzzle as a success", () => {
    expect(clearPuzzleProgress(puzzle, new MemoryStorage())).toBe(true);
  });
});

describe("progress save controller", () => {
  it("debounces writes and reports the save lifecycle", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      storage,
    });

    controller.schedule(createPuzzleProgress(puzzle), false);
    vi.advanceTimersByTime(749);
    expect(storage.writeAttempts).toBe(0);

    vi.advanceTimersByTime(1);
    expect(storage.writeAttempts).toBe(1);
    expect(statuses).toEqual(["saving", "saved"]);

    vi.advanceTimersByTime(1800);
    expect(statuses.at(-1)).toBe("idle");
  });

  it("keeps showing saving when a new change interrupts the saved status", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      storage,
    });
    const progress = createPuzzleProgress(puzzle);

    controller.schedule(progress, false);
    vi.advanceTimersByTime(750);
    expect(statuses.at(-1)).toBe("saved");

    vi.advanceTimersByTime(1500);
    paintCells(progress, puzzle, [0]);
    controller.schedule(progress, false);
    vi.advanceTimersByTime(300);
    expect(statuses.at(-1)).toBe("saving");

    vi.advanceTimersByTime(450);
    expect(storage.writeAttempts).toBe(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("saves within the maximum delay during continuous changes", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const controller = createProgressSaveController({ onStatus: () => undefined, puzzle, storage });
    const progress = createPuzzleProgress(puzzle);

    controller.schedule(progress, false);
    for (let elapsed = 600; elapsed < 3000; elapsed += 600) {
      vi.advanceTimersByTime(600);
      controller.schedule(progress, false);
    }
    expect(storage.writeAttempts).toBe(0);

    vi.advanceTimersByTime(600);
    expect(storage.writeAttempts).toBe(1);
  });

  it("stops retrying after the first write failure", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      storage,
    });
    const progress = createPuzzleProgress(puzzle);

    controller.schedule(progress, true);
    expect(storage.writeAttempts).toBe(1);
    expect(statuses).toEqual(["saving", "error"]);

    storage.failWrites = false;
    controller.schedule(progress, true);
    expect(storage.writeAttempts).toBe(1);
  });
});

function paintCells(progress: ReturnType<typeof createPuzzleProgress>, definition: PuzzleDefinition, cells: number[]) {
  for (const pixelIndex of cells) {
    const colorIndex = definition.targetPixels[pixelIndex];
    progress.paintedPixels[pixelIndex] = colorIndex;
    progress.paintedByColor[colorIndex] += 1;
    progress.paintedCount += 1;
  }
}
