export type AchievementMetric =
  | "completed-catalog-puzzles"
  | "completed-imported-puzzles"
  | "completed-puzzles"
  | "stored-imported-puzzles";

export interface AchievementDefinition {
  criteria: {
    metric: AchievementMetric;
    threshold: number;
  };
  description: string;
  id: string;
  name: string;
}

export const ACHIEVEMENTS = [
  {
    criteria: { metric: "completed-puzzles", threshold: 1 },
    description: "Finish your first artwork. The first one always feels good.",
    id: "first-finish",
    name: "First finish",
  },
  {
    criteria: { metric: "completed-catalog-puzzles", threshold: 1 },
    description: "Finish your first catalog artwork. One down, plenty of color to go.",
    id: "catalog-debut",
    name: "Catalog debut",
  },
  {
    criteria: { metric: "completed-imported-puzzles", threshold: 1 },
    description: "Finish an artwork you imported. This one is all yours.",
    id: "custom-finish",
    name: "Custom finish",
  },
  {
    criteria: { metric: "stored-imported-puzzles", threshold: 20 },
    description: "Keep 20 imported artworks in your collection. Now that's a gallery.",
    id: "personal-collection",
    name: "Personal collection",
  },
] as const satisfies readonly AchievementDefinition[];
