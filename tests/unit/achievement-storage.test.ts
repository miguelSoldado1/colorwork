import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAchievementHistory,
  indexedDbAchievementRepository,
  subscribeToStoredAchievements,
} from "@/achievements/achievement-storage";
import {
  evaluateImportedPuzzleAchievements,
  getAchievementMetricValues,
  reconcileAchievementState,
  reconcileAchievements,
  recordPuzzleCompletion,
} from "@/achievements/process-achievements";
import { trackAchievementUnlocked } from "@/analytics/posthog";
import type { AchievementRepository, AchievementTransaction } from "@/achievements/achievement-storage";
import type { StoredAchievementUnlockV1, StoredPuzzleCompletionV1 } from "@/storage/colorwork-database";

const databaseMocks = vi.hoisted(() => ({
  getColorworkDatabase: vi.fn(),
}));

vi.mock("@/storage/colorwork-database", () => databaseMocks);
vi.mock("@/analytics/posthog", () => ({ trackAchievementUnlocked: vi.fn() }));

class MemoryAchievementRepository implements AchievementRepository {
  readonly completedPuzzles = new Map<string, StoredPuzzleCompletionV1>();
  readonly importedPuzzleIds = new Set<string>();
  readonly unlockedAchievements = new Map<string, StoredAchievementUnlockV1>();

  update<Result>(operation: (transaction: AchievementTransaction) => Result) {
    return Promise.resolve(
      operation({
        completedPuzzles: this.completedPuzzles,
        importedPuzzleIds: this.importedPuzzleIds,
        markChanged: () => undefined,
        recordCompletion: (record) => {
          if (this.completedPuzzles.has(record.artworkId)) {
            return false;
          }

          this.completedPuzzles.set(record.artworkId, structuredClone(record));
          return true;
        },
        recordUnlock: (record) => {
          if (this.unlockedAchievements.has(record.achievementId)) {
            return false;
          }

          this.unlockedAchievements.set(record.achievementId, structuredClone(record));
          return true;
        },
        unlockedAchievements: this.unlockedAchievements,
      })
    );
  }
}

interface StoredRecords {
  achievementUnlocks?: unknown[];
  artworkIds?: string[];
  puzzleCompletions?: unknown[];
}

function useStoredRecords({ achievementUnlocks = [], artworkIds = [], puzzleCompletions = [] }: StoredRecords = {}) {
  const stores = {
    achievementUnlocks: {
      clear: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue(achievementUnlocks),
      put: vi.fn().mockResolvedValue(undefined),
    },
    artworks: {
      getAllKeys: vi.fn().mockResolvedValue(artworkIds),
    },
    puzzleCompletions: {
      clear: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue(puzzleCompletions),
      put: vi.fn().mockResolvedValue(undefined),
    },
  };
  const transaction = {
    abort: vi.fn(),
    done: Promise.resolve(),
    objectStore: vi.fn((name: keyof typeof stores) => stores[name]),
  };

  databaseMocks.getColorworkDatabase.mockResolvedValue({
    transaction: vi.fn(() => transaction),
  });

  return { stores, transaction };
}

function useRepository(repository: MemoryAchievementRepository) {
  vi.spyOn(indexedDbAchievementRepository, "update").mockImplementation(repository.update.bind(repository));
}

