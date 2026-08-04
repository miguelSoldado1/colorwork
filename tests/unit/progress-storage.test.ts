import { afterEach, describe, expect, it, vi } from "vitest";
import { createPuzzleProgress } from "../../src/coloring/progress";
import {
  clearPuzzleProgress,
  createProgressSaveController,
  loadPuzzleProgress,
  savePuzzleProgress,
} from "../../src/coloring/progress-storage";
import type { ProgressRepository } from "../../src/coloring/progress-storage";
import type { PuzzleDefinition } from "../../src/coloring/types";
import type { StoredProgressV1 } from "../../src/storage/colorwork-database";

const puzzle = {
  height: 2,
  id: "stored-puzzle",
  name: "Stored puzzle",
  palette: ["#111111", "#eeeeee"],
  targetPixels: new Uint8Array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]),
  width: 5,
} satisfies PuzzleDefinition;

class MemoryProgressRepository implements ProgressRepository {
  readonly values = new Map<string, StoredProgressV1>();
  failWrites: boolean;
  writeAttempts = 0;

  constructor() {
    this.failWrites = false;
  }

  delete(artworkId: string) {
    this.values.delete(artworkId);
    return Promise.resolve();
  }

  get(artworkId: string) {
    const record = this.values.get(artworkId);
    return Promise.resolve(record ? structuredClone(record) : undefined);
  }

  put(record: StoredProgressV1) {
    this.writeAttempts += 1;
    if (this.failWrites) {
      return Promise.reject(new DOMException("Storage is unavailable", "QuotaExceededError"));
    }
    this.values.set(record.artworkId, structuredClone(record));
    return Promise.resolve();
  }
}

class ControlledProgressRepository extends MemoryProgressRepository {
  readonly pendingWrites: Array<{ record: StoredProgressV1; resolve: () => void }> = [];

  override put(record: StoredProgressV1) {
    this.writeAttempts += 1;
    return new Promise<void>((resolve) => {
      this.pendingWrites.push({ record: structuredClone(record), resolve });
    });
  }

  completeNextWrite() {
    const pending = this.pendingWrites.shift();
    if (!pending) {
      throw new Error("There is no pending progress write to complete.");
    }
    this.values.set(pending.record.artworkId, pending.record);
    pending.resolve();
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("puzzle progress storage", () => {
  it("round-trips painted cells and reconstructs their target colors and counts", async () => {
    const repository = new MemoryProgressRepository();
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0, 3, 9]);

    await savePuzzleProgress(puzzle, progress, repository);
    await expect(loadPuzzleProgress(puzzle, repository)).resolves.toEqual(progress);
  });

  it("stores one compact binary bit per cell instead of the painted pixel array", async () => {
    const repository = new MemoryProgressRepository();
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0, 9]);

    await savePuzzleProgress(puzzle, progress, repository);

    const [record] = repository.values.values();
    expect(record.paintedCells).toHaveLength(2);
    expect(record).not.toHaveProperty("paintedByColor");
    expect(record).not.toHaveProperty("paintedCount");
  });

  it("ignores progress after the immutable puzzle definition changes", async () => {
    const repository = new MemoryProgressRepository();
    await savePuzzleProgress(puzzle, createPuzzleProgress(puzzle), repository);
    const changedTarget = puzzle.targetPixels.slice();
    changedTarget[0] = 1;

    await expect(loadPuzzleProgress({ ...puzzle, targetPixels: changedTarget }, repository)).resolves.toBeUndefined();
  });

  it("ignores malformed records and bitsets with the wrong length", async () => {
    const repository = new MemoryProgressRepository();
    await savePuzzleProgress(puzzle, createPuzzleProgress(puzzle), repository);
    const record = repository.values.get(puzzle.id);
    if (!record) {
      throw new Error("The progress fixture was not stored.");
    }
    repository.values.set(puzzle.id, { ...record, paintedCells: new Uint8Array(1) });

    await expect(loadPuzzleProgress(puzzle, repository)).resolves.toBeUndefined();
  });

  it("clears a stored puzzle and leaves other puzzles alone", async () => {
    const repository = new MemoryProgressRepository();
    const other = { ...puzzle, id: "other-puzzle" };
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0, 3]);
    await savePuzzleProgress(puzzle, progress, repository);
    await savePuzzleProgress(other, progress, repository);

    await clearPuzzleProgress(puzzle, repository);
    await expect(loadPuzzleProgress(puzzle, repository)).resolves.toBeUndefined();
    await expect(loadPuzzleProgress(other, repository)).resolves.toEqual(progress);
  });

  it("treats clearing an untouched puzzle as a success", async () => {
    await expect(clearPuzzleProgress(puzzle, new MemoryProgressRepository())).resolves.toBeUndefined();
  });
});

