import { getColorworkDatabase } from "@/storage/colorwork-database";
import type { StoredAchievementUnlockV1, StoredPuzzleCompletionV1 } from "@/storage/colorwork-database";

const STORAGE_CHANNEL = "colorwork:achievements";

let achievementChannel: BroadcastChannel | null | undefined;

export interface AchievementTransaction {
  readonly completedPuzzles: ReadonlyMap<string, StoredPuzzleCompletionV1>;
  readonly importedPuzzleIds: ReadonlySet<string>;

  markChanged: () => void;
  recordCompletion: (record: StoredPuzzleCompletionV1) => boolean;
  recordUnlock: (record: StoredAchievementUnlockV1) => boolean;
  readonly unlockedAchievements: ReadonlyMap<string, StoredAchievementUnlockV1>;
}

export interface AchievementRepository {
  update: <Result>(operation: (transaction: AchievementTransaction) => Result) => Promise<Result>;
}

export const indexedDbAchievementRepository: AchievementRepository = {
  async update<Result>(operation: (transaction: AchievementTransaction) => Result) {
    const database = await getColorworkDatabase();
    const importedPuzzleIds = await database.getAllKeys("artworks");
    const transaction = database.transaction(["achievementUnlocks", "puzzleCompletions"], "readwrite");
    const writes: Promise<unknown>[] = [];

    try {
      const unlockStore = transaction.objectStore("achievementUnlocks");
      const completionStore = transaction.objectStore("puzzleCompletions");

      const [storedUnlocks, storedCompletions] = await Promise.all([unlockStore.getAll(), completionStore.getAll()]);

      const unlockedAchievements = new Map(
        storedUnlocks.filter(isStoredAchievementUnlock).map((record) => [record.achievementId, record])
      );
      const completedPuzzles = new Map(
        storedCompletions.filter(isStoredPuzzleCompletion).map((record) => [record.artworkId, record])
      );

      let changed = false;

      const result = operation({
        completedPuzzles,
        importedPuzzleIds: new Set(importedPuzzleIds),
        markChanged() {
          changed = true;
        },
        recordCompletion(record) {
          if (completedPuzzles.has(record.artworkId)) {
            return false;
          }

          completedPuzzles.set(record.artworkId, record);
          writes.push(completionStore.put(record));
          changed = true;
          return true;
        },
        recordUnlock(record) {
          if (unlockedAchievements.has(record.achievementId)) {
            return false;
          }

          unlockedAchievements.set(record.achievementId, record);
          writes.push(unlockStore.put(record));
          changed = true;
          return true;
        },
        unlockedAchievements,
      });

      await Promise.all([...writes, transaction.done]);
      if (changed) {
        notifyAchievementsChanged();
      }
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may have already failed or completed.
      }

      await Promise.allSettled([...writes, transaction.done]);
      throw error;
    }
  },
};

export async function clearAchievementHistory() {
  const database = await getColorworkDatabase();
  const transaction = database.transaction(["achievementUnlocks", "puzzleCompletions"], "readwrite");
  const clears = [
    transaction.objectStore("achievementUnlocks").clear(),
    transaction.objectStore("puzzleCompletions").clear(),
  ];

  try {
    await Promise.all([...clears, transaction.done]);
    notifyAchievementsChanged();
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may have already failed or completed.
    }

    await Promise.allSettled([...clears, transaction.done]);
    throw error;
  }
}

export function subscribeToStoredAchievements(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const channel = getAchievementChannel();
  if (channel) {
    channel.addEventListener("message", onChange);
    return () => channel.removeEventListener("message", onChange);
  }

  return () => undefined;
}

function isStoredAchievementUnlock(value: unknown): value is StoredAchievementUnlockV1 {
  if (!(value && typeof value === "object")) {
    return false;
  }

  const record = value as Partial<StoredAchievementUnlockV1>;
  return (
    record.version === 1 &&
    typeof record.achievementId === "string" &&
    Boolean(record.achievementId) &&
    isValidDateTimestamp(record.unlockedAt)
  );
}

function isValidDateTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
}

function isStoredPuzzleCompletion(value: unknown): value is StoredPuzzleCompletionV1 {
  if (!(value && typeof value === "object")) {
    return false;
  }

  const record = value as Partial<StoredPuzzleCompletionV1>;
  return (
    record.version === 1 &&
    typeof record.artworkId === "string" &&
    Boolean(record.artworkId) &&
    (record.source === "catalog" || record.source === "imported")
  );
}

function notifyAchievementsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  const channel = getAchievementChannel();
  if (channel) {
    try {
      channel.postMessage("changed");
    } catch {
      // Cross-tab synchronization is best effort; the local notification already succeeded.
    }
  }
}

function getAchievementChannel() {
  if (achievementChannel !== undefined) {
    return achievementChannel ?? undefined;
  }

  if (typeof BroadcastChannel === "undefined") {
    achievementChannel = null;
    return;
  }

  try {
    achievementChannel = new BroadcastChannel(STORAGE_CHANNEL);
    return achievementChannel;
  } catch {
    achievementChannel = null;
  }
}
