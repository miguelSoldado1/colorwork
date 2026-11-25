import { useEffect, useState } from "react";
import { isEditingTarget } from "@/keyboard/use-keyboard-shortcuts";

export function useSpaceHeld() {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let clickedButton: EventTarget | null = null;

    function handleFocusIn({ target }: FocusEvent) {
      clickedButton = target instanceof HTMLButtonElement && !target.matches(":focus-visible") ? target : null;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.code !== "Space") {
        return;
      }
      if (event.type === "keyup") {
        setHeld(false);
      }
      const tabbedButton = event.target instanceof HTMLButtonElement && event.target !== clickedButton;
      if (isEditingTarget(event.target) || tabbedButton) {
        return;
      }
      event.preventDefault();
      if (event.type === "keydown") {
        setHeld(true);
      }
    }

    function release() {
      setHeld(false);
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    window.addEventListener("blur", release);
    window.addEventListener("focusin", handleFocusIn);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("blur", release);
      window.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return held;
}
