import { Button } from "@/components/ui/button";
import { useTooltip } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

interface ToolButtonProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed: boolean;
  shortcut?: string;
}

export function ToolButton({ children, label, onClick, pressed, shortcut }: ToolButtonProps) {
  const { tooltip, triggerProps } = useTooltip({ label, shortcut });

  return (
    <>
      <Button
        aria-keyshortcuts={shortcut}
        aria-label={label}
        aria-pressed={pressed}
        className="shrink-0 aria-pressed:border-primary/40 aria-pressed:bg-primary/16 aria-pressed:text-primary"
        focusTone="neutral"
        onClick={onClick}
        size="icon"
        transition="press"
        variant="secondary"
        {...triggerProps}
      >
        {children}
      </Button>
      {tooltip}
    </>
  );
}