afterEach(() => {
  databaseMocks.getColorworkDatabase.mockReset();
  vi.mocked(trackAchievementUnlocked).mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("achievement processing", () => {
  it("awards the first import once and keeps it after deletion", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);
    await expect(evaluateImportedPuzzleAchievements()).resolves.toEqual([]);
    repository.importedPuzzleIds.add("private-picture");
    await expect(evaluateImportedPuzzleAchievements()).resolves.toEqual([
      expect.objectContaining({ id: "first-import" }),
    ]);
    repository.importedPuzzleIds.clear();
    await expect(evaluateImportedPuzzleAchievements()).resolves.toEqual([]);
    repository.importedPuzzleIds.add("another-private-picture");
    await expect(evaluateImportedPuzzleAchievements()).resolves.toEqual([]);
    expect(trackAchievementUnlocked).toHaveBeenCalledExactlyOnceWith("first-import");
  });

  it("tracks reconciled unlocks once after persistence succeeds", async () => {
    const repository = new MemoryAchievementRepository();
    repository.importedPuzzleIds.add("existing-import");
    useRepository(repository);
    await reconcileAchievementState([]);
    await reconcileAchievementState([]);
    expect(trackAchievementUnlocked).toHaveBeenCalledExactlyOnceWith("first-import");
  });

  it("does not track an unlock from an aborted transaction", async () => {
    const repository = new MemoryAchievementRepository();
    repository.importedPuzzleIds.add("private-picture");
    vi.spyOn(indexedDbAchievementRepository, "update").mockImplementation(async (operation) => {
      await repository.update(operation);
      throw new Error("Transaction aborted");
    });
    await expect(evaluateImportedPuzzleAchievements()).rejects.toThrow("Transaction aborted");
    expect(trackAchievementUnlocked).not.toHaveBeenCalled();
  });

  it("records a distinct catalog completion and unlocks matching achievements", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);
    const now = vi.spyOn(Date, "now").mockReturnValue(1234);

    const unlocked = await recordPuzzleCompletion({ artworkId: "gobbo", source: "catalog" });

    expect(unlocked.map(({ id }) => id)).toEqual(["first-finish"]);
    expect(repository.completedPuzzles.get("gobbo")).toEqual({
      artworkId: "gobbo",
      source: "catalog",
      version: 1,
    });
    expect(repository.unlockedAchievements.get("first-finish")).toEqual({
      achievementId: "first-finish",
      unlockedAt: 1234,
      version: 1,
    });
    expect(now).toHaveBeenCalledOnce();
  });

  it("separates imported completions while including them in the overall total", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);

    await recordPuzzleCompletion({ artworkId: "custom-1", source: "imported" });

    const values = await repository.update(getAchievementMetricValues);
    expect(values).toMatchObject({
      "completed-catalog-puzzles": 0,
      "completed-imported-puzzles": 1,
      "completed-puzzles": 1,
    });
    expect(repository.unlockedAchievements.keys()).toContain("custom-finish");
  });

  it("unlocks catalog milestones after three and six distinct completions", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);

    await recordPuzzleCompletion({ artworkId: "catalog-1", source: "catalog" });
    await recordPuzzleCompletion({ artworkId: "catalog-2", source: "catalog" });
    const thirdUnlocks = await recordPuzzleCompletion({ artworkId: "catalog-3", source: "catalog" });
    await recordPuzzleCompletion({ artworkId: "catalog-4", source: "catalog" });
    await recordPuzzleCompletion({ artworkId: "catalog-5", source: "catalog" });
    const sixthUnlocks = await recordPuzzleCompletion({ artworkId: "catalog-6", source: "catalog" });

    expect(thirdUnlocks.map(({ id }) => id)).toEqual(["catalog-hat-trick"]);
    expect(sixthUnlocks.map(({ id }) => id)).toEqual(["catalog-regular"]);
  });

  it("unlocks overall and imported milestones across distinct completions", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);

    await recordPuzzleCompletion({ artworkId: "custom-1", source: "imported" });
    await recordPuzzleCompletion({ artworkId: "catalog-1", source: "catalog" });
    await recordPuzzleCompletion({ artworkId: "custom-2", source: "imported" });
    await recordPuzzleCompletion({ artworkId: "catalog-2", source: "catalog" });
    const fifthUnlocks = await recordPuzzleCompletion({ artworkId: "custom-3", source: "imported" });

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        recordPuzzleCompletion({ artworkId: `catalog-${index + 3}`, source: "catalog" })
      )
    );

    expect(fifthUnlocks.map(({ id }) => id).sort()).toEqual(["custom-trio", "five-finishes"]);
    expect(repository.unlockedAchievements.keys()).toContain("double-digits");
  });

  it("does not count or unlock the same completion twice", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);
    const completion = { artworkId: "gobbo", source: "catalog" } as const;

    await recordPuzzleCompletion(completion);
    const unlockedAgain = await recordPuzzleCompletion(completion);

    expect(repository.completedPuzzles).toHaveLength(1);
    expect(unlockedAgain).toEqual([]);
  });

  it("counts currently stored imports without loading their artwork data", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);
    for (let index = 0; index < 19; index += 1) {
      repository.importedPuzzleIds.add(`custom-${index}`);
    }

    await expect(evaluateImportedPuzzleAchievements()).resolves.toEqual([
      expect.objectContaining({ id: "first-import" }),
    ]);
    repository.importedPuzzleIds.add("custom-19");
    vi.spyOn(Date, "now").mockReturnValue(4321);
    const unlocked = await evaluateImportedPuzzleAchievements();

    expect(unlocked.map(({ id }) => id)).toEqual(["personal-collection"]);
    expect(repository.unlockedAchievements.get("personal-collection")?.unlockedAt).toBe(4321);
  });

  it("does not count an imported record that collides with a catalog id", async () => {
    const repository = new MemoryAchievementRepository();
    repository.importedPuzzleIds.add("gobbo");

    const values = await repository.update(getAchievementMetricValues);

    expect(values["stored-imported-puzzles"]).toBe(0);
  });

  it("reconciles existing completions and unlocks without requiring live events", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);
    vi.spyOn(Date, "now").mockReturnValue(9876);

    const unlocked = await reconcileAchievements([
      { artworkId: "gobbo", source: "catalog" },
      { artworkId: "custom-1", source: "imported" },
    ]);

    expect(repository.completedPuzzles).toHaveLength(2);
    expect(unlocked.map(({ id }) => id)).toEqual(["first-finish", "custom-finish"]);
    expect(new Set(repository.unlockedAchievements.keys())).toEqual(new Set(["first-finish", "custom-finish"]));

    await expect(
      reconcileAchievements([
        { artworkId: "gobbo", source: "catalog" },
        { artworkId: "custom-1", source: "imported" },
      ])
    ).resolves.toEqual([]);
    expect(repository.completedPuzzles).toHaveLength(2);
  });

  it("returns the reconciled state used by the achievements page", async () => {
    const repository = new MemoryAchievementRepository();
    useRepository(repository);
    vi.spyOn(Date, "now").mockReturnValue(9876);

    const state = await reconcileAchievementState([
      { artworkId: "gobbo", source: "catalog" },
      { artworkId: "custom-1", source: "imported" },
    ]);

    expect(state.metricValues).toMatchObject({
      "completed-catalog-puzzles": 1,
      "completed-imported-puzzles": 1,
      "completed-puzzles": 2,
    });
    expect(state.unlockedAchievements.get("first-finish")?.unlockedAt).toBe(9876);
  });
});

