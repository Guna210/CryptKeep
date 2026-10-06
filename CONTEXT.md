# CryptKeep — orchestrator context

Last updated: 2026-10-06.

## Purpose and recovery

Read this file first after compaction or resuming work. It preserves project intent, the orchestrator's role, decisions, current state, and task progress. **It does not contain the comprehensive implementation plan.** The full plan is now [SPEC.md](SPEC.md).

On resuming, read the latest owner messages, inspect the working tree, then consult the plan, [REVIEW.md](REVIEW.md), and relevant task handoffs/review reports if they exist. Owner instructions take precedence over this file. Update this record when a decision, task status, verification result, or next action changes; keep it concise and factual.

## Roles and current authorization

- **Main agent: coordinator/orchestrator and planner, not the builder.** The main agent writes the comprehensive plan, defines task boundaries and interfaces, delegates implementation, reviews results, coordinates integration, and maintains this file. Writing planning/context documents and checking results are orchestration work.
- **Builders: GPT-6 Luna subagents.** Use the explicit model identifier `gpt-6-luna` for implementation tasks when that phase is authorized. Do not silently substitute another model; report unavailable model access.
- **Independent reviewers: separately spawned GPT-6 Luna subagents.** Every implementation is reviewed before acceptance. Reviewers do not implement/fix the task they review; the orchestrator coordinates findings and can reuse the builder or spawn a new Luna fixer.
- **Do not delegate planning to Luna.** The owner explicitly corrected the initial request: the main agent must author the plan and future design updates.
- **Current authorization: finalize, commit and push the planning/environment baseline.** The owner accepted the recommended design and Git decisions. SPEC.md is written and the independent-review workflow is recorded in REVIEW.md. No gameplay implementation or subagent work has started. A subsequent request to start a task/milestone authorizes its scoped implementation, independent reviews, bounded fixes and accepted-task Git checkpoint.

The owner wants an ambitious, complex project that tests the agent's capabilities. Work in reviewable stages with evidence of actual behavior, while preserving the full intended 100-level scope.

## Required game

CryptKeep is a first-person dungeon crawler with pixelated art.

- **Campaign:** 100 procedurally generated levels. Each has enemies and a boss guarding the passage to the next level. Defeating level 100's boss completes the game; there is no level 101.
- **Difficulty:** Enemies and encounters become tougher as the player descends. Level 100 contains the toughest encounters and final boss.
- **Controls:** WASD movement and full mouse look with 360-degree turning.
- **Procedural enemies:** Generate varied enemies. The later plan must define meaningful variation in appearance, combat behavior, abilities, and difficulty.
- **Procedural loot:** A varied weapon/loot pool inspired by Borderlands, at a smaller and less complex scale, with enough meaningful variety to sustain play.
- **Weapon classes:** Classes behave differently. Swords support normal and charged attacks. Bows support right-click aiming down sights, drawing with left-click held, and shooting when left-click is released.
- **Supporting mechanics:** The owner invites additional mechanics needed for a complete game. Consider health/healing, stamina, collision, enemy tells, hit feedback, inventory/equipment, pickups, death/retry, save/resume, pause/settings, HUD, audio, and further weapon classes during planning. These are candidates, not individually confirmed design decisions.

## Workspace and inherited records

- Repository checkout: `/workspace/CryptKeep`; baseline branch: `master`, matching the empty remote's configured default. Remote: `origin`, `Guna210/CryptKeep` on GitHub. The initial workspace branch was `work`; it had no commits. Use Git status/log and the remote to verify publication state rather than assuming from this file.
- Use Codex Cloud for development, dependencies, builds, and browser testing because the owner has limited local storage. Cloud development and public game hosting are separate decisions.
- This checkout already contained an untracked environment scaffold and an earlier `CONTEXT.md` when inspected. Preserve unrelated existing files.
- Existing `package.json` declares **TypeScript + Three.js + Vite**, with Vitest and Playwright tooling. The approved specification retains this browser stack. Do not replace it without a new design decision.
- Existing setup references: `README.md`, `docs/environment-start.md`, `tools/cloud-install.sh`, and `tools/environment-smoke.mjs`. The documented setup command is `bash tools/cloud-install.sh`; environment validation is `npm run verify:environment`.
- No game entry point or gameplay source was found in the inspected file list. The README likewise describes an environment scaffold without a playable game. Tool/configuration presence does not establish passing tests or working gameplay.
- The owner supplied a BlockCraft `SPEC.md` and explicitly asked for its level of detail and small task breakdown. Its execution model, milestone examples and dependency appendix were read as format references. Its Jules workflow, Minecraft features and custom-renderer restrictions do not apply to CryptKeep.
- Managed cloud status was observed as running and connected, with an enforced restricted network policy. Do not copy environment identifiers or readiness assumptions into future sessions; recheck as needed.

## Specification and decisions

