import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface ToolButtonProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed: boolean;
  selected?: boolean;
}

export function ToolButton({ children, label, onClick, pressed, selected = pressed }: ToolButtonProps) {
  return (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className="shrink-0 data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
      data-selected={selected}
      onClick={onClick}
      size="icon"
      title={label}
      variant="secondary"
    >
      {children}
    </Button>
  );
}
