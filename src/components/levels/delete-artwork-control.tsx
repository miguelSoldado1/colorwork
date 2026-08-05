import { useQueryClient } from "@tanstack/react-query";
import { clearPuzzleProgress } from "@/coloring/progress-storage";
import Trash from "@/components/icons/trash.svg?react";
import { Button } from "@/components/ui/button";
import { useConfirmAction } from "@/components/ui/use-confirm-action";
import { deleteImportedPuzzle } from "@/levels/imported-levels";
import { artworkQueryKeys } from "@/query/artwork-queries";
import { CONFIRM_LAYER } from "./confirm-layer";
import type { LevelDescription } from "@/levels/describe-level";

interface DeleteArtworkControlProps {
  level: LevelDescription;
  onDeleted: () => void;
}

export function DeleteArtworkControl({ level, onDeleted }: DeleteArtworkControlProps) {
  const queryClient = useQueryClient();

  const { cancelProps, confirmationProps, confirming, confirmProps, failed, rootProps, triggerProps } =
    useConfirmAction({
      // The artwork goes first so a failed progress delete leaves an unreachable record, not a reset board.
      onConfirm: async () => {
        await deleteImportedPuzzle(level.puzzle.id);
        await clearPuzzleProgress(level.puzzle);
      },
      onDone: async () => {
        queryClient.removeQueries({ queryKey: artworkQueryKeys.definition(level.puzzle.id) });
        await queryClient.invalidateQueries({ queryKey: artworkQueryKeys.descriptions });
        onDeleted();
      },
    });

  return (
    <div className="grid *:col-start-1 *:row-start-1" {...rootProps}>
      <div className={CONFIRM_LAYER} data-hidden={confirming}>
        <Button className="w-full" tabIndex={confirming ? -1 : undefined} variant="destructiveGhost" {...triggerProps}>
          <Trash height={19} width={19} />
          Delete artwork
        </Button>
      </div>

      <div className={`flex gap-2 ${CONFIRM_LAYER}`} data-hidden={!confirming} {...confirmationProps}>
        <Button className="flex-1" tabIndex={confirming ? undefined : -1} {...cancelProps}>
          Cancel
        </Button>
        <Button className="flex-1" tabIndex={confirming ? undefined : -1} variant="destructive" {...confirmProps}>
          Yes, delete it
        </Button>
      </div>
      {failed ? (
        <p className="col-start-1 row-start-2 mt-2 text-destructive text-xs" role="alert">
          Couldn&apos;t delete this artwork. Try again.
        </p>
      ) : null}
    </div>
  );
}
