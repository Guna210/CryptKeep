# CK-02-04 review — round 1 repair verification

- **Task/round:** CK-02-04, round 1 verification
- **Reviewer/model/agent:** same independent reviewer, GPT-6 Luna, `/root/ck_02_04_reviewer_r1`
- **Fixer:** `/root/ck_02_04_builder`; repair handoff: `progress/CK-02-04.round-1-fix.md`.
- **Snapshot:** uncommitted submission at baseline `eaf442ed35e3ad53feefbd767aaaaca9a01e7d14`.
- **Scope:** Re-read the original `reviews/CK-02-04/round-1.md`, the round-1 repair handoff, updated pointer-capture source and tests, accepted look tests, browser harness/spec and unchanged task handoff. Rechecked `REVIEW.md`, the task card and applicable SPEC contracts. No source, test, configuration, SPEC or CONTEXT file was changed; temporary browser reproductions used only the submitted source.

## Final repaired snapshot

The repair manifest is `/tmp/cryptkeep-CK-02-04-repaired.json` and contains exactly nine files. All independently computed hashes matched before and after verification:

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

## Verification checks

- `npm test` — passed, 20 Vitest files / 104 tests; Node tooling test passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite retained its advisory for a minified chunk over 500 kB.
- `npm run test:e2e -- tests/e2e/pointer-capture.spec.ts` with the requested network grant — passed 2/2 in system Chromium. Native coverage exercised trusted-click pointer lock, relative movement, Escape, explicit recapture, disposal, and external unlock. Blur was triggered by a dispatched browser `blur` event. The denial branch remains stubbed. The E2E checks reported no page or console errors.
- Independent temporary Chromium reproductions against the submitted source covered stale A resolve and reject after cancel/retry B: both left B in `requesting`, a third gesture did not issue another request, and B's lock event/resolution reached `captured`. A stale successful settlement acquired before an owned lock was attributed released that lock; an A settlement after B's lock had been attributed left B's captured lock intact.
- Independent legacy-void disposal reproduction covered pending request → direct dispose → late owned lock: disposal retained only terminal guards, released the late lock, remained `disposed`, and removed both guards. A separate late-error reproduction removed both terminal guards without changing disposed state. Ordinary blur, key, visibility, mouse and context-menu listeners were removed immediately. A throwing state observer did not prevent disposal or owned-lock release.
- `git diff --check` — passed.

The legacy API has no native browser coverage in this environment; its event-order cases above and in the new unit tests use simulated event targets. Browser denial is also simulated. These limits are not presented as native-browser proof.

## Finding outcomes

- **CK-02-04-R1-F01 — Resolved.** Request generations prevent stale promise settlements from changing the newer attempt. Independent old-resolve and old-reject scenarios preserved B's pending request and final capture.
- **CK-02-04-R1-F02 — Resolved for a still-current pending legacy request.** Direct disposal while a legacy void request was pending retained terminal guards and released a late owned lock; late error also cleaned up the guards.

### CK-02-04-R1-F03 — Cancellation forgets an outstanding legacy request before disposal (P2, new)

**Location:** `src/app/pointer-capture.ts:147–148`, `170–176`, and `90–105`.

The repaired disposal logic retains terminal guards only when `requestPending` is true and `pendingMode` is `legacy`. A blur or Escape during an unresolved legacy void request calls `cancel()`, which clears both fields even though the browser request itself has no cancellation/settlement handle. If the adapter is disposed after that logical cancellation, `dispose()` sees no pending legacy request and removes the terminal guards. A later successful lock acquisition then remains held by the disposed surface.

Reproduction against the submitted source: legacy `requestPointerLock()` returns `void` → dispatch `blur` → state becomes `idle` while the simulated native request remains outstanding → call `dispose()` → set the surface as `pointerLockElement` and dispatch `pointerlockchange`. The final state was `disposed`, but the surface remained locked and `exitPointerLock` was never called (`exits: 0`). This demonstrates a lifecycle bug in the simulated legacy event sequence; it is not native legacy-browser evidence.

Track outstanding legacy settlements independently of whether the current input attempt was canceled. On disposal, retain terminal guards until the outstanding native request settles or errors; release any late lock owned by this surface, then remove the guards. Preserve immediate removal of ordinary listeners and the terminal disposed state.

## Verdict

**CHANGES REQUIRED.** Round-1 findings F01 and F02 are resolved on the exact repaired snapshot, but F03 is a new confirmed P2 defect in cancel-then-dispose handling for legacy void requests. The required checks passed, while the legacy lifecycle remains simulated. This verification used the round-1 reviewer and does not consume another repair pass; address F03 under the next review round with a fresh reviewer, respecting the three-round task limit.
