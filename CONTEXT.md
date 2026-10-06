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
- **Current state: CK-00-02 accepted; publishing before CK-00-03.** Authorized sequence remains CK-00-02 → CK-00-03 → CK-00-04, with separate Luna builder/reviewer and a verified push after each task. Round-1 CK-00-02 review passed with no findings. No other task or deployment is authorized.

The owner wants an ambitious, complex project that tests the agent's capabilities. Work in reviewable stages with evidence of actual behavior, while preserving the full intended 100-level scope.

## Required game

CryptKeep is a first-person dungeon crawler with pixelated art.

- **Campaign:** 100 procedurally generated levels. Each has enemies and a boss guarding the passage to the next level. Defeating level 100's boss completes the game; there is no level 101.
- **Difficulty:** Enemies and encounters become tougher as the player descends. Level 100 contains the toughest encounters and final boss.
- **Controls:** WASD movement and full mouse look with 360-degree turning.
- **Procedural enemies:** Generate meaningful variation in appearance, combat behavior, abilities and difficulty, as defined by SPEC.md's constrained archetypes, rigs and traits.
- **Procedural loot:** A varied weapon/loot pool inspired by Borderlands, at a smaller and less complex scale, with enough meaningful variety to sustain play.
- **Weapon classes:** Classes behave differently. Swords support normal and charged attacks. Bows support right-click aiming down sights, drawing with left-click held, and shooting when left-click is released.
- **Supporting mechanics:** SPEC.md now defines health/healing, stamina/mana, collision, tells/feedback, inventory/equipment, pickups, checkpoint retry, save/resume, settings/HUD, audio, progression and exploration. Preserve that scope; detailed balance remains tunable.

## Workspace and inherited records

- Repository checkout: `/workspace/CryptKeep`; branch: `master`. Remote: `origin`, `Guna210/CryptKeep` on GitHub. The current cloud snapshot contains an `origin/master` ref but has no configured branch upstream; do not infer publication from `git status` alone. Baseline commit `a8df9b8787b7cc446510e2009e7c196ed718166c` was pushed and its remote SHA verified. Later planning-maintenance commits do not mean game tasks are accepted. Recheck Git status/log and remote state on resume.
- Use Codex Cloud for development, dependencies, builds, and browser testing because the owner has limited local storage. Cloud development and public game hosting are separate decisions.
- The published baseline contains the planning documents and pre-existing environment scaffold. Preserve unrelated owner changes; the uploaded BlockCraft reference is not part of the repository.
- Existing `package.json` declares **TypeScript + Three.js + Vite**, with Vitest and Playwright tooling. The approved specification retains this browser stack. Do not replace it without a new design decision.
- Existing setup references: `README.md`, `docs/environment-start.md`, `tools/cloud-install.sh`, and `tools/environment-smoke.mjs`. Setup: `bash tools/cloud-install.sh`; validation: `npm run verify:environment`. Browser/dev-server checks and Git network calls need network-enabled sandbox commands; a default command failed local-server binding with EPERM, then the same environment check passed with the network grant. Follow the startup instructions and inherited cloud proxy policy.
- CK-00-02 added the first real app entry point, canvas/loading shell, WebGL2 compatibility message and two browser tests. Typecheck/build, browser resize/fallback and actual production Chromium serving passed. Gameplay remains absent; a shell or diagnostic fixture does not establish a playable dungeon crawler.
- The owner supplied a BlockCraft `SPEC.md` and explicitly asked for its level of detail and small task breakdown. Its execution model, milestone examples and dependency appendix were read as format references. Its Jules workflow, Minecraft features and custom-renderer restrictions do not apply to CryptKeep.
- Managed cloud status was observed as running and connected, with an enforced restricted network policy. Do not copy environment identifiers or readiness assumptions into future sessions; recheck as needed.

## Specification and decisions

