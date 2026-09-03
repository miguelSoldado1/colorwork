import { toast } from "sonner";
import Sparkle from "@/assets/icons/sparkle.svg?react";
import type { CSSProperties } from "react";

export interface AchievementToastDetails {
  description: string;
  name: string;
}

// An unlock is read, not acted on, so it stays longer than a confirmation would.
const DURATION = 6000;

export function showAchievementToast({ description, name }: AchievementToastDetails) {
  return toast(
    <span className="flex min-w-0 flex-col">
      <span className="text-[10px] text-primary uppercase leading-none tracking-[0.18em]">Achievement unlocked</span>
      <span className="mt-1.5 font-semibold text-[15px] leading-tight">{name}</span>
    </span>,
    {
      className: "achievement-toast",
      description,
      duration: DURATION,
      icon: (
        <span className="grid size-10 place-items-center rounded-sm border border-primary/35 bg-primary/12 text-primary">
          <Sparkle height={24} width={24} />
        </span>
      ),
      style: { "--achievement-toast-duration": `${DURATION}ms` } as CSSProperties,
    }
  );
}
