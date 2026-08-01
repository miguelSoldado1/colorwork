import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface ToolButtonProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed: boolean;
  shortcut?: string;
}

export function ToolButton({ children, label, onClick, pressed, shortcut }: ToolButtonProps) {
  return (
    <Button
      aria-keyshortcuts={shortcut}
      aria-label={label}
      aria-pressed={pressed}
      className="shrink-0 aria-pressed:border-primary/30 aria-pressed:bg-primary/12 aria-pressed:text-primary"
      onClick={onClick}
      size="icon"
      title={shortcut ? `${label} (${shortcut.toUpperCase()})` : label}
      variant="secondary"
    >
      {children}
    </Button>
  );
}
