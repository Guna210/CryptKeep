# CK-02-04 review — round 2

- **Task:** CK-02-04, Implement mouse look and pointer capture
- **Round/reviewer/model/agent:** Round 2, independent reviewer, GPT-6 Luna, `/root/ck_02_04_reviewer_r2`
- **Builder/fixer:** `/root/ck_02_04_builder`; prior fix handoff: `progress/CK-02-04.round-1-fix.md`.
- **Baseline:** `eaf442ed35e3ad53feefbd767aaaaca9a01e7d14`; submission is uncommitted.
- **Scope:** Read `REVIEW.md` in full; SPEC Sections 0, 1.3, 3.2–3.4, 7.3, 8.1 and task card CK-02-04; `docs/environment-start.md`; accepted CK-00-02 and CK-00-06 handoffs and CK-00-06 review; CK-02-04 progress, round-1 fix handoff, round-1 review and round-1 verification; all nine task files listed below. `CONTEXT.md` has concurrent orchestrator edits and is excluded. Reviewed the pointer-capture adapter, its unit tests, look implementation/tests, test harness and browser test.
- **Ownership:** Source, tests, harness, SPEC, configuration and context remained read-only. Temporary reproductions were written only under `/tmp`. This report is the only repository file written by this reviewer.

## Submission identity

The exact nine-path manifest is `/tmp/cryptkeep-CK-02-04-repaired.json`. I independently recomputed all SHA-256 values; each matched the manifest both at inspection and after reproductions:

```json
{
  "src/app/pointer-capture.ts": "18c4c8995e168c5ddf3cc741fdff698337955c4456124f8f02c21835f93db02c",
  "src/app/pointer-capture.test.ts": "579bc4510896d386a391f5b5209b2f533f7917a7cf0c70c14e54a0918de16373",
  "src/player/look.ts": "6d2d487f28068c7a4810061acad390aa4830733a9d41075abd16a41f9f08f87e",
  "src/player/look.test.ts": "a2c492624469b618146ed8458188f623238f8cf352f3d8d3f7b5a46187fc8e4a",
  "tests/harness/pointer-capture.html": "5d276a85d701ed70b4a6b1d396c249a6f5eb0140e64f96e7891cc7b435ba0f0e",
  "tests/harness/pointer-capture.ts": "d2d109ae1af35da7009656fb711c00897d1d4a765559fe175dbcbc79f6dac2f3",
  "tests/e2e/pointer-capture.spec.ts": "a1aa281c2713a87a64ea4843e3e09e19aef21ceef669c3047acd6ac52c858c95",
  "progress/CK-02-04.md": "b01163ae68df3319b7fc049a05c6353e63f44fdab4b2e9b8d9e6b151c9842fc7",
  "progress/CK-02-04.round-1-fix.md": "4923e36640178ce0215843eb0524ab4dffb38d6aabbb95f54be54c5ca72ebc41"
}
```

## Checks and evidence

- `sha256sum` over all nine manifest paths — all matched the frozen values above.
- `./node_modules/.bin/vitest run --config /tmp/ck02-r2-vitest.config.ts /tmp/ck02-r2-repro.test.ts` — four focused simulated lifecycle cases all failed their safety assertions, reproducing the finding below. The test and config are under `/tmp/`; the scenarios use the submitted adapter with an event-target model, not native legacy-browser evidence.
- The round-1 verification already passed `npm test` (20 files / 104 tests and tooling tests), typecheck, build, and the native Chromium capture E2E (2/2) against these exact nine hashes. I did not rerun those unchanged broad checks; the targeted reproductions specifically exercise the untested cancellation/overlap sequence.
- Native browser capture, relative movement, Escape, recapture, blur, external unlock and disposal are covered by that prior native E2E evidence. Legacy `void` request settlement and denial remain simulated; no native legacy implementation is available in this environment.
- Look math and the current cases satisfy the stated default sensitivity, invert handling, unclamped yaw/full turns and ±85° pitch clamp. No additional confirmed look or scope defect was found.

## Findings

### CK-02-04-R1-F03 — Canceled request lifetime is forgotten, leaking or misattributing late settlement (P2, unresolved)

**Locations:** `src/app/pointer-capture.ts:147–148`, `170–176`, `90–105`, and `110–144`.

The adapter clears `requestPending` and `pendingMode` on blur/Escape cancellation even though a legacy `requestPointerLock()` returning `void` has no cancellation handle. The same browser-level `pointerlockchange` / `pointerlockerror` events carry no request identifier. Therefore a new gesture can begin while the earlier native request is still outstanding, and the old request's terminal event is treated as the new request's result. Disposal after cancellation also fails to retain guards because it only tests the now-cleared `requestPending` and `pendingMode` fields.

Reproduction: in `/tmp/ck02-r2-repro.test.ts`, (1) legacy A returns `void`; blur cancels A; dispose; then A acquires the surface and dispatches `pointerlockchange`. The disposed adapter remains disposed but the surface stays locked and `exitPointerLock` is never called. (2) Legacy A returns `void`; blur cancels A; gesture B starts; then A's late `pointerlockchange` moves B to `captured` even though B has not settled. (3) The analogous late `pointerlockerror` from A moves B to `failed`. These are simulated event-order reproductions, not claims of native legacy-browser execution.

The correlated promise path shows the same overlap hazard in a simulated ordering: promise request A is canceled, B begins, then A's lock event arrives before A's stale promise callback; `handleLockChange` attributes the event to the current generation and marks B captured. This is evidence for preserving native-request lifetime independently of logical cancellation. It is not a separate finding: a bounded policy that serializes all still-outstanding native requests covers both promise and legacy modes.

Expected behavior is that canceling input immediately clears actions and returns the logical state to idle, while the adapter retains honest knowledge that a native request remains outstanding. A late result for a canceled request must release this surface's lock and must not auto-start or settle a later request. Do not issue another native request until the prior one reaches a terminal event; after that, retry still requires a fresh explicit gesture. After disposal, keep only minimal terminal guards until outstanding requests settle, release a late lock only when this surface owns it, then remove the guards. Preserve immediate ordinary-listener cleanup and never release another surface's lock.

## Verdict

**CHANGES REQUIRED.** Round-1 F01 and F02 remain resolved on the exact frozen snapshot. R1-F03 is confirmed and broader than the disposal-only reproduction: cancel-then-retry can also attribute the prior request's global lock/error event to the new request. The round-1 native checks remain useful for normal browser behavior, but the legacy and overlapping-request lifecycle cases are simulated and currently fail. No other confirmed in-scope defect was found.
