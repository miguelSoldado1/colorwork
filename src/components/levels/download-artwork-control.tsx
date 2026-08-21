import Download from "@/assets/icons/download.svg?react";
import { downloadPuzzleArtwork } from "@/coloring/export-artwork";
import { Button } from "@/components/ui/button";
import type { PuzzleDefinition } from "@/coloring/types";

interface DownloadArtworkControlProps {
  complete: boolean;
  puzzle: PuzzleDefinition;
}

export function DownloadArtworkControl({ complete, puzzle }: DownloadArtworkControlProps) {
  return (
    <Button
      aria-label={complete ? "Download artwork" : "Finish the artwork to download"}
      disabled={!complete}
      onClick={() => downloadPuzzleArtwork(puzzle)}
      variant="secondary"
    >
      <Download height={19} width={19} />
      Download artwork
    </Button>
  );
}
