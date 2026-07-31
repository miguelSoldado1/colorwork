import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { debugFillPlugin } from "./build/debug-fill-plugin";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const debugFillEnabled =
    command === "serve" && (process.env.VITE_DEBUG !== undefined || fileEnv.VITE_DEBUG !== undefined);

  return {
    plugins: [
      debugFillPlugin(debugFillEnabled),
      // '@tanstack/router-plugin' must come before '@vitejs/plugin-react'.
      tanstackRouter({ autoCodeSplitting: true, target: "react" }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
  };
});
