import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { clearAchievementHistory } from "@/achievements/achievement-storage";
import Trash from "@/assets/icons/trash.svg?react";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/try-catch";

export function ClearAchievementHistoryControl() {
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  async function clearHistory() {
    setClearing(true);
    setError("");

    const clearResult = await tryCatch(clearAchievementHistory());
    if (clearResult.error) {
      setError("Couldn't clear the achievement history.");
      setClearing(false);
      return;
    }

    const navigationResult = await tryCatch(navigate({ to: "/" }));
    if (navigationResult.error) {
      setError("The history was cleared, but the artwork menu couldn't be opened.");
      setClearing(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <Button aria-busy={clearing} disabled={clearing} onClick={clearHistory} size="compact" variant="destructiveGhost">
        <Trash aria-hidden className="shrink-0" height={18} width={18} />
        Clear history
      </Button>
      {error ? (
        <p className="max-w-64 text-right text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
