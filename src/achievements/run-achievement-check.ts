import type { AchievementDefinition } from "./achievement-catalog";

const RETRY_DELAYS = [250, 1000] as const;

export type AchievementCheck = () => Promise<readonly AchievementDefinition[]>;

export function runAchievementCheck(check: AchievementCheck) {
  return attemptAchievementCheck(check, 0);
}

async function attemptAchievementCheck(
  check: AchievementCheck,
  attempt: number
): Promise<readonly AchievementDefinition[]> {
  try {
    return await check();
  } catch (error) {
    const retryDelay = RETRY_DELAYS[attempt];
    if (retryDelay === undefined) {
      console.error("[achievements] Achievement check failed after retries.", error);
      return [];
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    return attemptAchievementCheck(check, attempt + 1);
  }
}
