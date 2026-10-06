# CK-02-05 — Round 1 review

**Task:** CK-02-05, connect the player controller and camera
**Reviewer/model/agent:** independent reviewer `/root/ck_02_05_reviewer_r1`, GPT-6 Luna
**Builder:** `/root/ck_02_05_builder`, frozen submission
**Verdict:** **CHANGES REQUIRED**

## Snapshot and scope

Reviewed the builder's exact 13-path submission recorded in `/tmp/cryptkeep-CK-02-05-submission.json`. All 13 current SHA-256 hashes matched that manifest at review time. The accepted `src/app/floor-session.ts` hash is `238faa09ca421da69e11dcf9807acc6b1d5614239e44404fd69f99ecdd7fd9a2`; it has no task diff. Scope covered the player session/capture integration, shell and diagnostics, movement browser checks, docs, evidence images and handoff. No implementation or accepted prerequisite files were changed.

The before/after screenshots at `docs/evidence/CK-02-05/before.png` and `docs/evidence/CK-02-05/after.png` were opened and inspected. They show the generated first-person room and the changed view after capture/mouse movement. Their hashes matched the submission manifest. The browser wall test derives a generated cardinal solid face, reaches the radius-expanded face, checks full-circle validity and asserts zero velocity into the wall.

## Checks

- `npm run verify` — passed: typecheck, 20 Vitest files / 107 tests, 7 Node tooling tests, production build, and 13 Playwright checks (development and production). The build emitted the existing >500 kB chunk advisory.
- Temporary browser repro (removed afterward), `npx playwright test tests/e2e/reviewer-tmp.spec.ts --project=development` — passed as a probe. With capture active, a synthetic `keydown` for W with `repeat: true` after blur/capture cancellation and a fresh Explore gesture moved the player. Separately, after holding W, focusing the seed input while capture remained active did not cancel movement; the player continued moving while the editable input had focus.
- Source inspection confirms the Explore button's click listener is added but has no matching removal in teardown. `shell.dispose()` detaches its DOM but the retained shell object still owns the button and its listener.
- `src/app/floor-session.ts` is byte-for-byte unchanged. No temporary repro source remains.

## Findings

### CK-02-05-R1-F01 — Held movement continues after editable focus

**Priority:** P2
**Location:** `src/app/player-session.ts:37-44`
**Requirement:** Gameplay keystrokes must not feed from editable controls; the task packet requires probing held-W → focus field → keyup, and the app must stop movement on inactive input conditions.
**Reproduction:** Start the app, capture the canvas, hold W, focus the seed input while the canvas remains captured (the browser repro used `document.querySelector('input').focus()`), and wait before releasing W.
**Expected:** Input focus cancels or suspends gameplay movement immediately; the player pose remains fixed while the field is focused.
**Actual:** The keydown handler ignores new keys aimed at editable elements but leaves the already-held W action active. The repro kept `active=true` and `capture="captured"`; the player moved from Z 33.6133 to Z 32.7383 while the seed input had focus.
**Correction guidance:** Clear/cancel held gameplay input when focus enters an editable control, with safe release behavior on the way back.

### CK-02-05-R1-F02 — Repeated keydown can restart movement after cancellation

**Priority:** P2
**Location:** `src/app/player-session.ts:37-45`
**Requirement:** SPEC section 4.3 / CK-00-06 acceptance requires repeat keydown to create no repeat press; the task packet also requires semantic cancellation to prevent stale held input across resume.
**Reproduction:** Capture the canvas, move with W, cause blur/capture cancellation, explicitly click Explore to recapture, then dispatch/receive the OS repeat keydown for W (`repeat: true`) while the physical key is still held.
**Expected:** A repeat keydown does not create a fresh movement press after cancellation; movement waits for a new non-repeat press.
**Actual:** `onKeyDown` has no `event.repeat` check. Since cancellation clears the sampler's held set, the repeat is accepted as a fresh press. The browser repro moved from Z 35 to Z 34.2867 following the repeated keydown after resume.
**Correction guidance:** Ignore repeated DOM keydown events for gameplay actions so cancellation cannot turn a physical held key's repeat into a fresh press.

### CK-02-05-R1-F03 — Explore listener survives teardown

**Priority:** P3
**Location:** `src/main.ts:51-57,108`
**Requirement:** The task packet requires pagehide/support cleanup to remove listeners and prevent lifecycle revival; M01 cleanup ownership is retained.
**Reproduction:** Observe setup registering `onExplore` on `shell.exploreButton`, then invoke pagehide teardown. Teardown removes the form submit listener and global listeners but never removes the Explore click listener. `shell.dispose()` only detaches root children; the module-level `shell` continues to retain the button and its callback.
**Expected:** Teardown removes every app-owned listener, including the Explore click handler.
**Actual:** The detached button retains `onExplore` for the lifetime of the retained shell object. It currently returns because `player` is null, so no revival was observed, but the listener/callback ownership is not released.
**Correction guidance:** Retain/remove the named Explore handler in teardown alongside the form handler.

## Limitations

The suite's existing typing case starts W only after focusing the input, so it does not cover the held-W focus transition. The repeat-after-cancel and focus-transition results above came from the temporary real-browser probe. No claim is made about real-hardware rendering performance or browsers other than the configured Chromium.
