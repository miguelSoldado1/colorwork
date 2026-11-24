export interface PuzzleDefinition {
  addedOn?: string;
  artist?: {
    name: string;
    url?: string;
  };
  catalogOrder?: number;
  height: number;
  id: string;
  name: string;
  palette: readonly string[];
  targetPixels: Uint8Array;
  width: number;
}

export interface PuzzleProgress {
  paintedByColor: Uint32Array;
  paintedCount: number;
  paintedPixels: Uint8Array;
}

export interface ProgressSummary {
  paintedByColor: number[];
  paintedCount: number;
  totalByColor: number[];
  totalPixels: number;
}

export type ColoringTool = "bucket" | "pan" | "pencil" | "picker" | "zoom-in" | "zoom-out";
