import { afterEach, describe, expect, it, vi } from "vitest";
import { ACHIEVEMENTS } from "@/achievements/achievement-catalog";
import { runAchievementCheck } from "@/achievements/run-achievement-check";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("runAchievementCheck", () => {
  it("returns every newly unlocked achievement", async () => {
    const achievements = await runAchievementCheck(async () => [ACHIEVEMENTS[0], ACHIEVEMENTS[1]]);

    expect(achievements).toEqual([ACHIEVEMENTS[0], ACHIEVEMENTS[1]]);
  });

  it("retries a failed check before returning achievements", async () => {
    vi.useFakeTimers();
    const check = vi
      .fn()
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockRejectedValueOnce(new Error("Second attempt failed"))
      .mockResolvedValueOnce([ACHIEVEMENTS[0]]);

    const result = runAchievementCheck(check);
    await vi.runAllTimersAsync();

    expect(check).toHaveBeenCalledTimes(3);
    await expect(result).resolves.toEqual([ACHIEVEMENTS[0]]);
  });

  it("logs the final error without rejecting when every attempt fails", async () => {
    vi.useFakeTimers();
    const error = new Error("Storage unavailable");
    const check = vi.fn().mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = runAchievementCheck(check);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual([]);
    expect(check).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith("[achievements] Achievement check failed after retries.", error);
  });
});
