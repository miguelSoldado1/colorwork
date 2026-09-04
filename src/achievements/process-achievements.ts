import { findLevel } from "@/levels/level-catalog";
import { ACHIEVEMENTS } from "./achievement-catalog";
import { indexedDbAchievementRepository } from "./achievement-storage";
import { findNewlyUnlockedAchievements } from "./evaluate-achievements";
import type { LevelSource } from "@/levels/describe-level";
import type { StoredAchievementUnlockV1 } from "@/storage/colorwork-database";
import type { AchievementDefinition, AchievementMetric } from "./achievement-catalog";
import type { AchievementTransaction } from "./achievement-storage";
import type { AchievementMetricValues } from "./evaluate-achievements";

const COMPLETION_METRICS = {
  catalog: new Set<AchievementMetric>(["completed-puzzles", "completed-catalog-puzzles"]),
  imported: new Set<AchievementMetric>(["completed-puzzles", "completed-imported-puzzles"]),
} as const;

const IMPORT_METRICS = new Set<AchievementMetric>(["stored-imported-puzzles"]);
const ALL_ACHIEVEMENT_METRICS = new Set(ACHIEVEMENTS.map(({ criteria }) => criteria.metric));

export interface PuzzleCompletionFact {
  artworkId: string;
  source: LevelSource;
}

export interface AchievementState {
  metricValues: AchievementMetricValues;
  unlockedAchievements: ReadonlyMap<string, StoredAchievementUnlockV1>;
}

export function recordPuzzleCompletion(completion: PuzzleCompletionFact) {
  const now = Date.now();

  return indexedDbAchievementRepository.update((transaction) => {
    transaction.recordCompletion({ ...completion, version: 1 });
    return unlockMatchingAchievements(transaction, COMPLETION_METRICS[completion.source], now);
  });
}

export function evaluateImportedPuzzleAchievements() {
  const now = Date.now();

  return indexedDbAchievementRepository.update((transaction) => {
    transaction.markChanged();
    return unlockMatchingAchievements(transaction, IMPORT_METRICS, now);
  });
}

export function reconcileAchievements(completions: readonly PuzzleCompletionFact[]) {
  const now = Date.now();

  return indexedDbAchievementRepository.update((transaction) => {
    for (const completion of completions) {
      transaction.recordCompletion({ ...completion, version: 1 });
    }

    return unlockMatchingAchievements(transaction, ALL_ACHIEVEMENT_METRICS, now);
  });
}

export function reconcileAchievementState(completions: readonly PuzzleCompletionFact[]) {
  const now = Date.now();

  return indexedDbAchievementRepository.update((transaction) => {
    for (const completion of completions) {
      transaction.recordCompletion({ ...completion, version: 1 });
    }

    unlockMatchingAchievements(transaction, ALL_ACHIEVEMENT_METRICS, now);

    return {
      metricValues: getAchievementMetricValues(transaction),
      unlockedAchievements: new Map(transaction.unlockedAchievements),
    } satisfies AchievementState;
  });
}

function unlockMatchingAchievements(
  transaction: AchievementTransaction,
  metrics: ReadonlySet<AchievementMetric>,
  unlockedAt: number
) {
  const candidates = ACHIEVEMENTS.filter(({ criteria }) => metrics.has(criteria.metric));
  const unlockedIds = new Set(transaction.unlockedAchievements.keys());
  const matching = findNewlyUnlockedAchievements(candidates, getAchievementMetricValues(transaction), unlockedIds);
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const achievement of matching) {
    if (transaction.recordUnlock({ achievementId: achievement.id, unlockedAt, version: 1 })) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

export function getAchievementMetricValues(transaction: AchievementTransaction): AchievementMetricValues {
  let completedCatalogPuzzles = 0;
  let completedImportedPuzzles = 0;

  for (const completion of transaction.completedPuzzles.values()) {
    if (completion.source === "catalog") {
      completedCatalogPuzzles += 1;
    } else {
      completedImportedPuzzles += 1;
    }
  }

  let storedImportedPuzzles = 0;
  for (const artworkId of transaction.importedPuzzleIds) {
    if (!findLevel(artworkId)) {
      storedImportedPuzzles += 1;
    }
  }

  return {
    "completed-catalog-puzzles": completedCatalogPuzzles,
    "completed-imported-puzzles": completedImportedPuzzles,
    "completed-puzzles": completedCatalogPuzzles + completedImportedPuzzles,
    "stored-imported-puzzles": storedImportedPuzzles,
  };
}