describe("progress save controller", () => {
  it("debounces writes and reports the save lifecycle", async () => {
    vi.useFakeTimers();
    const repository = new MemoryProgressRepository();
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      repository,
    });

    controller.schedule(createPuzzleProgress(puzzle), false);
    await vi.advanceTimersByTimeAsync(749);
    expect(repository.writeAttempts).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(repository.writeAttempts).toBe(1);
    expect(statuses).toEqual(["saving", "saved"]);

    await vi.advanceTimersByTimeAsync(1800);
    expect(statuses.at(-1)).toBe("idle");
  });

  it("keeps showing saving when a new change interrupts the saved status", async () => {
    vi.useFakeTimers();
    const repository = new MemoryProgressRepository();
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      repository,
    });
    const progress = createPuzzleProgress(puzzle);

    controller.schedule(progress, false);
    await vi.advanceTimersByTimeAsync(750);
    expect(statuses.at(-1)).toBe("saved");

    await vi.advanceTimersByTimeAsync(1500);
    paintCells(progress, puzzle, [0]);
    controller.schedule(progress, false);
    await vi.advanceTimersByTimeAsync(300);
    expect(statuses.at(-1)).toBe("saving");

    await vi.advanceTimersByTimeAsync(450);
    expect(repository.writeAttempts).toBe(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("saves within the maximum delay during continuous changes", async () => {
    vi.useFakeTimers();
    const repository = new MemoryProgressRepository();
    const controller = createProgressSaveController({ onStatus: () => undefined, puzzle, repository });
    const progress = createPuzzleProgress(puzzle);

    controller.schedule(progress, false);
    await vi.advanceTimersByTimeAsync(600);
    controller.schedule(progress, false);
    await vi.advanceTimersByTimeAsync(600);
    controller.schedule(progress, false);
    await vi.advanceTimersByTimeAsync(600);
    controller.schedule(progress, false);
    await vi.advanceTimersByTimeAsync(600);
    controller.schedule(progress, false);
    expect(repository.writeAttempts).toBe(0);

    await vi.advanceTimersByTimeAsync(600);
    expect(repository.writeAttempts).toBe(1);
  });

  it("serializes writes and persists changes made while a write is in flight", async () => {
    const repository = new ControlledProgressRepository();
    const controller = createProgressSaveController({ onStatus: () => undefined, puzzle, repository });
    const progress = createPuzzleProgress(puzzle);
    paintCells(progress, puzzle, [0]);

    controller.schedule(progress, false);
    const flushPromise = controller.flush(false);
    expect(repository.writeAttempts).toBe(1);

    paintCells(progress, puzzle, [3]);
    controller.schedule(progress, false);
    expect(repository.writeAttempts).toBe(1);

    repository.completeNextWrite();
    await vi.waitFor(() => expect(repository.writeAttempts).toBe(2));
    repository.completeNextWrite();
    await flushPromise;

    await expect(loadPuzzleProgress(puzzle, repository)).resolves.toEqual(progress);
  });

  it("retries a transient failure without exposing an error", async () => {
    vi.useFakeTimers();
    const repository = new MemoryProgressRepository();
    repository.failWrites = true;
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      repository,
    });

    controller.schedule(createPuzzleProgress(puzzle), true);
    await controller.flush(true);
    expect(repository.writeAttempts).toBe(1);
    expect(statuses).toEqual(["saving"]);

    repository.failWrites = false;
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.writeAttempts).toBe(2);
    expect(statuses.at(-1)).toBe("saved");
    expect(statuses).not.toContain("error");
  });

  it("reports a persistent failure after retrying quietly", async () => {
    vi.useFakeTimers();
    const repository = new MemoryProgressRepository();
    repository.failWrites = true;
    const statuses: string[] = [];
    const controller = createProgressSaveController({
      onStatus: (status) => statuses.push(status),
      puzzle,
      repository,
    });

    controller.schedule(createPuzzleProgress(puzzle), true);
    await vi.advanceTimersByTimeAsync(13_000);

    expect(repository.writeAttempts).toBeGreaterThan(1);
    expect(statuses.at(-1)).toBe("error");
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
