import { defineConfig } from "@playwright/test";
import browserConfig from "./tools/cloud-browser.json" with { type: "json" };

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  reporter: "list",
  // CI uses software WebGL; two full-resolution Chromium pages contending for one runner
  // starve requestAnimationFrame and make native input timing nondeterministic.
  workers: process.env.CI ? 1 : 2,
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: browserConfig.args,
    },
  },
  webServer: [
    { command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort", url: "http://127.0.0.1:5173/", reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort", url: "http://127.0.0.1:4173/", reuseExistingServer: !process.env.CI, timeout: 30_000 },
  ],
  projects: [
    { name: "development", testIgnore: /production\.spec\.ts$/, use: { baseURL: "http://127.0.0.1:5173" } },
    { name: "production", testMatch: /production\.spec\.ts$/, use: { baseURL: "http://127.0.0.1:4173" } },
  ],
});
