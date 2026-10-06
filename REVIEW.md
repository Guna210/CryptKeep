# CryptKeep — Luna review and repair protocol

Read this document for every implementation review. The owner's instructions take precedence. [SPEC.md](SPEC.md) defines the task and game; [CONTEXT.md](CONTEXT.md) records the orchestrator's current state.

## Roles

- **Orchestrator:** assigns work, supplies missing task instructions, reconciles findings with requirements, coordinates fixes, checks evidence, and makes the final acceptance decision. The orchestrator does not implement application code or fixes.
- **Builder/fixer:** explicitly selected `gpt-6-luna` agent. The orchestrator may reuse the original builder or spawn a new Luna fixer.
- **Reviewer:** a separately spawned `gpt-6-luna` agent for each review round. The reviewer must not have implemented or fixed this task. It reviews the actual submission independently, runs appropriate checks, and reports findings. It does not edit application code or fix its own findings.

A request to implement a task also authorizes this bounded review/fix workflow. No separate approval is needed for each reviewer or scoped correction. Planning remains the main agent's responsibility. If the specified model is unavailable, report that limitation; do not silently substitute another model.

## Round accounting: maximum three

Initial implementation is followed by up to **three review/repair rounds per task**, not three rounds per finding. Stop early when the implementation passes review and acceptance checks.

Each round consists of:

1. **Review:** spawn a fresh Luna reviewer to inspect the current submission. Give it the task requirements, baseline/current snapshot, evidence, and any earlier findings/fixes.
2. **Repair, if needed:** the orchestrator sends all confirmed in-scope findings to the original builder or a new Luna fixer. One coordinated repair pass is allowed in this round. The reviewer does not act as fixer.
3. **Verification:** after the fixer finishes, ask the same round's reviewer to check the actual repaired snapshot, all reported findings, relevant regressions, and task acceptance. This verification belongs to the existing round; it is not a fourth round or a second repair pass.

The owner's counting example is preserved: the first review that finds issues followed by its repair is **round 1**. Its verification does not reset the counter. A clean first review can finish immediately without a repair. If verification finds unresolved or new confirmed issues, begin the next round with a newly spawned reviewer, provided fewer than three rounds have been used.

| Round | Independent reviewer | Repair when issues exist | Verification |
| --- | --- | --- | --- |
| 1 | Fresh Luna reviewer A | Original builder or new Luna fixer | Reviewer A checks repaired submission |
| 2, if needed | Fresh Luna reviewer B | Original builder or new Luna fixer | Reviewer B checks repaired submission |
| 3, if needed | Fresh Luna reviewer C | Original builder or new Luna fixer | Reviewer C checks repaired submission |

After round 3, do not start a fourth round or another repair pass automatically. If the third repair passes its verification, the task may be accepted. Otherwise record the unresolved issues and check failures, leave the task unaccepted, and report the limit to the owner. Dependent tasks remain blocked. Further work needs a new owner instruction. Renaming a fix or resetting a counter does not bypass this limit.

Implementation that fails its own task checks stays with its builder until it produces a reviewable submission. The orchestrator must not use this distinction to conceal independent reviewer findings or extend the three-round repair limit.

## Reviewer launch packet

The orchestrator supplies a self-contained task packet rather than relying on the builder's conversation:

- Task ID, round number, assigned reviewer/model and implementation/fixer agent identifiers.
- Exact task card, relevant SPEC sections and numeric/content contracts, plus any explicit orchestrator instructions or owner corrections.
- Accepted prerequisite handoffs and current interfaces.
- Owned files, baseline and changed-file list/diff. The checkout may contain untracked files: inspect their actual content; an empty `git diff` is not proof that nothing changed.
- Current submission identity: commit when available, or a file manifest/hash record when uncommitted. Preserve unrelated owner edits.
- Builder handoff, actual commands/results, screenshot paths, known limitations and prior round reports.
- Required acceptance cases and permitted check commands, plus the report output paths.

The reviewer should receive the requirements and evidence, not an instruction to endorse the builder's conclusion. Use a fresh agent with `model: "gpt-6-luna"`, `fork_turns: "none"` and a self-contained review packet; do not reuse the builder as reviewer. Include docs/environment-start.md for cloud/browser check execution. The main-agent role described in CONTEXT does not make this child the orchestrator.

## Review procedure

