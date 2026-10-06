import { expect, test } from "../harness/browser";

test("browser harness captures page errors and console.error from a routed page", async ({ page, browserHarness }) => {
  await page.route("**/harness-negative-control.html", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><body><script>
      console.error("negative-control-console-error");
      setTimeout(() => { throw new Error("negative-control-page-error"); }, 0);
    </script></body></html>`,
  }));
  await page.goto("/harness-negative-control.html");
  await expect.poll(() => browserHarness.report().pageErrors.length).toBe(1);
  const report = browserHarness.report();
  expect(report.pageErrors[0]).toContain("negative-control-page-error");
  expect(report.consoleErrors).toContain("negative-control-console-error");

  let assertionMessage = "";
  try {
    browserHarness.assertNoErrors();
  } catch (error) {
    assertionMessage = error instanceof Error ? error.message : String(error);
  }
  expect(assertionMessage).toContain("pageerror: negative-control-page-error");
  expect(assertionMessage).toContain("console.error: negative-control-console-error");
});
