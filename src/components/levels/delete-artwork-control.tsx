import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { clearPuzzleProgress } from "@/coloring/progress-storage";
import Trash from "@/components/icons/trash.svg?react";
import { Button } from "@/components/ui/button";
import { deleteImportedPuzzle } from "@/levels/imported-levels";
import { artworkQueryKeys } from "@/query/artwork-queries";
import type { KeyboardEvent } from "react";
import type { LevelDescription } from "@/levels/describe-level";

interface DeleteArtworkControlProps {
  level: LevelDescription;
  onDeleted: () => void;
}

const LAYER =
  "transition-opacity duration-150 ease-out data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0";

export function DeleteArtworkControl({ level, onDeleted }: DeleteArtworkControlProps) {
  const queryClient = useQueryClient();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  const deleteMutation = useMutation({
    // The artwork goes first so a failed progress delete leaves an unreachable record, not a reset board.
    mutationFn: async () => {
      await deleteImportedPuzzle(level.puzzle.id);
      await clearPuzzleProgress(level.puzzle);
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: artworkQueryKeys.definition(level.puzzle.id) });
      await queryClient.invalidateQueries({ queryKey: artworkQueryKeys.descriptions });
      onDeleted();
    },
  });

  // Moving focus into the confirmation is what keeps Escape and Enter working on the layer being shown.
  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus();
    }
  }, [confirming]);

  function cancel() {
    setConfirming(false);
    deleteMutation.reset();
    deleteRef.current?.focus();
  }

  function confirm() {
    deleteMutation.reset();
    deleteMutation.mutate();
  }

  function cancelOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      cancel();
    }
  }

  return (
    <div className="grid *:col-start-1 *:row-start-1">
      <div className={LAYER} data-hidden={confirming}>
        <Button
          className="w-full"
          onClick={() => setConfirming(true)}
          ref={deleteRef}
          tabIndex={confirming ? -1 : undefined}
          variant="destructiveGhost"
        >
          <Trash height={19} width={19} />
          Delete artwork
        </Button>
      </div>

      <div className={`flex gap-2 ${LAYER}`} data-hidden={!confirming}>
        <Button
          className="flex-1"
          disabled={deleteMutation.isPending}
          onClick={cancel}
          onKeyDown={cancelOnEscape}
          ref={cancelRef}
          tabIndex={confirming ? undefined : -1}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={deleteMutation.isPending}
          onClick={confirm}
          onKeyDown={cancelOnEscape}
          tabIndex={confirming ? undefined : -1}
          variant="destructive"
        >
          Delete forever
        </Button>
      </div>
      {deleteMutation.isError ? (
        <p className="col-start-1 row-start-2 mt-2 text-destructive text-xs" role="alert">
          Couldn&apos;t delete this artwork. Try again.
        </p>
      ) : null}
    </div>
  );
}
