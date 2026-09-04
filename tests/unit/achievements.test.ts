import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, type AchievementDefinition, type AchievementMetric } from "@/achievements/achievement-catalog";
import {
  type AchievementMetricValues,
  findNewlyUnlockedAchievements,
  getAchievementProgress,
} from "@/achievements/evaluate-achievements";

const ACHIEVEMENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const METRICS = [
  "completed-catalog-puzzles",
  "completed-imported-puzzles",
  "completed-puzzles",
  "stored-imported-puzzles",
] as const satisfies readonly AchievementMetric[];

const NO_PROGRESS: AchievementMetricValues = {
  "completed-catalog-puzzles": 0,
  "completed-imported-puzzles": 0,
  "completed-puzzles": 0,
  "stored-imported-puzzles": 0,
};

const testAchievements = [
  createAchievement("first-finish", "completed-puzzles", 1),
  createAchievement("five-finishes", "completed-puzzles", 5),
  createAchievement("first-imported-finish", "completed-imported-puzzles", 1),
] as const;

describe("achievement catalog", () => {
  it("defines stable, unique achievement ids", () => {
    const ids = ACHIEVEMENTS.map((definition) => definition.id);

    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(ACHIEVEMENT_ID_PATTERN);
    }
  });

  it("uses supported metrics and positive whole-number thresholds", () => {
    for (const { criteria } of ACHIEVEMENTS) {
      expect(METRICS).toContain(criteria.metric);
      expect(Number.isInteger(criteria.threshold)).toBe(true);
      expect(criteria.threshold).toBeGreaterThan(0);
    }
  });

  it("provides player-facing copy without surrounding whitespace", () => {
    for (const definition of ACHIEVEMENTS) {
      expect(definition.name.trim()).toBe(definition.name);
      expect(definition.description.trim()).toBe(definition.description);
      expect(definition.name).not.toBe("");
      expect(definition.description).not.toBe("");
    }
  });
});

describe("findNewlyUnlockedAchievements", () => {
  it("matches every locked achievement whose metric reaches its threshold", () => {
    const values = {
      ...NO_PROGRESS,
      "completed-imported-puzzles": 1,
      "completed-puzzles": 5,
    };

    expect(findNewlyUnlockedAchievements(testAchievements, values, new Set()).map(({ id }) => id)).toEqual([
      "first-finish",
      "five-finishes",
      "first-imported-finish",
    ]);
  });

  it("does not return achievements that are already unlocked", () => {
    const values = { ...NO_PROGRESS, "completed-puzzles": 5 };

    expect(
      findNewlyUnlockedAchievements(testAchievements, values, new Set(["first-finish"])).map(({ id }) => id)
    ).toEqual(["five-finishes"]);
  });

  it("does not mutate the authored achievement order", () => {
    const values = { ...NO_PROGRESS, "completed-puzzles": 5 };
    const originalOrder = testAchievements.map(({ id }) => id);

    findNewlyUnlockedAchievements(testAchievements, values, new Set());

    expect(testAchievements.map(({ id }) => id)).toEqual(originalOrder);
  });
});

describe("getAchievementProgress", () => {
  it("reports progress toward a locked achievement", () => {
    const values = { ...NO_PROGRESS, "completed-puzzles": 3 };

    expect(getAchievementProgress(testAchievements[1], values)).toEqual({ current: 3, target: 5 });
  });

  it("caps displayed progress at the achievement target", () => {
    const values = { ...NO_PROGRESS, "completed-puzzles": 12 };

    expect(getAchievementProgress(testAchievements[1], values)).toEqual({ current: 5, target: 5 });
  });
});

function createAchievement(id: string, metric: AchievementMetric, threshold: number): AchievementDefinition {
  return {
    criteria: { metric, threshold },
    description: `${id} description`,
    id,
    name: id,
  };
}
