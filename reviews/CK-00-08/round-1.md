# CK-00-08 review — round 1

- **Task:** CK-00-08, Create browser harness and diagnostic boundary
- **Reviewer/model/agent:** independent reviewer, `gpt-6-luna`, `/root/ck_00_08_reviewer_r1`
- **Builder:** `/root/ck_00_08_builder` (model/agent metadata not included in the submitted handoff)
- **Baseline:** `ba8b935cb4bebe2e9258bb2cae9ae9100ff8a6ab`
- **Reviewed snapshot:** uncommitted round-1 submission. Parent-owned `CONTEXT.md` is excluded.
- **Scope reviewed:** all 11 manifest-listed files, including untracked `src/debug/index.ts`, the browser harness and the new diagnostic/production specs; related `src/app/shell.ts`, renderer interfaces, Playwright configuration, package scripts and startup documentation. Accepted CK-00-02/03 handoffs and CK-00-03 review/verification were read. No applicable `AGENTS.md` was found.

## Submission identity

`/tmp/cryptkeep-CK-00-08-r1-manifest.json` identified task CK-00-08, round 1, baseline above, and 11 changed paths. Every listed SHA-256 matched before and after inspection and checks:

| File | SHA-256 |
| --- | --- |
| `README.md` | `36c59f6c9ab118899456d45684f4feb570befa7c806244c5ab9121701fdde035` |
| `docs/environment-start.md` | `418d9f441615cccd23334ffc9ea3e59fba525fd4bdbc42aebffe8b551d2c76a0` |
| `package.json` | `d9b1194679993c5bd91f461c9d5dba3cfa8c578c38a97d451a1affeb22b63463` |
| `playwright.config.ts` | `9434310b2f4cad8d30dbe1b644175834e5278ae22c3de2b336be6fca0543631f` |
| `progress/CK-00-08.md` | `82182220b0cc1286cc80b49adc721e1922d4b813868b231a2ec08f961f49a88b` |
| `src/debug/index.ts` | `0e6699550f9be5fada08f9a4ea2799e9b757f0c59b623cf1fadcd1ecac378c4f` |
| `src/main.ts` | `1f34a2b7929a619b097551d4587bc5a541d31534180e1803fcb1ab307a541b6c` |
| `tests/e2e/diagnostics.spec.ts` | `5ba7eaf8ddf10ba825ad0d036f71d976caa9d902f6039798827109f49842ff6d` |
| `tests/e2e/production.spec.ts` | `0ce0cfbbc5ad68c7b78e11f4e62a84428b56095e6fabb1edab66b5ffecb611f2` |
| `tests/e2e/shell.spec.ts` | `102a77e7192e65179d6526097389e210cb09956ecb4b554e9953ba1baa73ba03` |
| `tests/harness/browser.ts` | `5fec10d7f4834744066e718cd998c15b8c1fd324d23bea319f267f8283207a75` |

The worktree also has the parent-owned `CONTEXT.md` edit; it was not read as part of the submission identity and was left untouched.

## Independent checks and evidence

- `npm test` — passed: 5 test files, 25 tests.
- `npm run typecheck` — passed.
- `npm run build` — passed. Vite emitted the existing 500 kB chunk-size warning (output chunk 533.22 kB).
- `npm run test:e2e` — passed, 5/5 in the configured `/usr/bin/chromium`: routed negative control; application shell/readiness/diagnostics/teardown; unsupported-WebGL2 fallback; existing renderer lifecycle; production preview.
- The negative-control route emitted actual `console.error("negative-control-console-error")` and an uncaught asynchronous page exception. The harness captured both before navigation, and `assertNoErrors()` produced a failure message naming each. The test itself passed only after inspecting that actual rejection message.
- The development harness attaches `pageerror` and `console` listeners when its fixture initializes, before each test's navigation, returns copied error arrays, and removes listeners in `finally`.
- The diagnostics snapshot returns current readiness and a detached renderer-count copy; both the renderer copy and containing snapshot are frozen. Readiness reports `unsupported` when WebGL2 is unavailable. The test dispatches `pagehide` and confirms the dev global is removed. Main's added integration is limited to diagnostics/readiness and the existing renderer lifecycle; it does not add gameplay or URL-controlled test behavior.
- The production Playwright project serves `dist/` separately and visits with `?debug=1&diagnostics=1&test=1`; it confirms visible title/status/canvas output and no global. `rg -n '__cryptkeepDiagnostics' dist` returned no matches.
- Playwright retains development project discovery for the existing renderer and shell specs while excluding only `production.spec.ts`; production selects that spec separately. `test:e2e` builds before running Playwright.
- `git diff --check` — passed.
- Opened and inspected `test-results/CK-00-08/shell.png`: the Three.js preview is visibly rendered and the DOM title/status text is legible. The screenshot is from headless system Chromium/software rendering and does not establish GPU performance or gameplay behavior.

## Findings

No confirmed in-scope findings.

## Assessment

The submitted harness detects real browser console and uncaught page errors, reports readiness, and cleans up listeners. Development diagnostics are detached, frozen, honest about unsupported WebGL2, and removed on page teardown. The production bundle and query-string check demonstrate that the diagnostic global is absent in production. Existing renderer lifecycle coverage remains discovered and passes. Startup notes describe the new execution flow and limits accurately. The builder handoff omits its explicit model/agent and baseline header; this is a handoff metadata gap, not a gameplay or acceptance behavior defect, and can be recorded in the orchestrator's acceptance metadata as directed.

**Verdict: PASS.**
