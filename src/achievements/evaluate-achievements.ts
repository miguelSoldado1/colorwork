import type { AchievementDefinition, AchievementMetric } from "./achievement-catalog";

export type AchievementMetricValues = Readonly<Record<AchievementMetric, number>>;

export function findNewlyUnlockedAchievements(
  achievements: readonly AchievementDefinition[],
  values: AchievementMetricValues,
  unlockedAchievementIds: ReadonlySet<string>
) {
  return achievements.filter(
    (achievement) =>
      !unlockedAchievementIds.has(achievement.id) &&
      values[achievement.criteria.metric] >= achievement.criteria.threshold
  );
}

export function getAchievementProgress(achievement: AchievementDefinition, values: AchievementMetricValues) {
  const target = achievement.criteria.threshold;

  return {
    current: Math.min(values[achievement.criteria.metric], target),
    target,
  };
}