- [SPEC.md](SPEC.md) contains the full scope, architecture/contracts, mechanics, concrete numeric/content tables, **196 task cards in 20 milestones (M00–M19)**, dependency graph, requirement coverage and completion criteria.
- Every task has prerequisites, file ownership, bounded build scope, concrete acceptance cases and evidence requirements. Handoffs go in `progress/<TASK-ID>.md`; accepted prerequisites determine readiness. IDs remain stable; split/fix tasks use suffixes.
- [REVIEW.md](REVIEW.md) defines the owner's mandatory independent Luna review/repair protocol. The orchestrator can supply task instructions missing from SPEC, consistent with requirements and scope.
- Owner-approved direction: single-player desktop browser, five weapon classes (sword/bow/axe/daggers/staff), ten regions, floor-entry checkpoint retry that loses current-floor gains, and actual 3D rooms/monsters with pixel textures and low-resolution rendering. Eight enemy archetypes, boss kit details, generated art/audio and numeric balance remain the plan's implementation details.
- Owner-approved pacing target: 3–6 minutes per ordinary floor, with longer boss milestones, approximately 5–10 hours overall. Validate/tune this through the playable slice and representative-depth playtests; it is not a promise of measured duration.
- Owner-approved Git workflow: one baseline commit, then one commit per independently reviewed/accepted task, including scoped files and progress/review records. The current instruction explicitly authorizes pushing the baseline. Future pushes follow the owner's scope; no automatic PR-per-task or deployment. Preserve unrelated changes and remote history.
- The owner accepts browser-local saving initially (planned IndexedDB). Portable saves are a later feature: download a `.save` file and select/import it in a subsequent session. SPEC task CK-13-09 now specifies that extension while reusing the versioned JSON save envelope; no separate save server is required.
- The owner's intended host is Cloudflare Pages on a free account. No deployment has been requested; choose the publication timing after a playable build exists. Native/mobile/gamepad support and fresh-browser offline loading remain separate scope decisions. Development stays in Codex Cloud.
- The dependency index has been checked for missing IDs, cycles and coverage of all tasks by the final completion gate. These are document consistency checks, not gameplay verification.

## Running progress

| ID | Owner/agent | Status | Result and evidence |
| --- | --- | --- | --- |
| CTX-001 | Main orchestrator | Complete | Inspected existing context, README, package manifest, file list, and Git status; updated this recovery file to reflect the owner's role split and context-only scope. |
| PLAN-001 | Main orchestrator | Complete | Authored SPEC.md from CryptKeep requirements and the supplied example's format; 196 scoped tasks with validated dependencies and full-scope coverage. |
| REVIEW-001 | Main orchestrator | Complete | Recorded separate Luna reviewers, original/new Luna fixers, repaired-snapshot verification and the maximum three-round workflow in REVIEW.md; linked SPEC and startup instructions. |
| CK-00-01 | GPT-6 Luna; unassigned | Ready; not started | First implementation task: audit existing cloud scaffold. No prerequisites; launch only when the owner requests implementation. |
| Remaining SPEC tasks | GPT-6 Luna; unassigned | Pending | No task is accepted or running; no builder agent or handoff exists yet. |

No completed Luna work is verified in this conversation. Do not attribute the pre-existing scaffold to a subagent without a handoff or other evidence. No setup, build, or gameplay tests were run while creating these planning documents.

When implementation begins, track active tasks and accepted-task summaries here, with builder/reviewer/fixer agent IDs and models, stage, round (1–3), reviewed snapshot, handoff/report links, acceptance evidence, unresolved finding IDs and next action. Keep full reports in per-task records rather than copying them here. Distinguish submitted work from independently reviewed/accepted work; the orchestrator makes the final acceptance decision. Resume recorded rounds after compaction without resetting counters or duplicating agents.

## Delegation and review rules for later implementation

- Give Luna narrowly scoped tasks with prerequisites, file ownership, interfaces, and meaningful acceptance checks. Avoid concurrent edits to the same files.
- Keep active agent/task identifiers and integration blockers here so the orchestrator can recover after compaction.
- Delegate code changes and fixes to builders; the main agent remains responsible for planning, review, integration coordination, and honest status reporting.
- After a builder submits, spawn a fresh `gpt-6-luna` reviewer. A round is review → one builder/fixer repair pass if needed → the same reviewer verifies the repaired snapshot. Stop early on a clean PASS. Maximum three rounds per task; each new round gets a fresh reviewer, and verification does not reset the count. After round 3, unresolved defects/checks leave the task unaccepted; report them and do not launch another repair/review round without a new owner instruction.
- Review reports: `reviews/<TASK-ID>/round-<N>.md` and `round-<N>-verification.md`. Repair handoffs: `progress/<TASK-ID>.round-<N>-fix.md`. Do not accept unreviewed fixes or let a reviewer repair its own findings.
- Validate procedural reachability, reproducible generation, difficulty progression, weapon input transitions, boss gates, and the floor-100 victory boundary. A successful build or screenshot alone does not prove gameplay works.
- Preserve owner changes. Avoid unnecessary worktrees and local installations. Keep comprehensive designs and long test logs in their own documents, linking them from this file.

## Immediate next action

Complete and verify the requested baseline commit/push to `origin/master`, then wait for the owner's implementation task request or design correction. `Start CK-00-01` or `Start the next task` begins the scaffold audit through an explicitly selected `gpt-6-luna` builder, followed by the independent review protocol and accepted-task commit. Read SPEC.md Section 0, REVIEW.md and that card; preserve the main-agent planner/orchestrator role. If a requested task's prerequisites are unaccepted, report the specific blocker instead of silently implementing unrelated work.
