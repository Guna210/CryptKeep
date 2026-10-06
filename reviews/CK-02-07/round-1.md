# CK-02-07 — Round 1 independent review

**Reviewer/model:** `/root/ck_02_07_reviewer_r1` / GPT-6 Luna
**Builder:** `/root/ck_02_07_builder`
**Baseline:** `03ececa43f8c71393a463aebb5887a30640b1e34`
**Submission identity:** SHA-256 path manifest `/tmp/cryptkeep-CK-02-07-submission.json`; all eight listed path hashes matched at review start and end. The independent review probe was removed. `CONTEXT.md` remains the separate parent-owned modification; it is outside the submission manifest.
**Scope:** the eight manifest paths: `README.md`, `docs/environment-start.md`, `src/app/player-session.ts`, `src/app/shell.ts`, `src/player/dash.ts`, `src/player/dash.test.ts`, `tests/e2e/dash.spec.ts`, and this handoff at `progress/CK-02-07.md`. Prerequisite movement, collision, resource, input, clock, pointer-capture, floor and renderer implementations were inspected as read-only interfaces.

## Review and checks

- Read `REVIEW.md`, SPEC Sections 4 and 5 / CK-02-07, the task packet, and accepted CK-02-03/05/06 handoffs. Confirmed baseline HEAD and actual tracked/untracked scope. The implementation, test, handoff and evidence paths were not edited.
- `npm run verify` — **passed** independently: typecheck; 22 Vitest files / 118 tests; 7 tooling tests; production build; all 17 Chromium browser checks (development and production). This included the new dash browser cases, existing generated-wall movement and sprint cases, renderer lifecycle, pointer capture, floor, shell and production diagnostics checks. The build emitted the existing >500 kB chunk advisory.
- Temporary focused Vitest probe — **passed**. At `1/60 s`, `DashStep.evading` is true for exactly ticks 1–6 and false on tick 7. The submitted first-contact fixture reaches the rounded top corner of the solid wall (contact distance from corner `(6,8)` equals radius `0.28` within `1e-8`, both normal axes are nonzero); the sweep solver's subsequent slide position exceeds that first-contact X coordinate, while `resolveDashCollision` keeps the first contact center, clears dash/evasion, and zeros velocity. Probe file removed after execution.
- `git diff --check` — **passed**. Final SHA-256 values for all eight submission paths matched `/tmp/cryptkeep-CK-02-07-submission.json` exactly. The only additional worktree modification is the pre-existing parent coordination edit in `CONTEXT.md`.

## Behavior reviewed

`src/app/player-session.ts:52-53, 142-169` accepts Space by `event.code` only while capture is active, ignores repeated DOM keydowns, consumes only a sampled fresh `pressed` edge, and uses activation yaw and normalized local axes. The no-input direction is yaw-forward. The dash branch pays through `recordStaminaSpend`, bypasses locomotion/sprint for that tick, advances resource regeneration with the same committed-spend flag, resolves the full-circle sweep, and commits the resolver's first contact or free-sweep position. Dash cooldown advances on active fixed ticks after motion ends; pause/capture loss calls `stopMotion`, which cancels evasion and movement while retaining cooldown and the already-spent resource. Successful floor load resets dash state at line 114.

`src/player/dash.ts:8-11, 30-48, 53-91` implements the stated 25 stamina cost, 10 m/s, 0.22 s / 2.2 m cap, 0.8 s activation cooldown and 0.10 s evasion. State and nested direction objects are frozen. The timer epsilon expires floating-point residue at the sixth 60 Hz evasion step. Contact resolution uses `contacts[0]`, discards the collision solver's slide endpoint, and zeros velocity on contact or completed motion.

The development snapshot is detached/frozen and production has no diagnostics global; the full existing browser regressions passed. Changes are within the assigned dash integration/docs paths; the accepted collision, movement, clock, input, floor, pointer-capture, resource and renderer algorithms were not changed in the submitted manifest.

## Findings

None.

## Verdict

**PASS** — independently verified against the exact eight-path submission snapshot. The required full verification and focused timing/corner checks passed.
