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
    <button
      aria-label={label}
      aria-pressed={pressed}
      className="grid size-12 shrink-0 place-items-center rounded-md border border-border bg-foreground/5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2 data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
      data-selected={selected}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