- [SPEC.md](SPEC.md) contains the full scope, architecture/contracts, mechanics, concrete numeric/content tables, **196 task cards in 20 milestones (M00–M19)**, dependency graph, requirement coverage and completion criteria.
- Every task has prerequisites, file ownership, bounded build scope, concrete acceptance cases and evidence requirements. Handoffs go in `progress/<TASK-ID>.md`; accepted prerequisites determine readiness. IDs remain stable; split/fix tasks use suffixes.
- [REVIEW.md](REVIEW.md) defines the owner's mandatory independent Luna review/repair protocol. The orchestrator can supply task instructions missing from SPEC, consistent with requirements and scope.
- Owner-approved direction: single-player desktop browser, five weapon classes (sword/bow/axe/daggers/staff), ten regions, floor-entry checkpoint retry that loses current-floor gains, and actual 3D rooms/monsters with pixel textures and low-resolution rendering. Eight enemy archetypes, boss kit details, generated art/audio and numeric balance remain the plan's implementation details.
- Owner-approved pacing target: 3–6 minutes per ordinary floor, with longer boss milestones, approximately 5–10 hours overall. Validate/tune this through the playable slice and representative-depth playtests; it is not a promise of measured duration.
- Owner-approved Git workflow: **commit and push after every independently reviewed/accepted task, even trivial, documentation or tooling work.** Include scoped files and progress/review records, with the task ID in the commit message. This is standing authorization; do not ask again or defer a task's push. Planning/recovery documentation may have separate maintenance commits without advancing implementation. No automatic PR-per-task or deployment. Preserve unrelated changes and remote history; do not force-push.
- The owner accepts browser-local saving initially (planned IndexedDB). Portable saves are a later feature: download a `.save` file and select/import it in a subsequent session. SPEC task CK-13-09 now specifies that extension while reusing the versioned JSON save envelope; no separate save server is required.
- The owner's intended host is Cloudflare Pages on a free account. No deployment has been requested; choose the publication timing after a playable build exists. Native/mobile/gamepad support and fresh-browser offline loading remain separate scope decisions. Development stays in Codex Cloud.
- The dependency index has been checked for missing IDs, cycles and coverage of all tasks by the final completion gate. These are document consistency checks, not gameplay verification.

## Running progress

| ID | Owner/agent | Status | Result and evidence |
| --- | --- | --- | --- |
| CTX-001 | Main orchestrator | Complete | Inspected existing context, README, package manifest, file list, and Git status; updated this recovery file to reflect the owner's role split and context-only scope. |
| PLAN-001 | Main orchestrator | Complete | Authored SPEC.md from CryptKeep requirements and the supplied example's format; 196 scoped tasks with validated dependencies and full-scope coverage. |
| REVIEW-001 | Main orchestrator | Complete | Recorded separate Luna reviewers, original/new Luna fixers, repaired-snapshot verification and the maximum three-round workflow in REVIEW.md; linked SPEC and startup instructions. |
| BASELINE-001 | Main orchestrator | Complete | Committed/pushed 15 planning/environment files as `a8df9b8` on `master`; remote SHA matched. |
| RECOVERY-001 | Main orchestrator | Complete | Checked 196 tasks/20 milestones, dependency-index parity/final coverage, document links, approved decisions and package/config consistency; refreshed stale publication/resume instructions. Environment fixture passed all five checks. |
| CK-00-01 | Builder `/root/ck_00_01_builder`; reviewer `/root/ck_00_01_reviewer_r1`; both `gpt-6-luna` | Accepted and pushed; round 1 PASS | Commit `c550b20` published to GitHub `master`; remote SHA matched. Handoff: [progress/CK-00-01.md](progress/CK-00-01.md). Review: [reviews/CK-00-01/round-1.md](reviews/CK-00-01/round-1.md). Five fixture checks, configuration typecheck and pinned package consistency independently passed; no findings/fixes. |
| CK-00-02 | Builder `/root/ck_00_02_builder`; reviewer `/root/ck_00_02_reviewer_r1`; both `gpt-6-luna` | Accepted; round 1 PASS | Baseline `08931af`; checkpoint message `CK-00-02: create and verify the application shell`. [Handoff](progress/CK-00-02.md), [review](reviews/CK-00-02/round-1.md). All frozen hashes matched. Typecheck/build, two browser checks and independent production Chromium check passed; no findings/fixes. Publish and verify before CK-00-03. |
| CK-00-03 | GPT-6 Luna; unassigned | Authorized; waits for CK-00-02 | Renderer lifecycle. Start only after CK-00-02 acceptance and verified push. |
| CK-00-04 | GPT-6 Luna; unassigned | Authorized; queued after CK-00-03 | Fixed-step clock. CK-00-01 prerequisite accepted; owner explicitly requested sequential execution after CK-00-03 acceptance/push. |
| Remaining 192 SPEC tasks | GPT-6 Luna; unassigned | Unaccepted; readiness per prerequisites | No further task is authorized or running. |

