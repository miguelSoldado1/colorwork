import { describe, expect, it } from "vitest";
import {
  type ArtworkRepository,
  deleteImportedPuzzle,
  findImportedPuzzle,
  loadImportedPuzzles,
  saveImportedPuzzle,
} from "@/levels/imported-levels";
import type { PuzzleDefinition } from "@/coloring/types";
import type { StoredArtworkV1 } from "@/storage/colorwork-database";

const puzzle = {
  height: 2,
  id: "imported-artwork",
  name: "Imported artwork",
  palette: ["#111111", "#eeeeee"],
  targetPixels: new Uint8Array([0, 1, 1, 0]),
  width: 2,
} satisfies PuzzleDefinition;

class MemoryArtworkRepository implements ArtworkRepository {
  readonly values = new Map<string, StoredArtworkV1>();

  delete(artworkId: string) {
    this.values.delete(artworkId);
    return Promise.resolve();
  }

  get(artworkId: string) {
    const record = this.values.get(artworkId);
    return Promise.resolve(record ? structuredClone(record) : undefined);
  }

  getAll() {
    return Promise.resolve(Array.from(this.values.values(), (record) => structuredClone(record)));
  }

  put(record: StoredArtworkV1) {
    this.values.set(record.id, structuredClone(record));
    return Promise.resolve();
  }
}

describe("imported artwork storage", () => {
  it("round-trips an imported puzzle through persistent records", async () => {
    const repository = new MemoryArtworkRepository();

    await saveImportedPuzzle(puzzle, repository);

    await expect(findImportedPuzzle(puzzle.id, repository)).resolves.toEqual(puzzle);
    await expect(loadImportedPuzzles(repository)).resolves.toEqual([puzzle]);
  });

  it("copies immutable puzzle data into and out of storage", async () => {
    const repository = new MemoryArtworkRepository();

    await saveImportedPuzzle(puzzle, repository);
    const restored = await findImportedPuzzle(puzzle.id, repository);
    if (!restored) {
      throw new Error("The artwork fixture was not restored.");
    }
    restored.targetPixels[0] = 1;
    const record = repository.values.get(puzzle.id);

    expect(record?.targetPixels[0]).toBe(0);
    expect(record?.palette).not.toBe(puzzle.palette);
  });

  it("drops a deleted puzzle from the catalog and leaves the rest alone", async () => {
    const repository = new MemoryArtworkRepository();
    const other = { ...puzzle, id: "other-artwork", name: "Other artwork" } satisfies PuzzleDefinition;
    await saveImportedPuzzle(puzzle, repository);
    await saveImportedPuzzle(other, repository);

    await deleteImportedPuzzle(puzzle.id, repository);

    await expect(findImportedPuzzle(puzzle.id, repository)).resolves.toBeUndefined();
    await expect(loadImportedPuzzles(repository)).resolves.toEqual([other]);
  });

  it("stays quiet when deleting a puzzle that is not stored", async () => {
    const repository = new MemoryArtworkRepository();

    await expect(deleteImportedPuzzle("never-imported", repository)).resolves.toBeUndefined();
  });

  it("ignores malformed records instead of opening a broken board", async () => {
    const repository = new MemoryArtworkRepository();
    await saveImportedPuzzle(puzzle, repository);
    const record = repository.values.get(puzzle.id);
    if (!record) {
      throw new Error("The artwork fixture was not stored.");
    }
    repository.values.set(puzzle.id, { ...record, targetPixels: new Uint8Array([4, 4, 4, 4]) });

    await expect(findImportedPuzzle(puzzle.id, repository)).resolves.toBeUndefined();
    await expect(loadImportedPuzzles(repository)).resolves.toEqual([]);
  });
});
