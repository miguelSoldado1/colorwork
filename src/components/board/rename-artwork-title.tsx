import { useMutation } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import Check from "@/assets/icons/check.svg?react";
import Close from "@/assets/icons/close.svg?react";
import { Button } from "@/components/ui/button";
import { isArtworkNameWithinLimit, MAX_ARTWORK_NAME_LENGTH, normalizeArtworkName } from "@/levels/artwork-name";
import type { FocusEvent, KeyboardEvent } from "react";

const NAME_LENGTH_ERROR = `Use ${MAX_ARTWORK_NAME_LENGTH} characters or fewer.`;

// The name keeps its place between states, so only the hairline beneath it changes.
const TITLE_TYPE = "bg-transparent p-0 font-semibold text-xl leading-none sm:text-2xl";

interface RenameArtworkTitleProps {
  editing: boolean;
  name: string;
  onEditingChange: (editing: boolean) => void;
  onRename: (name: string) => Promise<void>;
}

export function RenameArtworkTitle({ editing, name, onEditingChange, onRename }: RenameArtworkTitleProps) {
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerDownWithinRootRef = useRef(false);
  const rootRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [draft, setDraft] = useState(name);
  const [validationError, setValidationError] = useState("");

  // Saving disables the field and its actions, so a failure has to hand focus back to the name.
  const mutation = useMutation({ mutationFn: onRename, onError: focusInput, onSuccess: closeAndRestoreFocus });

  const dismissOutside = useEffectEvent((event: PointerEvent) => {
    if (!(event.target instanceof Node && rootRef.current?.contains(event.target))) {
      dismiss();
    }
  });

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [editing]);

  function beginEditing() {
    setDraft(name);
    setValidationError("");
    mutation.reset();
    onEditingChange(true);
  }

  function dismiss() {
    if (mutation.isPending) {
      return;
    }

    setDraft(name);
    setValidationError("");
    mutation.reset();
    onEditingChange(false);
  }

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeAndRestoreFocus() {
    setValidationError("");
    onEditingChange(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function cancel() {
    if (mutation.isPending) {
      return;
    }

    dismiss();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function save() {
    const nextName = normalizeArtworkName(draft);
    if (nextName === name) {
      return closeAndRestoreFocus();
    }

    if (!isArtworkNameWithinLimit(nextName)) {
      setValidationError(NAME_LENGTH_ERROR);
      return;
    }

    setValidationError("");
    mutation.reset();
    mutation.mutate(nextName);
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    if (
      !(
        pointerDownWithinRootRef.current ||
        (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
      )
    ) {
      dismiss();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      cancel();
    }
  }

  if (!editing) {
    return (
      <div className="flex h-6 min-w-0 items-center">
        <h1 className={`${TITLE_TYPE} min-w-0`}>
          {/* The pseudo-element carries the touch target, so the truncation has to clip below it. */}
          <button
            aria-describedby={hintId}
            className={`${TITLE_TYPE} relative block max-w-full cursor-pointer rounded-xs text-left text-foreground shadow-[0_2px_0_0_var(--color-border)] transition-shadow duration-200 ease-out before:absolute before:inset-x-0 before:-inset-y-3.5 before:content-[''] hover:shadow-[0_2px_0_0_var(--color-input)] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 sm:before:-inset-y-2`}
            onClick={beginEditing}
            ref={triggerRef}
            type="button"
          >
            <span className="block truncate">{name}</span>
          </button>
        </h1>
        <span className="sr-only" id={hintId}>
          Rename artwork
        </span>
      </div>
    );
  }

  const failed = Boolean(validationError) || mutation.isError;
  const errorMessage = validationError || "Couldn’t rename artwork. Try again.";

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Escape and focus loss dismiss the whole form, not one control.
    <form
      aria-busy={mutation.isPending}
      aria-label="Rename artwork"
      className="relative flex h-6 min-w-0 flex-1 items-center gap-2"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDownCapture={() => {
        pointerDownWithinRootRef.current = true;
        window.setTimeout(() => {
          pointerDownWithinRootRef.current = false;
        }, 0);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      ref={rootRef}
    >
      <h1 className="sr-only">{name}</h1>
      <input
        aria-invalid={failed || undefined}
        aria-label="Artwork name"
        className={`${TITLE_TYPE} artwork-name-field h-5 rounded-none text-foreground outline-none transition-shadow duration-200 ease-out sm:h-6 ${
          failed
            ? "artwork-name-error shadow-[0_2px_0_0_var(--color-destructive)]"
            : "shadow-[0_2px_0_0_var(--color-input)] focus:shadow-[0_2px_0_0_var(--color-ring)]"
        }`}
        disabled={mutation.isPending}
        maxLength={MAX_ARTWORK_NAME_LENGTH}
        onChange={(event) => {
          setDraft(event.target.value);
          setValidationError("");
          mutation.reset();
        }}
        ref={inputRef}
        value={draft}
      />
      <Button
        aria-label="Cancel"
        className="shrink-0 sm:h-10 sm:min-h-10 sm:w-auto sm:px-3"
        disabled={mutation.isPending}
        onClick={cancel}
        size="icon"
        variant="ghost"
      >
        <Close height={18} width={18} />
        <span className="hidden sm:inline">Cancel</span>
      </Button>
      <Button
        aria-label="Save"
        className="shrink-0 sm:h-10 sm:min-h-10 sm:w-auto sm:px-3"
        disabled={mutation.isPending}
        size="icon"
        type="submit"
        variant="secondary"
      >
        <Check height={18} width={18} />
        <span className="hidden sm:inline">Save</span>
      </Button>
      {failed ? (
        <p
          className="popover-surface absolute top-full left-0 z-20 mt-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-destructive text-xs"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
