import { defineConfig } from "@playwright/test";
import browserConfig from "./tools/cloud-browser.json";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  reporter: "list",
  workers: 2,
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: browserConfig.args,
    },
  },
});
