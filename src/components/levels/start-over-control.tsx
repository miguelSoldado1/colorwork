import { clearPuzzleProgress } from "@/coloring/progress-storage";
import Reload from "@/components/icons/reload.svg?react";
import { Button } from "@/components/ui/button";
import { useConfirmAction } from "@/components/ui/use-confirm-action";
import { CONFIRM_LAYER } from "./confirm-layer";
import type { LevelDescription } from "@/levels/describe-level";

interface StartOverControlProps {
  level: LevelDescription;
}

export function StartOverControl({ level }: StartOverControlProps) {
  const { cancelProps, confirmationProps, confirming, confirmProps, failed, rootProps, triggerProps } =
    useConfirmAction({ onConfirm: () => clearPuzzleProgress(level.puzzle) });

  return (
    <div className="grid *:col-start-1 *:row-start-1" {...rootProps}>
      <div className={CONFIRM_LAYER} data-hidden={confirming}>
        <Button
          className="w-full"
          disabled={!level.started}
          tabIndex={confirming ? -1 : undefined}
          variant="destructiveGhost"
          {...triggerProps}
        >
          <Reload height={19} width={19} />
          Start over
        </Button>
      </div>

      <div className={`flex gap-2 ${CONFIRM_LAYER}`} data-hidden={!confirming} {...confirmationProps}>
        <Button className="flex-1" tabIndex={confirming ? undefined : -1} {...cancelProps}>
          Cancel
        </Button>
        <Button className="flex-1" tabIndex={confirming ? undefined : -1} variant="destructive" {...confirmProps}>
          Yes, clear it
        </Button>
      </div>
      {failed ? (
        <p className="col-start-1 row-start-2 mt-2 text-destructive text-xs" role="alert">
          Couldn&apos;t clear the stored progress. Try again.
        </p>
      ) : null}
    </div>
  );
}
