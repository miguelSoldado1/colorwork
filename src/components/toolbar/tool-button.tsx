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
      className="grid size-12 shrink-0 place-items-center rounded-xl border border-ink/10 bg-ink/5 text-faint transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-3 focus-visible:outline-violet focus-visible:outline-offset-2 data-[selected=true]:border-violet data-[selected=true]:bg-violet data-[selected=true]:text-ink"
      data-selected={selected}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