1. Read the assigned requirements, prerequisite handoffs and applicable repository instructions. Check the relevant implementation and tests, including interfaces it consumes or changes.
2. Compare behavior against the task's full acceptance cases. Identify missing implementation, incorrect edge cases and inappropriate scope expansion.
3. Run meaningful checks relevant to the task, independently of claimed builder success. Record commands and actual results. Broaden testing only for new changes, failures or unresolved risks. Documentation-only tasks use content/command review, not artificial tests.
4. For browser/visual work, exercise the real app/input path, check page/console failures, and open the submitted screenshots. A screenshot or successful build alone cannot prove combat, progression or persistence.
5. Report concrete findings with reproducible evidence and precise locations. Do not invent a defect from a style preference or require unrelated future features.
6. State a verdict and limitations. A requirement that could not be checked is explicitly unverified; never report a failing or unavailable check as passed.

Source code, tests, configuration, SPEC and CONTEXT are read-only to the reviewer. It may write its assigned review reports and place temporary reproductions in `/tmp` or an ignored task-specific directory. It must not weaken tests, change acceptance requirements, commit/push/deploy, or mutate the game implementation. Avoid simultaneous builder writes while the reviewed snapshot is being inspected.

## Task-relevant checks

Select the checks that apply, rather than imposing every system on every small task:

- **Logic/contracts:** real algorithms, finite/bounded values, deterministic seeds/cursors, correct tick timing and cancellation, interface compatibility, no future placeholders.
- **Generation/navigation:** actual occupancy reachability and collider clearance, bounded retries/fallback, legal enemy/loot combinations, reserved paths and encounter caps.
- **Combat/input:** attack timing, once-only hits/costs/rewards, LOS, class-specific controls, bow release versus cancellation, resource/guard/status caps, switch/pause/blur behavior.
- **Progression/persistence:** boss gates, floor 99→100, no floor 101, final victory priority, reward ledgers, active versus checkpoint restore, atomic transactions/versioning and honest storage errors.
- **UI/render/audio:** correct displayed state, readable tells, inspected original pixel presentation, actual browser errors, focus/capture/resume, resource ownership/disposal and relevant measured budgets.
- **Checks themselves:** assertions exercise required behavior, failure cases are meaningful, existing regressions are preserved, and diagnostic acceleration is not presented as legitimate play or balance proof.
- **Scope/handoff:** files match the assignment, unrelated owner work is preserved, commands/evidence are accurate, and following tasks have usable interface notes.

## Finding and verdict format

Reports live at `reviews/<TASK-ID>/round-<N>.md`. Verification reports live at `reviews/<TASK-ID>/round-<N>-verification.md`. Preserve earlier reports; do not overwrite their findings after a fix.

Each report contains:

- Task, round, reviewer/model/agent, implementation snapshot identity and scope reviewed.
- Commands with outcomes, inspected evidence, and any limitations.
- Findings with stable IDs such as `CK-03-05-R1-F01`, priority, affected file/line or behavior, violated requirement, reproduction/input, expected versus actual result, and bounded correction guidance.
- Verdict: **PASS**, **CHANGES REQUIRED**, or **BLOCKED/UNVERIFIED**.

Priority: P0 breaks core campaign/data integrity; P1 seriously breaks required behavior; P2 is a normal functional/acceptance defect; P3 is a minor confirmed defect. All confirmed in-scope defects are addressed before acceptance. Optional improvements are labeled separately and do not become new requirements or consume repair rounds.

A verification report lists each finding as resolved, unresolved, or explicitly dismissed by the orchestrator with a requirements-based reason. It checks the actual changed files and targeted regressions, not only the fixer's assertion. Any new finding is recorded. Acceptance requires no unresolved confirmed findings, required checks passing, and a PASS on the exact current submission; unverified required behavior cannot be accepted.

## Repair packet and continuity

The orchestrator confirms findings against task/owner requirements and sends the fixer:

- Task/round, reviewed snapshot, report paths and all unresolved finding IDs.
- Narrow correction scope and file ownership, acceptance/reproduction cases, and relevant regression commands.
- Instruction to preserve unrelated changes and earlier behavior, and to submit actual check results.

The fixer writes `progress/<TASK-ID>.round-<N>-fix.md` with changed files, finding resolutions, commands/results and limitations. A repair within these rounds remains part of the original task; it does not get a fresh three-round budget. Later regressions after an accepted task may be assigned separate fix tasks by the owner, following SPEC Appendix B.2.

CONTEXT retains the active task, builder/reviewer/fixer identifiers, current stage and round, unresolved finding IDs, handoff/report links, and next action. Full reports stay outside CONTEXT. After compaction, resume the recorded round without spawning duplicate agents or resetting its counter.

The orchestrator accepts and updates progress only after independent review and any repaired-snapshot verification pass. It reports the implemented result, independent review outcome, round count, checks and any remaining limits to the owner.
