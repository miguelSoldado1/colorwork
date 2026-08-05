import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";

interface ConfirmActionOptions {
  onConfirm: () => Promise<unknown>;
  onDone?: () => Promise<void> | void;
}

export function useConfirmAction({ onConfirm, onDone }: ConfirmActionOptions) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: onConfirm,
    onSuccess: async () => {
      setConfirming(false);

      // The trigger is disabled once the change lands, so release focus before handing it on.
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && rootRef.current?.contains(focused)) {
        focused.blur();
      }

      await onDone?.();
    },
  });

  // Moving focus into the confirmation is what keeps Escape and Enter working on the layer being shown.
  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus();
    }
  }, [confirming]);

  function dismiss() {
    if (mutation.isPending) {
      return;
    }

    setConfirming(false);
    mutation.reset();
  }

  function cancel() {
    if (mutation.isPending) {
      return;
    }

    dismiss();
    triggerRef.current?.focus();
  }

  function confirm() {
    mutation.reset();
    mutation.mutate();
  }

  return {
    cancelProps: { disabled: mutation.isPending, onClick: cancel, ref: cancelRef },
    confirmationProps: {
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") {
          cancel();
        }
      },
    },
    confirming,
    confirmProps: { disabled: mutation.isPending, onClick: confirm },
    // Unlike cancel, leaves focus where it is.
    dismiss,
    failed: mutation.isError,
    pending: mutation.isPending,
    rootProps: {
      onBlur: (event: FocusEvent<HTMLDivElement>) => {
        if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
          dismiss();
        }
      },
      ref: rootRef,
    },
    triggerProps: {
      onClick: () => {
        if (mutation.isPending) {
          return;
        }
        if (confirming) {
          cancel();
        } else {
          setConfirming(true);
        }
      },
      ref: triggerRef,
    },
  };
}
