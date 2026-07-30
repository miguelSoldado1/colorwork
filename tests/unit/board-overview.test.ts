import { describe, expect, it } from "vitest";
import { fitOverview } from "../../src/components/board/board-overview";

describe("fitOverview", () => {
  it.each([
    { expected: { height: 80, width: 80 }, height: 64, name: "square", width: 64 },
    { expected: { height: 80, width: 160 }, height: 64, name: "landscape", width: 128 },
    { expected: { height: 80, width: 40 }, height: 128, name: "portrait", width: 64 },
    { expected: { height: 16, width: 160 }, height: 64, name: "very wide", width: 640 },
    { expected: { height: 80, width: 8 }, height: 640, name: "very tall", width: 64 },
  ])("fits a $name puzzle without changing its aspect ratio", ({ expected, height, width }) => {
    const size = fitOverview(width, height, { height: 80, width: 160 });

    expect(size).toEqual(expected);
    expect(size.width / size.height).toBe(width / height);
  });

  it("uses the smaller responsive limits on mobile", () => {
    expect(fitOverview(128, 64, { height: 48, width: 96 })).toEqual({ height: 48, width: 96 });
    expect(fitOverview(64, 128, { height: 48, width: 96 })).toEqual({ height: 48, width: 24 });
  });
});
