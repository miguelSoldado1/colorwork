import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === "1";
const baseURL = usePreview ? "http://127.0.0.1:4173" : "http://127.0.0.1:5173";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      testIgnore: "**/mobile.smoke.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-smoke",
      testIgnore: "**/mobile.smoke.spec.ts",
      testMatch: "**/*.smoke.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-smoke",
      testIgnore: "**/mobile.smoke.spec.ts",
      testMatch: "**/*.smoke.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "webkit-mobile-smoke",
      testMatch: "**/mobile.smoke.spec.ts",
      use: { ...devices["iPhone 15 Pro"] },
    },
  ],
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  testDir: fileURLToPath(new URL("./tests/browser", import.meta.url)),
  testMatch: "**/*.spec.ts",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: usePreview ? "pnpm preview --host 127.0.0.1 --port 4173" : "pnpm dev --host 127.0.0.1",
    reuseExistingServer: !(process.env.CI || usePreview),
    url: baseURL,
  },
});
