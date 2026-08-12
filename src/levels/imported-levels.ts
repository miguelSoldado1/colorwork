import { isArtworkNameWithinLimit, normalizeArtworkName } from "@/levels/artwork-name";
import { getColorworkDatabase } from "@/storage/colorwork-database";
import type { PuzzleDefinition } from "@/coloring/types";
import type { StoredArtworkV1 } from "@/storage/colorwork-database";

const STORAGE_VERSION = 1;

export interface ArtworkRepository {
  delete: (artworkId: string) => Promise<void>;
  get: (artworkId: string) => Promise<StoredArtworkV1 | undefined>;
  getAll: () => Promise<StoredArtworkV1[]>;
  put: (artwork: StoredArtworkV1) => Promise<void>;
}

const indexedDbArtworkRepository: ArtworkRepository = {
  async delete(artworkId) {
    const database = await getColorworkDatabase();
    await database.delete("artworks", artworkId);
  },
  async get(artworkId) {
    const database = await getColorworkDatabase();
    return database.get("artworks", artworkId);
  },
  async getAll() {
    const database = await getColorworkDatabase();
    return database.getAll("artworks");
  },
  async put(artwork) {
    const database = await getColorworkDatabase();
    await database.put("artworks", artwork);
  },
};

export async function saveImportedPuzzle(
  puzzle: PuzzleDefinition,
  repository: ArtworkRepository = indexedDbArtworkRepository
) {
  const stored = await repository.get(puzzle.id);
  const timestamp = Date.now();

  await repository.put({
    createdAt: stored?.createdAt ?? timestamp,
    height: puzzle.height,
    id: puzzle.id,
    name: puzzle.name,
    palette: [...puzzle.palette],
    targetPixels: puzzle.targetPixels.slice(),
    updatedAt: timestamp,
    version: STORAGE_VERSION,
    width: puzzle.width,
  });
}

export async function deleteImportedPuzzle(id: string, repository: ArtworkRepository = indexedDbArtworkRepository) {
  await repository.delete(id);
}

export async function renameImportedPuzzle(
  id: string,
  name: string,
  repository: ArtworkRepository = indexedDbArtworkRepository
) {
  const normalizedName = normalizeArtworkName(name);
  if (!isArtworkNameWithinLimit(normalizedName)) {
    throw new RangeError("Artwork names must fit within the supported length.");
  }

  const stored = await repository.get(id);
  if (!stored) {
    throw new Error("The imported artwork could not be found.");
  }

  await repository.put({
    ...stored,
    name: normalizedName,
    updatedAt: Date.now(),
  });
}

export async function findImportedPuzzle(id: string, repository: ArtworkRepository = indexedDbArtworkRepository) {
  return restorePuzzle(await repository.get(id));
}

export async function loadImportedPuzzles(repository: ArtworkRepository = indexedDbArtworkRepository) {
  const records = await repository.getAll();
  const puzzles: PuzzleDefinition[] = [];

  for (const record of records.toSorted((first, second) => first.createdAt - second.createdAt)) {
    const puzzle = restorePuzzle(record);
    if (puzzle) {
      puzzles.push(puzzle);
    }
  }

  return puzzles;
}

function restorePuzzle(value: unknown) {
  if (!(value && typeof value === "object")) {
    return;
  }

  const record = value as Partial<StoredArtworkV1>;
  if (
    record.version !== STORAGE_VERSION ||
    typeof record.id !== "string" ||
    !record.id ||
    typeof record.name !== "string" ||
    typeof record.width !== "number" ||
    typeof record.height !== "number" ||
    !Number.isInteger(record.width) ||
    !Number.isInteger(record.height) ||
    record.width < 1 ||
    record.height < 1 ||
    !Array.isArray(record.palette) ||
    record.palette.length < 1 ||
    !record.palette.every((color) => typeof color === "string") ||
    !(record.targetPixels instanceof Uint8Array) ||
    record.targetPixels.length !== record.width * record.height ||
    typeof record.createdAt !== "number" ||
    typeof record.updatedAt !== "number"
  ) {
    return;
  }

  for (const colorIndex of record.targetPixels) {
    if (colorIndex >= record.palette.length) {
      return;
    }
  }

  return {
    height: record.height,
    id: record.id,
    name: record.name,
    palette: [...record.palette],
    targetPixels: record.targetPixels.slice(),
    width: record.width,
  } satisfies PuzzleDefinition;
}
