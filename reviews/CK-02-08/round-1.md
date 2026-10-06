# CK-02-08 independent review — round 1

**Reviewer/model:** `/root/ck_02_08_reviewer_r1`, GPT-6 Luna
**Builder:** `/root/ck_02_08_builder`
**Baseline:** `ebe9d5bf2b7feac3ee08b3344da635a4ea3ca251`
**Snapshot:** uncommitted 13-path submission identified by the SHA-256 manifest below. Main-owned `CONTEXT.md` was read as coordination context and excluded from review scope. I made no source, test, configuration, evidence, or Git changes.

## Scope and review

I read `REVIEW.md`, the CK-02-08 task card and related time/input/player rules in `SPEC.md`, `CONTEXT.md`, `docs/environment-start.md`, the CK-02-04/05/06/07 handoffs and the CK-02-08 handoff. I inspected all 13 submitted files, their integration with the existing pointer-capture adapter, floor clock and shell, and the relevant existing movement, dash, floor and pointer-capture checks.

The new coordinator owns high-level loading/available/playing/paused/requesting/waiting/unavailable/unsupported/disposed state while delegating native capture and clock control to `PlayerSession` and `FloorSession`. Resume and initial Explore call the existing native request directly from the button click handler; only a captured callback resumes the clock, with `performance.now()` establishing the new baseline. Capture loss clears input, zeros velocity and cancels dash/evasion while preserving the paid cost and cooldown. The existing sampler cancellation behavior does not turn canceled primary/secondary actions into release edges. Loading suppresses Resume and successful rerolls return to paused state. Initial-generation failure leaves the form available with Explore disabled; a successful retry becomes available. Pagehide cleanup removes the Resume listener and the retained Explore listener and prevents retained controls from reviving the app.

The submitted E2E suite covers a real Chromium pointer-lock pause/resume, stationary paused pose/resource/timer/cooldown/tick freeze, a fresh post-resume action, held primary/secondary cancellation, visibility restoration without auto-resume, simulated denied capture followed by a fresh real gesture, failed and successful paused rerolls, and idempotent pagehide cleanup. Existing dash tests preserve exact paused cost/freeze assertions and bound legitimate post-resume regeneration; the generated-wall movement test waits for fixed ticks with drained look and stable yaw before measuring alignment. The selected `docs/evidence/CK-02-08/pause.png` is legible at 1280×720: the Resume panel is centered, its status/help/button have clear contrast and spacing, the seed/Generate controls remain readable and reachable, and keyboard focus has a visible cyan outline style. It is an actual paused-state capture.

The denial and visibility cases are explicit browser-fixture simulations. Blur is exercised by dispatched browser events in the existing movement/pointer-capture coverage; it is not an OS-level window-focus automation claim. Native successful pointer capture and resume were exercised in real Chromium. The UI-specific canceled-outstanding-request waiting text is implemented and the accepted pointer-capture tests cover the adapter's canceled-request settlement policy, though there is no new end-to-end UI test that deliberately holds a native request promise open. Unsupported WebGL2 fallback is exercised by the existing browser suite. Initial generation-failure recovery is covered by code paths and existing floor recovery coverage; the new pause E2E directly verifies invalid reroll recovery on the retained floor and successful reroll while paused.

## Checks

- `npm run verify` — **passed**. Typecheck passed; Vitest reported 23 files / 120 tests passed; Node tooling reported 7/7 passed; production build passed (existing Vite advisory: the minified JS chunk is 614.53 kB, above its 500 kB advisory threshold); browser suite passed 20/20 across development and production Chromium. This included the native pause/resume flow, simulated visibility/denial cases, paused seed reroll, pagehide teardown, movement/wall, dash and accepted pointer-capture regressions.
- `git diff --check` — **passed**.
- Opened and inspected `docs/evidence/CK-02-08/pause.png` directly; its SHA-256 remained the manifest value.

The full verification used a network-enabled sandbox command for browser server binding. No install, deployment, manual mock in application code, or Git mutation was performed. There were no check failures to conceal or investigate.

## Findings

No confirmed in-scope defects found. No findings IDs are assigned.

## Verdict

**PASS.** The frozen submission meets the scoped pause, input cancellation, native gesture resume, clock baseline reset, reroll, teardown, regression and evidence requirements. Limits are the stated distinction between real native capture and simulated hidden/denied/blur events, and the lack of OS-level focus automation.

## Frozen path-to-SHA-256 manifest

The launch packet supplied the frozen manifest and stated it had been matched before review. After the full checks, I independently ran `sha256sum -c /tmp/ck0208.sha256` against that frozen manifest; all 13 paths returned `OK`. I therefore confirm the reviewed bytes still match the pre-review snapshot after testing:

```text
README.md 5994ee7b09a403601b03b828b9c1d6ac91bf8f09bf95bd4985b8d6c1eb217391
docs/environment-start.md 6213d9838099e4800280f4cd15a83743936ac2d0e3b3989a5871d7e97dfa0113
docs/evidence/CK-02-08/pause.png ce1427da676ee9a9d168df82bb3023a9637b03cc8072ed68f39425b9dab77c3f
src/app/pause.ts 451bc901c68e575e3d4c49c7293ac00b882e52fdcf24b9f8d392b40a4987df4e
src/app/pause.test.ts bb83caa12c3436102d9ce8665676ca1de3299c22de1219dc0a3dd9fb8e848b91
src/app/player-session.ts 5ddfa919b1f236f2b9db9aced105478fbe6967b84d683040e09b21f6126a5a83
src/main.ts efdb995b7e65b784e83ad45f0e8e17633db9eaf960a45dfcd4690c2f4bb22de1
src/ui/pause-minimal.ts d017a8c87f810f26089a97b96ef9958b74bbd2d5c726611eb1cf7a8fdf53133b
src/ui/shell.css df01e4a9bf124bdc5b3eb2fc83adb87665a2863f04653594c59dc3f5064cc4b5
tests/e2e/dash.spec.ts 7cd0d72e3f2b67c472669dd2a67ec9070d441876b6aa22e649e107dd903b03d3
tests/e2e/movement.spec.ts 87033a250a7155064131b46331ada0a77bc4729967c8e82a67420a66bb669e16
tests/e2e/pause.spec.ts fe0df62a64aa0466e6bcad2e7631143c1294678f6eb8b161e2b65e3c1ef65cf3
progress/CK-02-08.md 794b4c88f41380f9223d36225e194f55b26ad060fc0a9a4289ff8055c49480c2
```
