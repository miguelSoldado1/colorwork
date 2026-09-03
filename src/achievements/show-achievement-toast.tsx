import { toast } from "sonner";
import Check from "@/assets/icons/check.svg?react";

export interface AchievementToastDetails {
  description: string;
  name: string;
}

export function showAchievementToast({ description, name }: AchievementToastDetails) {
  return toast(
    <span className="flex min-w-0 flex-col">
      <span className="text-[9px] text-primary uppercase tracking-[0.2em]">Achievement unlocked</span>
      <span className="mt-0.5 truncate font-semibold text-sm leading-tight">{name}</span>
    </span>,
    {
      description,
      icon: <Check height={24} width={24} />,
    }
  );
}
