import { expect, test as base, type ConsoleMessage, type Page } from "@playwright/test";

export interface BrowserFailureReport {
  pageErrors: string[];
  consoleErrors: string[];
}

export interface BrowserHarness {
  waitForReadiness(): Promise<"ready" | "unsupported">;
  report(): BrowserFailureReport;
  assertNoErrors(): void;
}

export const test = base.extend<{ browserHarness: BrowserHarness }>({
  browserHarness: async ({ page }, use) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const onPageError = (error: Error) => pageErrors.push(error.message);
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    page.on("pageerror", onPageError);
    page.on("console", onConsole);

    const harness: BrowserHarness = {
      async waitForReadiness() {
        const label = page.locator(".cryptkeep__status-label");
        await expect(label).toHaveText(/^(DUNGEON PREVIEW|RENDERING UNAVAILABLE)$/);
        const text = await label.textContent();
        return text === "DUNGEON PREVIEW" ? "ready" : "unsupported";
      },
      report() {
        return { pageErrors: [...pageErrors], consoleErrors: [...consoleErrors] };
      },
      assertNoErrors() {
        const report = this.report();
        const failures = [
          ...report.pageErrors.map((message) => `pageerror: ${message}`),
          ...report.consoleErrors.map((message) => `console.error: ${message}`),
        ];
        expect(failures, `Browser reported errors:\n${failures.join("\n")}`).toEqual([]);
      },
    };

    try {
      await use(harness);
    } finally {
      page.off("pageerror", onPageError);
      page.off("console", onConsole);
    }
  },
});

export { expect };
export type { Page };
