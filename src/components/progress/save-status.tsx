import Save from "@/components/icons/save.svg?react";
import type { ProgressSaveStatus } from "@/coloring/progress-storage";

interface SaveStatusProps {
  status: ProgressSaveStatus;
}

export function SaveStatus({ status }: SaveStatusProps) {
  return (
    <div aria-live="polite" className="flex h-4 shrink-0 items-center text-[10px] leading-none" role="status">
      <span
        className={`inline-flex items-center gap-1 transition-[color,opacity,transform] duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transform-none motion-reduce:transition-[color,opacity] ${
          status === "error" ? "text-destructive" : "text-muted-foreground"
        } ${status === "idle" ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        <span className={status === "saving" ? "animate-pulse motion-reduce:animate-none" : undefined}>
          <Save height={16} width={16} />
        </span>
        {status === "saving" ? <span className="sr-only">Saving</span> : null}
        {status === "saved" ? <span className="sr-only">Saved locally</span> : null}
        {status === "error" ? <span>Not saved</span> : null}
      </span>
    </div>
  );
}
