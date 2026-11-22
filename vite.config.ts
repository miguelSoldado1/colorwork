import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";
import { debugFillPlugin } from "./scripts/vite/debug-fill-plugin";
import { prerenderPlugin } from "./scripts/vite/prerender-plugin";
import { sitemapPlugin } from "./scripts/vite/sitemap-plugin";

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
      svgr({ include: "**/*.svg?react" }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      sitemapPlugin({}),
      prerenderPlugin(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
  };
});
