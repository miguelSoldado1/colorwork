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
    criteria: { metric: "completed-puzzles", threshold: 5 },
    description: "Finish 5 distinct artworks. That's a proper streak.",
    id: "five-finishes",
    name: "Five finishes",
  },
  {
    criteria: { metric: "completed-puzzles", threshold: 10 },
    description: "Finish 10 distinct artworks. Double digits looks good on you.",
    id: "double-digits",
    name: "Double digits",
  },
  {
    criteria: { metric: "completed-catalog-puzzles", threshold: 3 },
    description: "Finish 3 catalog artworks. Three in the bag.",
    id: "catalog-hat-trick",
    name: "Hat trick",
  },
  {
    criteria: { metric: "completed-catalog-puzzles", threshold: 6 },
    description: "Finish 6 catalog artworks. You know your way around a palette by now.",
    id: "catalog-regular",
    name: "Colorwork regular",
  },
  {
    criteria: { metric: "completed-imported-puzzles", threshold: 1 },
    description: "Finish an artwork you imported. This one is all yours.",
    id: "custom-finish",
    name: "Custom finish",
  },
  {
    criteria: { metric: "completed-imported-puzzles", threshold: 3 },
    description: "Finish 3 artworks you imported. Your pictures, your palette.",
    id: "custom-trio",
    name: "Three of your own",
  },
  {
    criteria: { metric: "stored-imported-puzzles", threshold: 20 },
    description: "Keep 20 imported artworks in your collection. Now that's a gallery.",
    id: "personal-collection",
    name: "Personal collection",
  },
] as const satisfies readonly AchievementDefinition[];
