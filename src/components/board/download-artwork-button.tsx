import Download from "@/assets/icons/download.svg?react";
import { downloadPuzzleArtwork } from "@/coloring/export-artwork";
import { Button } from "@/components/ui/button";
import { useTooltip } from "@/components/ui/tooltip";
import type { PuzzleDefinition } from "@/coloring/types";

interface DownloadArtworkButtonProps {
  complete: boolean;
  name: string;
  puzzle: PuzzleDefinition;
}

export function DownloadArtworkButton({ complete, name, puzzle }: DownloadArtworkButtonProps) {
  const label = complete ? "Download artwork" : "Finish the artwork to download";
  const { tooltip, triggerProps } = useTooltip({ label });

  return (
    <>
      <Button
        aria-label={label}
        disabled={!complete}
        focusTone="neutral"
        onClick={() => downloadPuzzleArtwork(puzzle, name)}
        size="icon"
        transition="press"
        variant="ghost"
        {...triggerProps}
      >
        <Download height={22} width={22} />
      </Button>
      {tooltip}
    </>
  );
}
