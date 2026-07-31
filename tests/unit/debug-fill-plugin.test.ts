import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transformDebugFill } from "../../build/debug-fill-plugin";

const appSource = readFileSync(new URL("../../src/app/app.tsx", import.meta.url), "utf8");
const INTEGRATION_ERROR_PATTERN = /Expected one import and one JSX element/;

describe("transformDebugFill", () => {
  it("removes the debug import and control from the real production App source", () => {
    const productionSource = transformDebugFill(appSource, false);

    expect(productionSource).not.toContain("DebugFillControl");
    expect(productionSource).not.toContain("Fill canvas for debugging");
  });

  it("leaves the real App source unchanged for an enabled debug server", () => {
    expect(transformDebugFill(appSource, true)).toBe(appSource);
  });

  it("fails closed when the expected App integration changes", () => {
    const sourceWithoutControl = appSource.replaceAll("DebugFillControl", "RemovedControl");

    expect(() => transformDebugFill(sourceWithoutControl, false)).toThrow(INTEGRATION_ERROR_PATTERN);
  });
});