describe("achievement storage", () => {
  it("ignores malformed stored records", async () => {
    useStoredRecords({
      achievementUnlocks: [
        { achievementId: "first-finish", unlockedAt: 1234, version: 1 },
        { achievementId: "missing-date", version: 1 },
        { achievementId: "invalid-date", unlockedAt: Number.MAX_VALUE, version: 1 },
      ],
      puzzleCompletions: [
        { artworkId: "gobbo", source: "catalog", version: 1 },
        { artworkId: "unknown-source", source: "other", version: 1 },
      ],
    });

    const storedIds = await indexedDbAchievementRepository.update((transaction) => ({
      completed: [...transaction.completedPuzzles.keys()],
      unlocked: [...transaction.unlockedAchievements.keys()],
    }));

    expect(storedIds).toEqual({
      completed: ["gobbo"],
      unlocked: ["first-finish"],
    });
  });

  it("notifies other tabs when achievement data changes", async () => {
    useStoredRecords();

    let channel: TestBroadcastChannel | undefined;
    const onChange = vi.fn();
    const postMessage = vi.fn();
    const windowTarget = new EventTarget();

    class TestBroadcastChannel extends EventTarget {
      constructor() {
        super();
        channel = this;
      }

      postMessage = postMessage;
    }

    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
    const unsubscribe = subscribeToStoredAchievements(onChange);

    await indexedDbAchievementRepository.update((transaction) => {
      transaction.markChanged();
    });

    expect(postMessage).toHaveBeenCalledWith("changed");
    expect(onChange).not.toHaveBeenCalled();

    channel?.dispatchEvent(new Event("message"));
    expect(onChange).toHaveBeenCalledOnce();

    unsubscribe();
    channel?.dispatchEvent(new Event("message"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("clears completion and unlock history without clearing artwork", async () => {
    const { stores } = useStoredRecords();

    await clearAchievementHistory();

    expect(stores.achievementUnlocks.clear).toHaveBeenCalledOnce();
    expect(stores.puzzleCompletions.clear).toHaveBeenCalledOnce();
    expect(stores.artworks).not.toHaveProperty("clear");
  });

  it("settles queued writes when an achievement operation fails", async () => {
    const { stores, transaction } = useStoredRecords();
    const operationError = new Error("Achievement processing failed");
    const writeError = new Error("Completion write aborted");
    const transactionError = new Error("Transaction aborted");
    let rejectTransaction: (error: Error) => void = () => undefined;
    let rejectWrite: (error: Error) => void = () => undefined;

    transaction.done = new Promise((_, reject) => {
      rejectTransaction = reject;
    });
    stores.puzzleCompletions.put.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectWrite = reject;
        })
    );
    transaction.abort.mockImplementationOnce(() => {
      rejectWrite(writeError);
      rejectTransaction(transactionError);
    });

    await expect(
      indexedDbAchievementRepository.update((achievementTransaction) => {
        achievementTransaction.recordCompletion({ artworkId: "gobbo", source: "catalog", version: 1 });
        throw operationError;
      })
    ).rejects.toBe(operationError);

    expect(transaction.abort).toHaveBeenCalledOnce();
  });
});
