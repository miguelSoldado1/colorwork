import type { ColoringTool } from "@/coloring/types";

export const TOOL_SHORTCUTS = {
  bucket: "b",
  pan: "h",
  pencil: "p",
  picker: "c",
  "zoom-in": "i",
  "zoom-out": "o",
} as const satisfies Record<ColoringTool, string>;

export const TOOLBAR_SHORTCUTS = {
  grid: "g",
  missing: "m",
  numbers: "n",
} as const;
