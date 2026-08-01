import { useEffect, useRef, useState } from "react";
import { clearPuzzleProgress } from "@/coloring/progress-storage";
import Reload from "@/components/icons/reload.svg?react";
import { Button } from "@/components/ui/button";
import type { KeyboardEvent } from "react";
import type { LevelDescription } from "@/levels/describe-level";

interface StartOverControlProps {
  level: LevelDescription;
}

const LAYER =
  "transition-opacity duration-150 ease-out data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0";

export function StartOverControl({ level }: StartOverControlProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  // Moving focus into the confirmation is what keeps Escape and Enter working on the layer being shown.
  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus();
    }
  }, [confirming]);

  function cancel() {
    setConfirming(false);
    startRef.current?.focus();
  }

  function confirm() {
    clearPuzzleProgress(level.puzzle);
    setConfirming(false);

    // Start over is disabled the moment this succeeds, so nothing left in here can hold focus.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && rootRef.current?.contains(focused)) {
      focused.blur();
    }
  }

  function cancelOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      cancel();
    }
  }

  return (
    <div className="grid *:col-start-1 *:row-start-1" ref={rootRef}>
      <div className={LAYER} data-hidden={confirming}>
        <Button
          className="w-full"
          disabled={!level.started}
          onClick={() => setConfirming(true)}
          ref={startRef}
          tabIndex={confirming ? -1 : undefined}
          variant="destructiveGhost"
        >
          <Reload height={19} width={19} />
          Start over
        </Button>
      </div>

      <div className={`flex gap-2 ${LAYER}`} data-hidden={!confirming}>
        <Button
          className="flex-1"
          onClick={cancel}
          onKeyDown={cancelOnEscape}
          ref={cancelRef}
          tabIndex={confirming ? undefined : -1}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={confirm}
          onKeyDown={cancelOnEscape}
          tabIndex={confirming ? undefined : -1}
          variant="destructive"
        >
          Yes, clear it
        </Button>
      </div>
    </div>
  );
}
