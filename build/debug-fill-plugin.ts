import type { Plugin } from "vite";

const APP_MODULE_PATTERN = /\/src\/app\/app\.tsx(?:\?|$)/;
const DEBUG_FILL_IMPORT_PATTERN =
  /^import \{ DebugFillControl \} from "@\/components\/debug\/debug-fill-control";\s*$/m;
const DEBUG_FILL_ELEMENT_PATTERN = /\n\s*<DebugFillControl\b[\s\S]*?\/>/;
const DEBUG_FILL_BUNDLE_TOKENS = ["DebugFillControl", "Fill canvas for debugging"];

export function transformDebugFill(source: string, enabled: boolean) {
  const occurrenceCount = source.split("DebugFillControl").length - 1;
  if (occurrenceCount !== 2) {
    throw new Error(
      `[debug-fill] Expected one import and one JSX element in App, found ${occurrenceCount} references.`,
    );
  }

  if (enabled) {
    return source;
  }

  const transformed = source.replace(DEBUG_FILL_IMPORT_PATTERN, "").replace(DEBUG_FILL_ELEMENT_PATTERN, "");
  if (transformed.includes("DebugFillControl")) {
    throw new Error("[debug-fill] Production transform left debug fill code in App.");
  }

  return transformed;
}

export function debugFillPlugin(enabled: boolean): Plugin {
  return {
    enforce: "pre",
    generateBundle(_options, bundle) {
      if (enabled) {
        return;
      }

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }
        const leakedToken = DEBUG_FILL_BUNDLE_TOKENS.find((token) => output.code.includes(token));
        if (leakedToken) {
          throw new Error(`[debug-fill] Production bundle contains debug-only token: ${leakedToken}`);
        }
      }
    },
    name: "debug-fill",
    transform(source, id) {
      if (!APP_MODULE_PATTERN.test(id)) {
        return;
      }
      return transformDebugFill(source, enabled);
    },
  };
}
