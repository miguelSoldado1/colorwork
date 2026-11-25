import { useEffect, useEffectEvent } from "react";

export interface KeyboardShortcut {
  key: string;
  onTrigger: () => void;
}

export function useKeyboardShortcuts(shortcuts: readonly KeyboardShortcut[]) {
  const getShortcuts = useEffectEvent(() => shortcuts);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || hasModifier(event) || isEditingTarget(event.target)) {
        return;
      }

      const key = normalizeShortcutKey(event.key);
      const shortcut = getShortcuts().find((candidate) => normalizeShortcutKey(candidate.key) === key);
      if (!shortcut) {
        return;
      }

      event.preventDefault();
      shortcut.onTrigger();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

export function normalizeShortcutKey(key: string) {
  return key.toLowerCase();
}

function hasModifier(event: KeyboardEvent) {
  return event.altKey || event.ctrlKey || event.metaKey || (event.shiftKey && event.key !== "?");
}

export function isEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}
