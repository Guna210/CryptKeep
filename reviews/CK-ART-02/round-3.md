# CK-ART-02 independent review — round 3

- **Reviewer:** `/root/cartoon_refinement_reviewer_r3` (fresh independent reviewer)
- **Snapshot:** `c1e218671bb12411ff7cd9225fe4b3c37d3cf01d`, tree `d0a39610a7fe5117072d75ae3653b997f8d9e2de`, branch `cartoon-art-preview`.
- **Scope:** Round-two spatial chunk/geometry repair, exact-snapshot hosted verification and retained production artwork. No application source, test, or Git ref edits were made by this reviewer. `round-2-verification.md` was already present as an untracked report and is preserved.
- **Requirements considered:** `decisions/cartoon-art-refinement.md` requires all 25 browser checks and the 25-reroll lifecycle assertions to remain; `REVIEW.md` limits the task to three review/repair rounds.

## Evidence

- Confirmed the current Git HEAD and tree match the frozen snapshot in the round-two verification report. Reviewed both prior reports, both repair handoffs, the task decision, `tests/e2e/floor.spec.ts`, the hosted run outcome and failure evidence.
- Independently opened the exact-hosted-snapshot production images in `/tmp/cryptkeep-art02-r2-images/production-entry-yaw-0.png` and `production-entry-angle-native-mouse.png`. Both show a distinct yellow flame core within the orange flame, attached to the torch head. The second view retains the torch and shows the room corner. The rounded stone courses and consistent visible joints remain intact; no art regression was apparent. The sword remains visible with rounded grip/pommel and softened guard/blade treatment.
- The exact hosted run `37641423165`, job `112861101506`, passed 24/25 browser checks, including renderer replacement/disposal, movement, collision and production rendering. Its sole failure is `tests/e2e/floor.spec.ts:50`, where the Generate dungeon click times out during the 25-cycle reroll loop at about 30.6 seconds. Per the supplied failure evidence, the page remained alive on Floor 1 with seed `cycle-23`: 23 rerolls completed before the click exceeded the test's 30-second budget. The Playwright artifact has no trace because tracing is disabled. This is evidence of cumulative test-budget exhaustion, not an observed page freeze or established application defect.
- Historical baseline runs are inconsistent, and the local synchronous 25-cycle measurement does not reproduce browser automation cost. The cause of the hosted delay remains unknown; it cannot be attributed to software Chromium cost, texture size, or a gameplay/rendering regression from the current evidence. No FPS claim is supported.
- Did not rerun hosted browser checks: the review scope is the already completed exact-snapshot hosted run, and the identified question is whether the remaining test failure reflects the stated 30-second budget. Local loopback is prohibited by the task protocol. No bypass or retry was attempted.

## Finding status

### CK-ART-02-R3-F01 — 25-reroll lifecycle acceptance is cut off by the 30-second test budget (P2, unresolved pending repair verification)

**Location:** `tests/e2e/floor.spec.ts:48-51` (25-cycle reroll loop; click at line 50).

**Evidence/reproduction:** Exact hosted run `37641423165` passed 24 of 25 browser checks. In the remaining lifecycle test, the page was still alive at Floor 1 / seed `cycle-23` after 23 completed rerolls when a subsequent native button click exceeded the 30-second Playwright test timeout. The test still has the requested 25 rerolls and teardown checks; the failing condition is the enclosing cumulative test deadline. Previous hosted runs also failed this lifecycle case, while baseline runs disagree. Root cause is therefore unconfirmed.

**Expected:** Preserve all 25 rerolls, invalid-input recovery, per-cycle ready-state polling, and listener/scene teardown assertions while allowing a reasonable cumulative budget for startup plus repeated full-resolution browser rendering and cleanup. Keep individual clicks and state polls bounded so a genuinely stuck action still fails promptly.

**Correction guidance:** Give this lifecycle test a scoped budget of about 60 seconds (or another documented budget supported by the hosted runtime), leaving its 25 assertions/cycles and reasonable action/poll timeouts intact. Do not raise the suite-wide timeout, remove or reduce cycles/assertions, bypass native input, or claim a functional performance improvement. Verify the full hosted suite on the repaired exact snapshot; report the environmental/runtime limits candidly if the lifecycle still fails.

## Verdict

**CHANGES REQUIRED.** The two production images preserve the accepted art, and 24 browser checks pass on the exact snapshot. One required lifecycle check remains unresolved because its cumulative 30-second budget expires before the 25 rerolls complete. The evidence supports a narrow test-budget correction but does not establish the underlying runtime cause. This is round 3; if the one coordinated repair does not pass verification, stop and leave CK-ART-02 unaccepted under the three-round limit.