Two of 196 tasks are accepted: CK-00-01/02. No review or repair remains active; the task-02 builder is only cleaning up its preview server. Each task passed round 1 with no findings. Unit suite currently has no Vitest tests (reported honestly); browser checks cover shell behavior. These checks do not validate gameplay.

Historical CK-00-01 submission hashes live in its round-1 report; later acceptance/publication and Git-policy documentation updates are coordination metadata.

CK-00-02 additional narrow ownership assigned by the orchestrator: `tests/e2e/shell.spec.ts`, minimal Playwright webServer/baseURL configuration (SPEC 8.1), and README/startup documentation updates to reflect the first real app. This does not implement CK-00-08's later diagnostic boundary/harness or CK-00-03's renderer. Parent edits CONTEXT only while builder works.

The accepted-task checkpoint is `c550b203fbc8487c5a2e7570da0fccddde3bd3e1`, message `CK-00-01: audit and verify the cloud scaffold`. It was pushed and verified through `git ls-remote origin refs/heads/master`. A separate planning-maintenance commit records the owner's standing commit-and-push rule; inspect Git for the latest SHA and recheck publication state on resume. Future task completion includes a successful push and remote verification, or an honest publication-blocker report if that step fails.

When implementation begins, track active tasks and accepted-task summaries here, with builder/reviewer/fixer agent IDs and models, stage, round (1–3), reviewed snapshot, handoff/report links, acceptance evidence, unresolved finding IDs and next action. Keep full reports in per-task records rather than copying them here. Distinguish submitted work from independently reviewed/accepted work; the orchestrator makes the final acceptance decision. Resume recorded rounds after compaction without resetting counters or duplicating agents.

## Delegation and review rules for later implementation

- Give Luna narrowly scoped tasks with prerequisites, file ownership, interfaces, and meaningful acceptance checks. Avoid concurrent edits to the same files.
- Use `spawn_agent` with `model: "gpt-6-luna"` and `fork_turns: "none"`, supplying a self-contained authorized task packet. Explicitly assign builder/fixer/reviewer role: this CONTEXT describes the main agent's role, not a reason for a delegated child to act as orchestrator. Include relevant SPEC/REVIEW/startup paths and accepted prerequisite handoffs.
- Keep active agent/task identifiers and integration blockers here so the orchestrator can recover after compaction.
- Delegate code changes and fixes to builders; the main agent remains responsible for planning, review, integration coordination, and honest status reporting.
- After a builder submits, spawn a fresh `gpt-6-luna` reviewer. A round is review → one builder/fixer repair pass if needed → the same reviewer verifies the repaired snapshot. Stop early on a clean PASS. Maximum three rounds per task; each new round gets a fresh reviewer, and verification does not reset the count. After round 3, unresolved defects/checks leave the task unaccepted; report them and do not launch another repair/review round without a new owner instruction.
- Review reports: `reviews/<TASK-ID>/round-<N>.md` and `round-<N>-verification.md`. Repair handoffs: `progress/<TASK-ID>.round-<N>-fix.md`. Do not accept unreviewed fixes or let a reviewer repair its own findings.
- Validate procedural reachability, reproducible generation, difficulty progression, weapon input transitions, boss gates, and the floor-100 victory boundary. A successful build or screenshot alone does not prove gameplay works.
- Preserve owner changes. Avoid unnecessary worktrees and local installations. Keep comprehensive designs and long test logs in their own documents, linking them from this file.

## Immediate next action

Create/push CK-00-02's accepted-task checkpoint and verify GitHub, then launch a new Luna CK-00-03 builder with accepted prerequisite handoff/review. Assign renderer lifecycle plus narrowly necessary shell/composition/test wiring; do not add CK-00-08's diagnostic boundary. Finish and publish CK-00-03 before starting authorized CK-00-04. Stop after CK-00-04 is accepted/pushed or a genuine blocker/review limit is reached; do not start another task. Mark the active automatic goal complete/blocked using `stop_goal` before final summary.
