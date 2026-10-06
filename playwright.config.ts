import { defineConfig } from "@playwright/test";
import browserConfig from "./tools/cloud-browser.json" with { type: "json" };

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  reporter: "list",
  workers: 2,
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: browserConfig.args,
    },
  },
});
