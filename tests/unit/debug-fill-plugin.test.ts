import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transformDebugFill } from "../../scripts/vite/debug-fill-plugin";

const playRouteSource = readFileSync(new URL("../../src/routes/play.$levelId.tsx", import.meta.url), "utf8");
const INTEGRATION_ERROR_PATTERN = /Expected one import and one JSX element/;

describe("transformDebugFill", () => {
  it("removes the debug import and control from the real production play route", () => {
    const productionSource = transformDebugFill(playRouteSource, false);

    expect(productionSource).not.toContain("DebugFillControl");
    expect(productionSource).not.toContain("Fill canvas for debugging");
  });

  it("leaves the real play route unchanged for an enabled debug server", () => {
    expect(transformDebugFill(playRouteSource, true)).toBe(playRouteSource);
  });

  it("fails closed when the expected App integration changes", () => {
    const sourceWithoutControl = playRouteSource.replaceAll("DebugFillControl", "RemovedControl");

    expect(() => transformDebugFill(sourceWithoutControl, false)).toThrow(INTEGRATION_ERROR_PATTERN);
  });
});
