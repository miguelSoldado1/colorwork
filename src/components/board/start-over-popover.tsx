import { useEffect, useId } from "react";
import Reload from "@/assets/icons/reload.svg?react";
import { Button } from "@/components/ui/button";
import { useTooltip } from "@/components/ui/tooltip";
import { useConfirmAction } from "@/components/ui/use-confirm-action";

interface StartOverPopoverProps {
  onStartOver: () => Promise<void>;
  painted: boolean;
}

export function StartOverPopover({ onStartOver, painted }: StartOverPopoverProps) {
  const dialogId = useId();
  const promptId = useId();
  const { tooltip, triggerProps: labelProps } = useTooltip({ label: "Start over" });
  const {
    cancelProps,
    confirmationProps,
    confirming,
    confirmProps,
    dismiss,
    failed,
    pending,
    rootProps,
    triggerProps,
  } = useConfirmAction({ onConfirm: onStartOver });

  useEffect(() => {
    if (!confirming) {
      return;
    }

    function dismissOutside(event: PointerEvent) {
      if (!(event.target instanceof Node && rootProps.ref.current?.contains(event.target))) {
        dismiss();
      }
    }

    document.addEventListener("pointerdown", dismissOutside);

    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [confirming, dismiss, rootProps.ref]);

  return (
    <div className="relative shrink-0" {...rootProps}>
      <Button
        aria-controls={confirming ? dialogId : undefined}
        aria-haspopup="dialog"
        aria-label="Start over"
        disabled={!painted || pending}
        focusTone="neutral"
        size="icon"
        transition="press"
        variant="destructiveGhost"
        {...labelProps}
        {...triggerProps}
        aria-expanded={confirming}
        ref={(node) => {
          triggerProps.ref.current = node;
          labelProps.ref(node);
        }}
      >
        <Reload height={22} width={22} />
      </Button>
      {tooltip}

      {confirming ? (
        <div
          aria-busy={pending}
          aria-describedby={promptId}
          aria-label="Start over"
          className="popover-surface absolute top-full right-0 z-20 mt-1.5 w-max origin-top-right rounded-lg border border-border bg-card p-3"
          id={dialogId}
          role="dialog"
          {...confirmationProps}
        >
          <p className="mb-2.5 text-muted-foreground text-xs" id={promptId}>
            Clear every painted pixel?
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" size="compact" {...cancelProps}>
              Cancel
            </Button>
            <Button className="flex-1" size="compact" variant="destructive" {...confirmProps}>
              Clear
            </Button>
          </div>
          {failed ? (
            <p className="mt-2 max-w-44 text-destructive text-xs" role="alert">
              Couldn&apos;t clear the stored progress. Try again.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
