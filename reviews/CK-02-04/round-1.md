# CK-02-04 review — round 1

- **Task:** CK-02-04, Implement mouse look and pointer capture
- **Reviewer/model/agent:** independent reviewer, GPT-6 Luna, `/root/ck_02_04_reviewer_r1`
- **Implementation agent:** `/root/ck_02_04_builder`; submission is uncommitted at baseline `eaf442ed35e3ad53feefbd767aaaaca9a01e7d14`.
- **Scope:** Read `REVIEW.md`, SPEC Sections 0, 1.3, 3.2–3.4, 8.1 and task card CK-02-04, `docs/environment-start.md`, accepted CK-00-02 and CK-00-06 handoffs, CK-00-06 review, the submitted handoff, actual task source/tests, and package/browser configuration. Also checked the actual `InputSampler` interface. `CONTEXT.md` has concurrent orchestrator edits and is excluded from the task snapshot.
- **Ownership:** All seven task files were read-only. No implementation, test, configuration, SPEC, or CONTEXT file was changed. Temporary lifecycle reproductions ran from the browser against the submitted source.

## Snapshot identity

The submitted manifest is `/tmp/cryptkeep-CK-02-04-submission.json` (exactly seven files). Every independently recomputed SHA-256 matched before and after review:

```json
{
  "src/app/pointer-capture.ts": "ccf440e2034c8502dc2a3ce366e5fcb3ba3d1219f89a144bdf9d5a4a786e4125",
  "src/player/look.ts": "6d2d487f28068c7a4810061acad390aa4830733a9d41075abd16a41f9f08f87e",
  "src/player/look.test.ts": "a2c492624469b618146ed8458188f623238f8cf352f3d8d3f7b5a46187fc8e4a",
  "tests/harness/pointer-capture.html": "5d276a85d701ed70b4a6b1d396c249a6f5eb0140e64f96e7891cc7b435ba0f0e",
  "tests/harness/pointer-capture.ts": "d2d109ae1af35da7009656fb711c00897d1d4a765559fe175dbcbc79f6dac2f3",
  "tests/e2e/pointer-capture.spec.ts": "a1aa281c2713a87a64ea4843e3e09e19aef21ceef669c3047acd6ac52c858c95",
  "progress/CK-02-04.md": "b01163ae68df3319b7fc049a05c6353e63f44fdab4b2e9b8d9e6b151c9842fc7"
}
```

## Checks and evidence

- `npm test` — passed, 19 Vitest files / 100 tests; Node tooling test passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted its existing advisory for a minified chunk over 500 kB.
- `npm run test:e2e -- tests/e2e/pointer-capture.spec.ts` with the requested network grant — passed 2/2 in system Chromium. The test obtains actual native pointer lock from a trusted click, accumulates actual relative pointer movement, exercises Escape unlock/cancellation, explicit recapture, blur cancellation, external native lock loss, and disposal. The denial branch is deliberately stubbed; native denial was not established. The cases check page and console errors and report none.
- Temporary browser reproduction for F01 used controlled promises: request A → dispatch blur → gesture request B → reject A late. Actual state sequence was `idle`, `requesting`, then `failed`; resolving B left it `failed`. This confirms that a stale result from A mutates B's state.
- Temporary event-target reproduction for F02 modeled a legacy `requestPointerLock()` returning `void`: request → dispose while no lock is set → later set the owned surface as `pointerLockElement` and dispatch `pointerlockchange`. The surface remained locked and `exitPointerLock` was never called because disposal had removed the change listener. This establishes the adapter lifecycle bug with a simulated legacy event sequence, not on a browser that implements the legacy API.
- A temporary observer-throws lifecycle check showed that a throwing `onStateChange` does not prevent the adapter from reaching `disposed` or releasing an already-owned lock. The native Chromium E2E also verified disposal release. The mock's synchronous `exitPointerLock` generated a reentrant duplicate cancellation; that synchronous mock behavior is not evidence of a native-browser defect.
- `git diff --check` — passed.

## Findings

### CK-02-04-R1-F01 — Stale request settlements overwrite a newer capture attempt (P2)

**Location:** `src/app/pointer-capture.ts:49–59`, with cancellation/retry at `38–46` and `106–107`.

When a pending promise-based capture is canceled by blur, Escape, or hidden-page handling, `cancel()` clears the shared `requestPending` flag and returns the state to idle. A subsequent trusted gesture can start a new request. The earlier request's rejection handler still calls `failRequest()` whenever the adapter is not disposed, without checking that its request is still current. In the controlled browser reproduction, late rejection from A moved the newer B attempt from `requesting` to `failed`; B's later resolution could not recover it. The success callback also clears the same shared pending flag, so an old success can permit another request while B remains pending.

This violates the explicit retry-after-gesture contract: an obsolete asynchronous result can cancel the latest gesture's capture attempt. Associate settlement handlers with a request generation/token and ignore stale state changes; ensure a stale late acquisition is released only when the adapter still owns that lock.

### CK-02-04-R1-F02 — Disposal drops the only listener that can release a late legacy lock (P2)

**Location:** `src/app/pointer-capture.ts:61–80`, especially listener removal at lines 73–74.

The legacy API path returns `void`, leaving settlement to `pointerlockchange`/`pointerlockerror`. If `dispose()` runs while that request is still pending and before `pointerLockElement` is the surface, `releaseOwnedLock()` has nothing to release, then `dispose()` removes the `pointerlockchange` listener. When the pending legacy request later acquires the surface, no adapter callback remains to release it. The simulated event-target reproduction ended with the disposed adapter's surface still locked and zero exit calls.

Keep enough owned settlement handling for a pending legacy request to observe a late acquisition/error after disposal, release an owned late lock, and then remove those retained listeners. The normal disposed/no-request path should continue removing all listeners immediately.

## Verdict

**CHANGES REQUIRED.** F01 and F02 are confirmed lifecycle defects in the submitted adapter. The unit suite, typecheck, build and current native Chromium E2E pass, but those existing cases do not exercise stale promise settlement or late legacy-void acquisition. Native lock acquisition/movement and common loss paths were verified; denial and the legacy-void late-acquisition path remain stubbed/simulated as described above. No other confirmed in-scope defect was found.
