# CryptKeep — Technical Specification and Task Plan

Version: 1.0 · Written: 2026-10-06 · Implementation status: not started.

**Audience:** the main coordinator/orchestrator and GPT-6 Luna builders, fixers and independent reviewers. The main agent owns this plan, delegation, acceptance, and continuity. Luna implements individually assigned tasks and separately reviews submissions under [REVIEW.md](REVIEW.md).

The supplied BlockCraft specification is a reference for detail, milestone gates, and small task boundaries. Its Jules workflow, Minecraft features, custom-renderer restriction, dependency rules, and PR requirements do not apply to CryptKeep.

## 0. How to execute this specification

### 0.1 Authority and decisions

The owner requires a first-person pixel-art dungeon crawler, procedural levels/enemies/loot, a progressively harder 100-level campaign, one progression boss per level, WASD and unrestricted horizontal mouse look, distinct weapon classes, sword normal/charged attacks, and bow right-click aiming plus left-release shooting.

The existing repository uses TypeScript, Three.js, and Vite. This plan retains that stack. The owner has accepted the recommended direction: single-player desktop browser, five weapon classes, ten dungeon regions, floor-entry checkpoint retry with current-floor gains rolled back, real 3D rooms/monsters with pixel textures and low-resolution rendering, and a target of 3–6 minutes per ordinary floor (approximately 5–10 hours overall, with longer boss milestones). The owner also approved one baseline Git commit followed by one commit per accepted task. Browser-local saving comes first; `.save` download/import follows later. Seeded enemy assembly, procedural original art/audio, exact numeric balance and other detailed content choices remain specified implementation defaults that can be tuned from evidence. Record future owner changes and revise affected tasks and dependencies.

Writing this specification authorizes planning only. A later request such as **“Start CK-00-01”** authorizes the orchestrator to delegate and finish that task, including review and scoped corrections. **“Start the next task”** selects the lowest ordered ready task. **“Complete milestone M03”** authorizes its tasks and review, but does not silently authorize unrelated prerequisites. No task in this document is already implemented merely because its design is specified.

### 0.2 One small task per builder assignment

1. Read `CONTEXT.md`, this task card, the referenced design sections, and accepted prerequisite handoffs. Inspect applicable `AGENTS.md` instructions and existing owner changes.
2. Confirm that prerequisite tasks are accepted, and that owned files are available. Existing tooling is verified and extended, not rebuilt automatically.
3. Spawn a subagent with **model `gpt-6-luna`** and **`fork_turns: "none"`**, supplying a self-contained authorized task packet. Explicitly assign its builder/fixer/reviewer role; CONTEXT's main-agent role does not transfer to the child. Never use Luna to author the project plan. If that model is unavailable, report the blocker rather than substituting silently.
4. Give it the delegation packet below. The main agent coordinates, reviews, runs checks, and maintains planning/progress records; builders write and fix application code.
5. After implementation, spawn a separate **`gpt-6-luna` reviewer**. Follow [REVIEW.md](REVIEW.md): a fresh reviewer per round; confirmed findings go to the original builder or a new Luna fixer; the round's reviewer verifies the repaired submission. The main agent may supply instructions missing from this specification, consistent with owner requirements and task scope.
6. Use at most **three review/repair rounds per task**, stopping early on a clean result. After the third repair, its reviewer verifies the final snapshot within that round; no fourth round or extra repair pass starts automatically. Unresolved issues leave the task unaccepted and are reported to the owner. No coordinator-built fallback implementation.
7. Accept only when independent review of the current submission and required checks pass. Update the task handoff and `CONTEXT.md`. Report changed behavior, review outcome/round count, validation and remaining limits.

Tasks are intentionally smaller than milestones. A task should introduce one algorithm, one state machine, one UI component, one content family, or one bounded integration. If a task requires multiple independent algorithms or exceeds a reviewable change, split it into `CK-XX-YY.a`, `.b`, etc., update the dependency graph, and keep the parent open until its children are accepted. Do not use task size as a reason to omit required behavior.

Use the owner's approved Git checkpoint workflow in Section 0.5. No automatic PR-per-task, hosting or deployment is required. Push only within the owner's authorized scope; the planning/environment baseline has been published, and implementation pushes follow the owner's task instructions. Shared workspace agents do not need a worktree by default. Run parallel agents only when requested, prerequisites are accepted, and file ownership is disjoint; shared composition roots, registries, and configuration require serialized integration tasks.

### 0.3 Delegation packet

Every launch includes:

- Task ID and exact goal; relevant sections of this specification.
- Accepted prerequisite handoff paths and the working tree baseline.
- Owned production files, corresponding tests, and explicit integration points.
- Input/output contracts, constants, prohibited scope expansion, and current open decisions.
- Acceptance cases, commands, browser/visual evidence requirements, and failure expectations.
- Instruction to preserve owner changes, add no future placeholder modules, and return a handoff.

An implementation handoff lives at `progress/<TASK-ID>.md` and contains task/model/agent identifiers, submitted or accepted status, summary, changed paths, interfaces, commands with actual outcomes, screenshot paths where relevant, limitations, and follow-on notes. Independent review and verification reports live at `reviews/<TASK-ID>/round-<N>.md` and `round-<N>-verification.md`; repair handoffs use `progress/<TASK-ID>.round-<N>-fix.md`. Record the reviewed snapshot and round count. Acceptance remains the orchestrator's decision. Blockers and design changes use `blockers/<TASK-ID>.md` and `decisions/<TASK-ID>.md` only when needed. Do not write invented completed work or leave failing work labeled accepted.

State flow: **pending → ready → running → submitted → reviewing → accepted**; **repairing**, **verifying**, **blocked** and **changes requested** are explicit stages. Prerequisites refer to *accepted* work. `SPEC.md` describes the work; `CONTEXT.md`, handoffs and review reports record what actually happened. A request to implement a task includes its bounded independent review and fixes; see REVIEW.md for round accounting.

### 0.4 File ownership and testing conventions

Task cards own only the named module/file family and its colocated `*.test.ts`, or explicitly named browser test. A directory path grants only files necessary for that card's narrow feature. Every task also writes its own handoff. Composition-root wiring is owned by integration cards. If another file must change, the orchestrator assigns that small addition explicitly or splits a follow-up; builders do not refactor neighboring systems opportunistically.

“Unit” acceptance means meaningful simulation/data tests. “Browser” means the running application with Playwright and checked page/console failures. “Visual” means screenshots that the reviewer opens and inspects, not only pixel statistics. Documentation-only work uses content review, not artificial tests. Earlier checks can be improved for real interface changes; do not weaken assertions to hide failures.

### 0.5 Git checkpoint workflow

The planning documents and reproducible cloud environment scaffold were committed and pushed to `Guna210/CryptKeep` on `master` under the owner's instruction. Publication state is recorded in CONTEXT.md and Git; do not recreate the baseline. Planning/recovery documentation can have separate maintenance commits, which do not advance the implementation-task ledger.

After each later task passes independent review and is accepted, create one commit containing that task's implementation/tests, handoff/review records and orchestrator progress update. Include the task ID in the commit message. Intermediate repair rounds stay within the task and do not require separate published commits. Stage explicit relevant paths, preserve unrelated owner edits, and check the staged diff. The orchestrator may create Git checkpoints as coordination work while Luna remains responsible for code changes.

Never commit dependencies, caches, browser binaries, generated test captures or uploaded reference documents. PR creation is not required for every small task. Future pushes/releases follow the owner's authorization; local task commits do not themselves authorize public deployment. Preserve existing remote history and do not force-push to bypass conflicting work.

## 1. Product scope and player experience

### 1.1 Complete loop

Title → New campaign with optional seed → safe entry on level 1 → explore, fight, loot, equip and heal → enter boss arena → defeat boss → collect reward → use unlocked descent → next level. Repeat through level 100. Killing the final boss commits victory immediately and presents campaign results; no descent to 101 exists.

Every level has a traversable critical path, optional branches, regular encounters, treasure, a safe spawn, a reachable boss arena, and one guarded exit. All regular enemies need not die to unlock the boss. Optional secrets and puzzles never gate required progression. Boss arenas close on voluntary entry and reopen on boss defeat or checkpoint reset.

The first milestone demonstrating the loop is a three-floor vertical slice with sword combat, generated melee enemies, a boss, loot-free basic equipment, death/retry, and a descent. This is an intermediate deliverable; the 100-floor finished campaign remains required.

The owner-approved pacing target is 3–6 minutes for an ordinary floor, with longer capstone/final boss floors, and approximately 5–10 hours for the full campaign. This is a playtest target rather than a guaranteed duration. Tune room traversal, encounter count and boss HP against recorded play at representative depths; maintain the 100-floor scope.

### 1.2 In-scope systems

- Continuous first-person movement, sprint, stamina dash, pointer lock, mouse sensitivity, and collisions.
- Five classes: sword, bow, axe, daggers, and elemental staff. Two equipped quick slots.
- Health, stamina, mana, finite arrows, reusable progression upgrades, healing consumables, status effects, guard/parry, damage tells, and readable HUD.
- Seeded layouts, ten regions, procedural enemy blueprints and elites, procedurally varied bosses, item bases/rarities/affixes, chests, pickups, armor, and charms.
- Character rank/perk choices, salvage and safe-room trading, optional traps, secrets, shrines, and puzzles.
- Pause, settings, key rebinding, campaign continuation, checkpoint retry, import/export saves, victory, help, and accessibility controls.
- Original pixel visuals, weapon/enemy animation, synthesized audio, deterministic diagnostics, generation checks, real browser gameplay checks, and measured performance work.

Multiplayer, infinite campaigns, destructible voxel worlds, survival crafting/hunger, native packaging, gamepad/mobile support, online accounts, and remote AI-generated content are outside version 1. These are scope boundaries, not hidden tasks. The owner's intended hosting target is Cloudflare Pages on a free account; deployment is a later requested delivery step, separate from these 196 game implementation tasks.

### 1.3 Default controls

| Action | Default | Behavior |
| --- | --- | --- |
| Move | W/A/S/D | Normalize diagonals; movement follows yaw only. |
| Look | Mouse | Unlimited yaw; pitch clamped to ±85°. No forced camera recenter. |
| Sprint | Left Shift | Uses stamina while moving; unavailable during guard/ADS/healing. |
| Dash | Space | Short directional evade; stamina cost and cooldown. No jumping requirement. |
| Primary | Left mouse | Class-specific attack/draw. |
| Secondary | Right mouse | Sword/axe guard, bow ADS, dagger evasive stance, staff alternate cast. |
| Interact | E | Pickups, chests, gates, shops, shrines. |
| Heal | Q | Timed consumable use. |
| Equip slots | 1/2 or mouse wheel | Switch weapons; cancels pending attacks safely. |
| Inventory / map | I / Tab | Paused panels; clear focused input and held actions. |
| Pause | Escape | Pauses simulation and releases pointer lock. |

Pointer capture begins only after a player gesture. Escape, blur, hidden page, inventory, death, victory, and failed capture clear input and cancel uncommitted attacks. Re-entry requires a click/Resume gesture. Holding a button across resume must not fire a stale attack. Disable browser context menus on the gameplay surface, while preserving normal menu interaction. Rebinding addresses duplicate bindings and reserved Escape behavior.

## 2. Technology, delivery, and budgets

| Concern | Decision |
| --- | --- |
| Language/build | Existing strict TypeScript configuration, Vite, pinned package lock. |
| Renderer | Three.js WebGL2; low-resolution world target scaled with nearest-neighbor sampling. |
| UI | Vanilla TypeScript DOM/CSS overlay at viewport resolution, independent of world pixelation. |
| Simulation | Pure TypeScript, fixed 60 Hz, renderer/input/storage-independent modules. |
| Generation | Seeded PRNG and named streams; bounded room/graph generation, validated output. |
| Physics/navigation | Flat floor occupancy grid, swept circle movement, swept projectile queries, grid A*. |
| Persistence | IndexedDB transactional records; small settings separately; no account/server. |
| Audio | Web Audio API with original synthesized effects and generative ambient layers. |
| Checks | Existing Vitest and Playwright/system Chromium; extend their configuration when needed. |
| Cloud workflow | Existing `tools/cloud-install.sh` and `npm run verify:environment`; no local engine installation. |

Use the versions already pinned in `package-lock.json`; upgrades require a specific reason. No additional runtime engine, UI framework, physics engine, or service is needed. New dependencies must solve an identified problem with a recorded rationale, not replace a core requirement with an unexplained abstraction.

Modern desktop Chrome/Edge and Firefox are targets; Safari gets a compatibility check before claiming support. Headless cloud Chromium often uses software rendering: CPU correctness there does not establish 60 FPS on a player's GPU. Public deployment is separate from cloud development. Offline *saves and simulation* are required; loading the application offline from a fresh browser is not promised without a later caching/delivery decision.

Initial budgets, revisited with measured evidence rather than assertions:

| Metric | Target and evidence |
| --- | --- |
| World output | Default 480×270 logical pixels, integer-fit where possible; selectable 320×180 and 640×360. |
| Play performance | 60 FPS goal at default quality on a measured integrated-GPU desktop/laptop; record actual hardware/browser. |
| Simulation CPU | p95 ≤ 4 ms per 60 Hz tick in a dense floor fixture on recorded cloud hardware. |
| Main-thread work | No recurring >50 ms tasks during steady gameplay; generation moved/sliced if measured stalls require it. |
| Floor generation | Typical pure generation ≤100 ms p95 on recorded cloud hardware; max 8 attempts then safe fallback. |
| Loading | Under 3 seconds target on real hardware after assets are loaded; cloud browser generous 20-second correctness deadline. |
| Floor caps | Grid at most 80×80; 18 rooms; 48 regular live enemies; 12 boss summons; 96 projectiles; 256 particles; 128 ground pickups. |
| Draw/resource budgets | Goal ≤200 world draw calls; instrument actual counts. Resources stabilize after 25 floor load/unload cycles. |
| Save | Active slot and checkpoint normally ≤2 MB combined; preserve correct behavior if storage is denied or full. |

When a budget fails, report the fixture and numbers and assign a bounded optimization task. Do not hide problems by relaxing limits without a documented design decision.

## 3. Simulation and architecture contracts

### 3.1 Planned layout

Only create modules when their tasks implement them.

```text
index.html
src/
  main.ts                 # composition root; integration tasks own wiring
  app/                    # screens, lifecycle, new/continue/retry/descent
  core/                   # clocks, RNG, IDs, commands, events, math
  dungeon/                # grid, room graph, generation, roles, validation, regions
  player/                 # movement, resources, XP/perks, equipment stats
  combat/                 # damage, queries, projectiles, statuses, weapon dispatcher
  weapons/                # sword, bow, axe, daggers, staff (logic only)
  enemies/                # blueprints, AI state machines, sensing, steering
  bosses/                 # kits, ability scheduler, arena logic, final boss
  loot/                   # bases, rarity, affixes, rolls, drops, economy
  inventory/              # slots, equipment, transfers
  exploration/            # interactables, fog/map, traps, secrets, puzzles
  render/                 # Three.js world, meshes, textures, rigs, viewmodels, FX
  ui/                     # DOM HUD, inventory, menus, settings, help
  audio/                  # synthesis, event bridge, positional mixer, ambience
  persist/                # DTO codec, versioning, IndexedDB, save coordinator
  debug/                  # domain diagnostics, production-disabled test hooks
tests/e2e/                # input, slice, UI, saves, progression
tests/harness/            # browser fixture and error collection
tools/                   # existing cloud tooling plus verification/diagnostics
progress/ decisions/ blockers/ reviews/
docs/evidence/<TASK-ID>/  # selected screenshots/reports; avoid committing large captures
```

Colocated unit tests match the existing Vitest configuration. Existing tooling and docs are preserved. `main.ts` remains a small composition root; per-domain integrations use explicit adapters rather than one ever-growing loop.

### 3.2 Coordinates and world model

Right-handed Three.js coordinates: +Y up; navigation uses X/Z. One grid cell is 2 world meters, wall height 3 meters, player radius 0.28 m and camera height 1.6 m. Floors are planar; visual steps/ramps do not introduce multi-storey pathfinding. Corridors are at least two cells wide; door/arena clearance is checked against the largest supported collider.

Use value records rather than a generic ECS framework. IDs are stable strings derived from campaign seed, floor, domain, and spawn ordinal. Logic does not inspect meshes. Enemy/prop/projectile colliders exist independently of their render objects. Renderer interpolation never writes back to simulation state.

### 3.3 Minimum shared records

These are design contracts; tasks introduce complete, immediately used portions and can extend them additively.

- `CampaignConfig`: normalized seed, ruleset version, difficulty setting (Normal in v1), content version.
- `FloorPlan`: floor number 1–100, floor seed, generator version, width/height, tile occupancy, rooms and graph edges, entry/boss/exit markers, reserved paths, interactable and encounter spawn records, content hashes.
- `FloorRuntime`: plan plus mutable entity states, gate state, arena state, explored cells, opened chests, collected rewards, puzzle/trap state, local RNG cursors and tick.
- `PlayerState`: pose, velocity, health/stamina/mana, arrows and healing stacks, inventory/equipped UIDs, rank/XP/perks, statuses, weapon state and cooldowns.
- `EnemyBlueprint`: stable ID, rig family, archetype, validated visual parts/palette/scale, combat stats, ability IDs, elemental/elite traits, depth and threat cost.
- `ItemInstance`: UID, class/base ID, depth, rarity, rolled stats, affix IDs and values, display name, visual recipe; equipped stats are derived rather than independently saved.
- `DamagePacket`: source/target, attack ID, amount, damage type, optional status payload, origin/direction, flags; resolved through one damage pipeline.
- `GameCommand`: per-tick movement axes, look deltas, held/pressed/released actions and interaction target; browser events feed this boundary.
- `GameEvent`: typed attack/damage/death/pickup/gate/screen/resource events, consumed by render/UI/audio without feeding gameplay back into the emitter.

Public commands return success/failure with a reason for transactions. Definitions are immutable and versioned. Runtime records contain no DOM, Three.js objects, functions, or storage handles. IDs break ties in deterministic entity iteration. Random visual decorations use a different stream from combat/loot.

### 3.4 Time, input, and randomness

Fixed step: 1/60 second. Clamp accumulated elapsed wall time to 0.1 s and run at most six catch-up ticks; drop excess time visibly in diagnostics instead of creating a spiral. Pause stops simulation/AI/status/cooldowns, not UI animations. Resume resets wall-clock baseline. Tests advance exact ticks, not real sleeps.

Seeded integer PRNG with documented algorithm and test vectors. Derive independent named streams for layout, room roles, encounters, each enemy, boss, containers, each enemy drop, and cosmetic art. Generation hashes exclude timestamps and UI state. Combat consumes its own saved cursor; adding a texture must not change loot. Save/continue preserves RNG continuation. Version changes do not silently regenerate an incompatible save. Preserve an ordered action-edge queue so a press and release within one tick still produces one tap; consume accumulated look deltas once rather than once per catch-up tick. Use xoshiro128** with four unsigned 32-bit words, documented FNV-1a UTF-8 seed/stream derivation, and a nonzero-state rule. Normalize entered seeds with trim/NFC and a 64-character limit; new campaign randomness is chosen once and then recorded.

### 3.5 Tick ordering

Consume commands → movement/static collision → enemy decisions/steering → weapon/boss actions → swept projectiles and hit queries → damage/status resolution → deaths/drop transactions → gate/progression commands → resource regen/XP → event snapshot. Apply removals after stable iteration. Resolve the player/boss simultaneous-death case by evaluating **final boss victory first once its death is committed**, and normal-floor player death before permitting a descent. Emit each kill/reward once.

## 4. Procedural campaign design

### 4.1 Floor pipeline

1. Derive seed from campaign seed, ruleset version, and floor number.
2. Choose region, layout grammar, room budget, and difficulty profile.
3. Place non-overlapping rooms with bounded attempts; connect a room graph with a spanning path plus optional loops.
4. Carve corridors; reserve safe entry, boss approach, arena, boss reward, and exit positions.
5. Assign room purposes and optional content; fill encounters against a threat budget.
6. Place treasure/hazards/props outside reserved clearances and validate collision.
7. Validate the actual traversable tile graph and required interaction reach.
8. Retry with deterministically derived attempt seed, at most eight times; use a valid documented fallback layout if all attempts fail.
9. Build runtime records, then render. Keep only the current floor runtime and its compact checkpoint, not 100 loaded scenes.

Required invariants: start is safe; start→boss approach exists; boss arena is maneuverable; boss reward and exit are reachable after boss death; required path contains no secret/puzzle/shop gate; all entities spawn outside walls and one another's minimum clearance; boss is not in a corridor; no lethal unavoidable spawn hazard; all randomized values are finite and within bounds.

Fallback generation is a playable entry/corridor/arena with side rooms and full required content, not an empty square masquerading as success. Log its seed/reason in diagnostics. Generated environments need multiple layouts; palette swaps alone do not satisfy variation.

### 4.2 Regions, layouts, and encounters

| Levels | Region | Palette/architecture | Encounter/hazard emphasis | Boss kit |
| --- | --- | --- | --- | --- |
| 1–10 | Dustbound Vaults | Ochre stone, burial niches | Grunts, stalkers; readable simple traps | Cairn Warden |
| 11–20 | Rootrot Warrens | Moss, roots, broken masonry | Skirmishers, thorn bolts, floor snares | Briar Matron |
| 21–30 | Drowned Reliquary | Blue stone, shallow water effects | Ranged lines, chill patches | Bellkeeper |
| 31–40 | Ember Foundry | Rust iron, ember cracks | Brutes, burning lanes | Furnace Marshal |
| 41–50 | Pale Ossuary | Bone-white stone, tall ribs | Bulwarks, ranged crossfire | Ivory Bailiff |
| 51–60 | Mirror Catacombs | Violet glass, angular alcoves | Casters, lateral pressure | Prism Seer |
| 61–70 | Storm Galleries | Teal runes, copper rails | Shock zones, mobile shooters | Coil Regent |
| 71–80 | Hollow Choir | Slate, hanging banners | Summoners, mixed priority targets | Dirge Abbot |
| 81–90 | Blackglass Depths | Dark rock, amber edges | Burrowers, elites, telegraphed bursts | Ashen Colossus |
| 91–100 | Crown Crypt | Charcoal, gold, crimson | Full mixed roster, tightly bounded elite combinations | Crown champions; final Sovereign |

Minimum five layout grammars: branching crypt, looped galleries, courtyard spokes, split-wing halls, and irregular caverns assembled on the same occupancy grid. Each region supports at least two grammars and six room dressing templates with mechanical/readability differences. No simulated drowning, fluids, or mirror ray tracing is required.

Enemy roster expands gradually. A threat budget combines count, archetype, level, elite traits, and room geometry. Forty-eight weak enemies cannot simply replace a thoughtfully budgeted late-floor encounter. Minimum a melee fallback and renewable ranged resources make unlucky drops survivable. No infinite enemy respawning or XP farming in the current floor.

### 4.3 Difficulty and balance baseline

Let `d = floor - 1`. Initial tunable multipliers:

- Enemy HP: `H(d) = 1 + 0.055d + 0.0006d²`.
- Enemy direct damage: `D(d) = 1 + 0.035d`.
- Weapon depth power: `P(d) = 1 + 0.035d + 0.0002d²`.
- Boss HP: archetype reference HP × H(d), initially 4–7 regular brute equivalents; boss damage uses D(d) and its attack coefficient.
- Movement/attack speed: bounded modifiers; never scale speed indefinitely. Regular tell ≥0.3 s, boss heavy tell ≥0.65 s; phase changes cannot cancel tells into immediate damage.
- Every tenth floor gets a capstone behavior/reward upgrade; floor 100 adds the final boss kit. Tier unlocks introduce behavior, not only HP.

These are starting design values, not proof of fun or guaranteed winning outcomes. Within a comparable archetype, base threat/HP/damage increases monotonically with depth. Median encounter threat and typical item power also rise across all 100 floors. Because monsters/classes differ, a floor-11 grunt need not exceed every floor-10 boss statistic. Floor 100 has the highest campaign encounter budgets and final-boss capability.

Balance validation records normal-equipped time-to-kill, effective survival, healing availability, resource economy, and representative real combat at floors 1/10/25/50/75/99/100. Adjust numeric data through bounded tasks without deleting mechanics. Rare affix spikes must not create immortal enemies, negative cooldowns, infinite mana, or guaranteed unavoidable attacks.

## 5. Combat, weapons, and procedural enemies

### 5.1 Player rules

Initial health/stamina/mana: 100/100/60. Walking 3.5 m/s; sprint 5.5 m/s with 18 stamina/s. Dash initially costs 25 stamina, travels at most 2.2 m over 0.22 s, cooldown 0.8 s, and grants only 0.10 s of enemy-hit evasion; walls still stop it. Stamina regenerates 22/s after 0.65 s without spending, mana 6/s after 1 s. No automatic health regeneration.

Armor uses bounded reduction `armor / (armor + 100)`, capped at 60%; resistances capped at 50%. Damage stays ≥1 unless an explicit block/evasion negates it. Crit chance capped at 35%, crit multiplier at 2.5. Knockback is bounded and collision-safe. Status ticks use simulation time.

Healing: Q consumes one tonic only when a 0.75 s use completes, restoring 40% max HP; taking damage or changing screen cancels uncommitted use. Tonics stack to six. Arrows cap at 60; missed arrows may be recovered from reachable world impacts, once per projectile. Mana and guaranteed ammunition/tonics at safe trading points prevent class-related softlocks.

Rank 1–50. XP to next rank initially `50 + 25 × (rank - 1)`. Per rank: +6 base max HP and one chosen perk point. Vitality adds +8 HP/point; Might +2% outgoing physical damage/point; Focus +3 mana and +2% elemental damage/point; each perk caps at 20. Unspent points persist. Exact balance is tuned in M19.

### 5.2 Weapon behavior contract

Every class implements an immediately useful subset of `updateWeapon(state, command, context) → state + attack requests + events`; the combat adapter resolves collision/damage. States are **idle / windup-or-draw / active-or-release / recovery**, with explicit cancellation. One attack ID hits a target at most once unless a documented multi-hit pattern creates distinct sub-attacks. Animation is driven by state time, never the source of hit timing.

| Class | Primary | Secondary | Initial constraints |
| --- | --- | --- | --- |
| Sword | Tap-release before 0.25 s: light slash. Hold ≥0.25 s: charge; release up to 1.2 s charge gives heavy slash. | Hold guard; first 0.15 s can parry a frontal physical melee hit. | 2.0 m reach, 90° light arc, charge consumes stamina at release; no auto-fire while held. |
| Bow | Hold to draw; left-release fires if ≥0.12 s and arrow available. Full draw 1.0 s; movement slowed. | Hold ADS; smooth reduced FOV; sensitivity scaled. | Arrow speed/damage rises with draw; gravity; release consumes one arrow. No hitscan or click-press shot. |
| Axe | Click heavy cleave; hold ≥0.35 s then release overhead charge. | Guard with greater stamina cost and no parry. | 2.3 m reach, slower recovery, heavy stagger; charged hit breaks shield posture, not walls. |
| Daggers | Alternating fast left/right attacks; bounded three-strike combo. | Brief evasive stance, resource cost, cooldown. | 1.4 m reach; rear positional attack bonus; no stacking evade with dash indefinitely. |
| Staff | Cast selected ember/frost/storm bolt on press, mana spent at accepted cast. | Hold 0.6 s channel then release short cone burst. | Clear mana/cooldown costs; bolt/burst use status engine; no free casts on canceled input. |

Swords distinguish click/tap from charge; a left press starts anticipation but does not cause a hit before release. The UI help explains this. Every weapon has a full feedback chain: input → state → visible tell → validated attack → impact → recovery. No class is just a color/stat reskin.

Class switching, pause, blur, inventory, death, floor loading, and resource failure have tested transitions. A committed projectile or damage packet is not reversed by pause; an uncommitted charge is canceled without spending its release cost. Clearing input must never be interpreted as a normal bow release.

### 5.3 Damage, statuses, and affix effects

Damage types: physical, ember, frost, storm. Statuses: burning (bounded DoT), bleeding (bounded physical DoT), chilled (max 30% movement slow), shocked (short bounded stagger, cooldown), weakened (max 20% outgoing damage reduction). No chained stun can deny all actions. Refresh rules and stack caps live in one registry. Affixes use the same handlers as enemy abilities, not one-off behavior scattered in weapon render code.

Processing: validate target/team/range/line-of-sight → roll permitted crit → apply source modifiers → guard/evasion/resist/armor → HP/status/stagger → death once → events. Walls block melee and projectiles. Headshots are an optional later task, not needed to complete this spec.

### 5.4 Enemy generation

Minimum eight behavior archetypes: stalker (basic pursuer), brute (slow heavy windup), archer (spacing/projectile), hexer (telegraphed elemental area), skirmisher (flank/dash), bulwark (frontal posture guard), summoner (finite minions), burrower (marked relocation then emergence). Six compatible rig families and at least three silhouettes per family; palettes, parts, scale, element and abilities are assembled from authored constraint tables.

Blueprint generation must produce coherent models and compatible attacks. Rig family constrains part sockets; archetype constrains minimum tells, collision size and ability budget. Traits carry threat costs. Elites get at most two compatible traits; no summoner-with-summoner recursion, invisible no-tell burst, permanent invulnerability, or full stun lock. Region/depth controls unlocks and weights. Cosmetic RNG cannot change stats.

AI: idle/patrol → notice/pursue → approach or maintain range → tell → attack → recover → stagger/dead. LOS respects walls. A* uses the actual collision grid; steering avoids permanent door jams. Navigation work is budgeted and reuses paths; all enemies are not repathed every tick. Leash/reset rules do not duplicate drops or clear committed boss rewards.

## 6. Bosses, loot, economy, and exploration

### 6.1 Boss requirements

Each floor creates exactly one progression boss from its region kit, depth, a legal move selection, constrained traits, and visual recipe. Ten region kits with at least three available moves each; choose at least two moves on early bosses and three on later bosses. All kits get phase variation at capstones, with an observable transition.

Reusable move primitives: frontal wave/slam, collision-aware charge, marked projectile barrage, finite summon wave, and destructible shield-anchor mechanic. Validated arenas provide escape lanes and reachable anchors. Summons share caps and cannot summon again. Rewards are exactly once even across repeated death events or save reload.

Final Crypt Sovereign: three phases at 70% and 35% HP, at least five total moves drawn from mastered primitives, a visible arena-wide warning with safe zones, and a distinct final phase. The final phase increases pattern pressure within speed/cap limits; it is not an arbitrary instant kill. Boss UI reports name, health, phases and gate state. Optional lore framing establishes descent into the Crown Crypt without copying another game's characters.

### 6.2 Procedural item pool

Thirty weapon bases minimum: six per class, each differing in at least two timing/range/projectile/resource parameters rather than only a name. Armor has six bases; charms six. Five rarity tiers:

| Rarity | Baseline roll weight | Affix count | Typical stat multiplier |
| --- | --- | --- | --- |
| Worn | 38 | 0 | 0.9–1.0 |
| Common | 34 | 0–1 | 1.0–1.1 |
| Rare | 20 | 1–2 | 1.1–1.25 |
| Relic | 7 | 2–3 | 1.2–1.4 |
| Mythic | 1 | 3 plus one signature behavior | 1.3–1.5 |

Depth and source alter weights with normalized bounds. Boss rewards guarantee a class-usable Rare-or-better option, with no universal best class. At least 24 regular affixes spanning damage type, status, speed/charge, range, resource, stagger, and on-hit utility; at least five signature behaviors, one per weapon class. Compatibility/exclusion tags prevent meaningless or recursive combinations. Display the actual changed behavior and rolled values.

Examples: Keen (crit), Fleet (recovery), Deepdraw (bow full-draw damage), Cinder (burn payload), Rime (chill), Resonant (bounded storm chain), Steady (lower resource cost), Rupturing (posture/stagger). Staff affixes do not modify arrow count; dagger backstab modifiers do not roll on bows. Minimum timings, resources, and caps apply after modifiers. A roll with no legal combination uses a valid base result, never hangs retrying.

Drops depend on stable source IDs, not frame timing. Chest opening, boss rewards, ground pickup, salvage, shop purchase and equip changes are atomic transactions with deduplication. Full inventory gives an explicit choice; do not erase the item. Twenty-four backpack slots, two weapon slots, one armor slot, one charm slot, consumable stacks. Items have one owned UID payload and exactly one backpack/equipment location; equip swaps are atomic and cannot lose displaced gear. The starter Watchblade is bound and cannot be dropped or salvaged, guaranteeing a melee fallback. Ground drops cap at 128; excess regular drops use a deterministic collection/cache policy that preserves valuable rewards.

Comparison reports DPS approximation with caveats, damage/range/timing/resource/affixes and elemental role. A displayed “power” score helps sorting but cannot decide the best item universally.

### 6.3 Economy and optional exploration

Salvage grants dust by item depth/rarity. Safe-room trader/shrine appears at floor entry on levels 1, 10, 20, …, 90, with deterministic stock, guaranteed ammunition/healing, and no combat in its radius. One item upgrade per ten depth levels costs dust, increases bounded base stats, keeps UID/affixes, and cannot indefinitely compound. Essential healing/ammo also appear in normal floors through constrained drops/chests.

Optional content: fog-of-war map, pressure/blade traps, dart traps, elemental patches, secrets, sigil-order and lever puzzles, two-choice shrines with displayed tradeoffs, and short original lore discoveries. Secrets/puzzles yield optional loot; no key or weapon class is needed for the critical path. Failure costs are clear, bounded, and cannot consume the only campaign exit.

## 7. Persistence, screens, visuals, and accessibility

### 7.1 Save and death semantics

One active campaign slot plus its floor-entry checkpoint. Multiple user profiles are not needed. Active saves restore the current floor's exact mutable state, including opened rewards, enemy HP, player pose/resources, RNG cursors, and cooldown/status times. Browser audio/held input is not restored.

Initial delivery uses browser-local saves through the planned IndexedDB storage. Portable save transfer is a later feature (CK-13-09): download a `.save` file containing the same versioned JSON campaign envelope, including active progress and checkpoint, then select that file in a later session to continue. This requires no account or save server. Validate its contents and compatibility before changing the active slot; a filename extension alone does not establish a valid save.

Checkpoint is created at safe floor entry after descent, before any new-floor combat. Death retries that checkpoint: same seed/layout, entry equipment/resources/rank/XP, fresh floor-entry enemies/chests; current-floor gains and purchases made after that checkpoint are rolled back. There is no death corpse or duplication loop. Explain this on death and save/help screens. Returning to title via save preserves active progress. Continue after an active save already records death opens the death screen rather than silently reviving the player.

Victory is durable. Committed final-boss death overrides simultaneous player death, awards reward once, marks complete, and attempts its transactional result save before reporting durability; a storage failure preserves in-memory victory with a visible Not saved state. Continue on a completed campaign opens its results; New campaign is a separate explicit action.

Save format has schema/content/generator versions, checksums where useful, config, runtime snapshot, checkpoint, and monotonic transaction identifiers. IndexedDB writes active+checkpoint updates atomically when a transition requires both. Validate imported/untrusted JSON shape, sizes, ranges and IDs; never execute values. Unknown newer formats are preserved and explained, not deleted. Quota/permission/write failures keep play possible and present an honest “not saved” state with export option. Explicit abandon/delete has a clear confirmation because it destroys a save.

### 7.2 Presentation

Low-poly 3D rooms and assembled creatures with original 16×16 or 32×32 pixel textures, nearest sampling, strong palettes, dithered detail, limited light count, fog and readable silhouettes. World render is pixelated; DOM text remains sharp and legible. Pixel style does not excuse blank walls, interchangeable enemies, or invisible tells.

Each class has its own animated first-person viewmodel, trail/charge/impact vocabulary and icon. Enemy parts animate through readable idle/move/tell/attack/hit/death poses. Boss tells remain visible amid effects. Item rarity uses color and text/icon shape. UI covers resources, quick slots, draw/charge, active statuses, damage direction, interact prompt, floor/region, boss/gate, map and inventory.

Original textures/meshes/audio can be generated in code or authored in the repo; this plan defaults to code-generated art and Web Audio to limit storage and licensing overhead. Keep attribution if any external licensed asset is later approved. Do not reproduce Borderlands assets, names, or branding; the reference concerns loot variety.

### 7.3 Settings and resilience

Sensitivity, invert Y, FOV 65–100 (default 80), world resolution, UI scale, master/effects/ambience volume, camera shake, head bob, damage flashes, and reduced motion. Persist settings independently of campaign deletion. Rebinding uses action names rather than raw key references in gameplay modules. Menus support keyboard focus and clear labels.

WebGL2 unavailable/context loss, pointer-lock denial, suspended AudioContext, denied storage, corrupted saves, resize, tab blur, and hidden page have recoverable states. Pause safely on context loss; a recovery attempt recreates rendering from simulation state without regenerating the floor. Accessibility settings never remove essential attack tells or silently change damage.

## 8. Verification and milestone gates

### 8.1 Commands and evidence

Existing scripts: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. CK-00-09 adds `npm run verify` as the combined real-app workflow. `npm run verify:environment` remains a generated fixture check, not gameplay evidence. Configure Playwright's webServer after an app exists; reuse preinstalled cloud Chromium, no routine browser download.

Simulation tests cover RNG, reachability, progression, transactions, input/weapon transitions, damage/AI, saves and boundary conditions. Browser tests cover trusted user interaction, pointer capture/resume, screen navigation, actual rendering, weapon feedback and restoration. Visual tasks record chosen seed/pose/settings so screenshots are reproducible, but cross-GPU exact pixel hashes are not required.

Diagnostic API exists only in development or an explicit test build; never a production query-string cheat. Add domain methods only with the feature: read snapshot, advance deterministic ticks, install documented fixture, observe events/render stats. Test fixture injection is labeled. Logic tests may set a boundary state; at least one normal-input browser test per weapon verifies the actual input adapter. A forced kill or teleport does not prove legitimate campaign balance.

### 8.2 Milestone gate rules

A milestone is accepted after its task cards, independent reviews, relevant checks, and listed player-visible outcome pass. Every assigned task follows REVIEW.md, including documentation/tooling tasks with appropriately scoped review. Milestone IDs organize work, not artificial all-or-nothing prerequisites: the per-task graph is authoritative. Early pure modules can start as soon as their accepted dependencies exist. Do not claim a milestone from partially accepted tasks.

Every task card below inherits Sections 0.3–0.4. The **Build** field is bounded scope; **Accept** gives concrete cases; **Evidence** states the expected review artifact. Unit cases belong to that module's colocated tests unless a different test path is named. UI/visual cards include an appropriate browser fixture and inspected screenshot; visual asset consistency can use deterministic data tests but should not pretend pixel appearance is established by hashes alone.

## 9. Detailed implementation task cards

There are **196 tasks across 20 milestones (M00–M19)**. All are initially pending. IDs remain stable once work starts; insert split/fix tasks with suffixes rather than renumber accepted work. Start with **CK-00-01**. Section 0 defines shared launch/handoff/review rules; Appendix A supplies concrete game data.

### M00 — Application foundation and trustworthy checks

**Milestone acceptance:** A real page renders through Three.js, time/input/RNG utilities are tested, and the cloud browser harness reports genuine failures.

#### CK-00-01 — Audit the existing cloud scaffold

- **Depends on:** None.
- **Owns:** `docs/environment-start.md`; `README.md`; matching tests and `progress/CK-00-01.md`.
- **Build:** Verify the pinned environment and reserved scripts; document the actual baseline without installing another engine.
- **Accept:** Run verify:environment when dependencies exist or install through the documented script; distinguish fixture success from nonexistent gameplay.
- **Evidence:** Command outcomes and baseline handoff.

#### CK-00-02 — Create the application shell

- **Depends on:** `CK-00-01`
- **Owns:** `index.html`; `src/main.ts`; `src/app/shell.ts`; `src/ui/shell.css`; matching tests and `progress/CK-00-02.md`.
- **Build:** Add a real canvas/DOM root, loading shell and unsupported-WebGL2 message; own initial composition only.
- **Accept:** Build serves the shell; resize fills viewport; simulated unavailable capability displays a readable message.
- **Evidence:** Build plus shell screenshot.

#### CK-00-03 — Implement renderer resource lifecycle

- **Depends on:** `CK-00-02`
- **Owns:** `src/render/renderer.ts`; matching tests and `progress/CK-00-03.md`.
- **Build:** Own Three.js renderer, scene/camera, resize and explicit dispose; render a complete diagnostic geometry fixture.
- **Accept:** Resize preserves aspect; create/dispose does not leak listeners or duplicate canvases; report GPU resource counts.
- **Evidence:** Lifecycle checks and inspected fixture.

#### CK-00-04 — Implement fixed-step clock

- **Depends on:** `CK-00-01`
- **Owns:** `src/core/clock.ts`; matching tests and `progress/CK-00-04.md`.
- **Build:** Build 60 Hz accumulator, pause/resume baseline reset, six-tick clamp, and interpolation fraction.
- **Accept:** Different frame schedules give equal step counts; hidden-time resume causes no burst; long frames remain bounded.
- **Evidence:** Unit cases for timing boundaries.

#### CK-00-05 — Implement seeded random streams and stable IDs

- **Depends on:** `CK-00-01`
- **Owns:** `src/core/rng.ts`; `src/core/ids.ts`; matching tests and `progress/CK-00-05.md`.
- **Build:** Document integer PRNG vectors, seed normalization, stream derivation, cursor restore and domain/source IDs.
- **Accept:** Same seed/cursor reproduces output; distinct streams isolate cosmetic draws; malformed seeds normalize deterministically.
- **Evidence:** Unit vectors and save-cursor round trip.

#### CK-00-06 — Implement semantic input sampling

- **Depends on:** `CK-00-01`
- **Owns:** `src/core/input.ts`; `src/core/commands.ts`; matching tests and `progress/CK-00-06.md`.
- **Build:** Track held/pressed/released actions, movement axes and mouse deltas; cancellation has a separate reason from normal release.
- **Accept:** One edge per sample; repeat keydown creates no repeat press; clearInput never emits a shot-producing release. Press/release within one tick is preserved; look delta is not applied twice during catch-up.
- **Evidence:** Unit event-sequence cases.

#### CK-00-07 — Implement typed event collection

- **Depends on:** `CK-00-04`
- **Owns:** `src/core/events.ts`; matching tests and `progress/CK-00-07.md`.
- **Build:** Add per-tick typed event batches with ordered consumption and unsubscribe/disposal; start with lifecycle events.
- **Accept:** Subscribers see stable order; unsubscribe and repeated lifecycle cleanup work; consumers cannot mutate prior batches.
- **Evidence:** Unit event/disposal cases.

#### CK-00-08 — Create browser harness and diagnostic boundary

- **Depends on:** `CK-00-02`, `CK-00-03`
- **Owns:** `tests/harness/browser.ts`; `tests/e2e/shell.spec.ts`; `src/debug/index.ts`; `playwright.config.ts`; matching tests and `progress/CK-00-08.md`.
- **Build:** Launch the real app with existing system Chromium; collect console/page errors; expose readiness/render snapshots only in dev/test.
- **Accept:** Shell smoke passes; deliberately failing temporary fixture is detected; production build lacks diagnostic globals.
- **Evidence:** Browser smoke and harness negative-control outcome.

#### CK-00-09 — Create combined verification command

- **Depends on:** `CK-00-08`
- **Owns:** `tools/verify.mjs`; `package.json`; matching tests and `progress/CK-00-09.md`.
- **Build:** Add npm run verify with failing exit on typecheck, unit, build or browser stage; handle an initially empty unit suite explicitly.
- **Accept:** A failing stage cannot yield success; real shell browser check runs; environment fixture is reported separately.
- **Evidence:** Command outputs including a controlled failure.

#### CK-00-10 — Add CI verification workflow

- **Depends on:** `CK-00-09`
- **Owns:** `.github/workflows/verify.yml`; matching tests and `progress/CK-00-10.md`.
- **Build:** Run the same app checks in CI with documented Chromium provisioning; upload concise failure evidence.
- **Accept:** Workflow syntax and commands match local tools; no secrets or cloud-specific absolute cache paths are required.
- **Evidence:** Workflow review; distinguish configured CI from an observed remote run.

### M01 — Traversable seeded floor foundation

**Milestone acceptance:** A generated floor renders with reachable entry, boss area and exit markers; retries and fallback are bounded.

#### CK-01-01 — Define floor grid and coordinate queries

- **Depends on:** `CK-00-05`
- **Owns:** `src/dungeon/grid.ts`; `src/dungeon/types.ts`; matching tests and `progress/CK-01-01.md`.
- **Build:** Create occupancy, world↔cell conversion, room rectangles and immutable floor-plan records for immediately used fields.
- **Accept:** Boundary/negative coordinates, neighbors and cell centers work; unsupported floor numbers reject clearly.
- **Evidence:** Unit grid/record tests.

#### CK-01-02 — Place seeded non-overlapping rooms

- **Depends on:** `CK-01-01`
- **Owns:** `src/dungeon/rooms.ts`; matching tests and `progress/CK-01-02.md`.
- **Build:** Implement bounded rectangle placement, room-count/clearance limits and deterministic room IDs.
- **Accept:** Rooms never overlap; identical seeds match; impossible requests terminate rather than loop.
- **Evidence:** Seed corpus unit cases.

#### CK-01-03 — Connect room graph and carve corridors

- **Depends on:** `CK-01-02`
- **Owns:** `src/dungeon/corridors.ts`; matching tests and `progress/CK-01-03.md`.
- **Build:** Build a spanning connection graph with optional loops and two-cell corridors; keep endpoints inside rooms.
- **Accept:** All rooms connect; corridors do not escape the grid; same seed gives same edges; alternate routes can occur.
- **Evidence:** Connectivity tests and map dump.

#### CK-01-04 — Assign entry, arena and exit roles

- **Depends on:** `CK-01-03`
- **Owns:** `src/dungeon/roles.ts`; matching tests and `progress/CK-01-04.md`.
- **Build:** Choose safe entry and distant boss room; reserve arena/exit approach, spawn pads and critical clearances.
- **Accept:** Entry→approach path exists; boss/exit roles are distinct usable positions; arena minimum maneuver space is enforced.
- **Evidence:** Role/reachability unit fixtures.

#### CK-01-05 — Validate, retry and provide safe fallback

- **Depends on:** `CK-01-04`
- **Owns:** `src/dungeon/validate.ts`; `src/dungeon/generate.ts`; `src/dungeon/fallback.ts`; matching tests and `progress/CK-01-05.md`.
- **Build:** Compose base generation with actual-grid flood fill, eight deterministic retries, and a complete fallback.
- **Accept:** Injected invalid attempt triggers retries; fallback includes required rooms/markers; validation catches blocked exits and spawn overlaps.
- **Evidence:** Generator unit suite including forced fallback.

#### CK-01-06 — Generate base pixel materials

- **Depends on:** `CK-00-03`, `CK-00-05`
- **Owns:** `src/render/textures/base.ts`; `src/render/materials.ts`; matching tests and `progress/CK-01-06.md`.
- **Build:** Create deterministic stone/floor/door/marker tiles with nearest sampling; centralize texture ownership.
- **Accept:** Recipes are deterministic; textures have valid dimensions; disposal releases shared resources exactly once.
- **Evidence:** Texture checks and material contact sheet.

#### CK-01-07 — Render occupancy and room markers

- **Depends on:** `CK-01-05`, `CK-01-06`
- **Owns:** `src/render/floor.ts`; matching tests and `progress/CK-01-07.md`.
- **Build:** Create walls/floor/ceiling and unmistakable diagnostic entry/boss/exit markers; geometry follows collision grid.
- **Accept:** No gaps or walls across clear paths; repeated rebuilding disposes prior floor objects.
- **Evidence:** Rendered generated-floor screenshots from fixed seeds.

#### CK-01-08 — Wire floor generation into app lifecycle

- **Depends on:** `CK-01-07`, `CK-00-04`, `CK-00-07`
- **Owns:** `src/app/floor-session.ts`; `src/main.ts`; `tests/e2e/floor.spec.ts`; matching tests and `progress/CK-01-08.md`.
- **Build:** Generate/load a seed through a loading state and display the real floor; add matching debug snapshot.
- **Accept:** Two seeds visibly differ; loading errors are surfaced; repeat load keeps a single scene/session.
- **Evidence:** Browser generation and floor disposal smoke.

### M02 — First-person movement and safe input capture

**Milestone acceptance:** The player moves and looks freely in real generated rooms, respects walls, and pauses/resumes without stale actions.

#### CK-02-01 — Define player resources and safe spawn state

- **Depends on:** `CK-01-05`
- **Owns:** `src/player/state.ts`; `src/player/resources.ts`; matching tests and `progress/CK-02-01.md`.
- **Build:** Create player pose, base health/stamina/mana, resource clamping and deterministic safe-spawn selection.
- **Accept:** Initial values match Section 5; invalid placement repairs to entry; spending cannot make negative values.
- **Evidence:** Unit resource/spawn cases.

#### CK-02-02 — Implement normalized planar locomotion

- **Depends on:** `CK-02-01`, `CK-00-06`
- **Owns:** `src/player/movement.ts`; matching tests and `progress/CK-02-02.md`.
- **Build:** Translate local axes by yaw with acceleration/deceleration; pitch does not alter walking direction.
- **Accept:** Diagonal speed equals straight speed; opposite keys cancel; frame/tick timing is explicit.
- **Evidence:** Unit movement vectors.

#### CK-02-03 — Implement swept circle/grid collision

- **Depends on:** `CK-02-02`, `CK-01-01`
- **Owns:** `src/player/collision.ts`; matching tests and `progress/CK-02-03.md`.
- **Build:** Stop tunneling through walls and slide along corners using radius-aware occupancy queries.
- **Accept:** Fast motion/dash-sized displacement cannot cross walls; corner/stair-like decoration does not trap the player.
- **Evidence:** Collision fixtures for thin walls and corners.

#### CK-02-04 — Implement mouse look and pointer capture

- **Depends on:** `CK-00-06`, `CK-00-02`
- **Owns:** `src/app/pointer-capture.ts`; `src/player/look.ts`; matching tests and `progress/CK-02-04.md`.
- **Build:** Add gesture capture, unbounded yaw, pitch clamp, sensitivity/invert handling and lock-loss cancellation.
- **Accept:** Full turns do not clamp yaw; pitch stays bounded; denial/blur/Escape clear actions; resume requires gesture.
- **Evidence:** Unit look tests and browser capture sequence.

#### CK-02-05 — Connect player controller and camera

- **Depends on:** `CK-02-03`, `CK-02-04`, `CK-01-08`
- **Owns:** `src/app/player-session.ts`; `src/main.ts`; `tests/e2e/movement.spec.ts`; matching tests and `progress/CK-02-05.md`.
- **Build:** Sample commands per fixed tick, move against generated grid, and interpolate camera pose.
- **Accept:** WASD changes actual pose; mouse input changes view; walk across rooms without clipping; inactive screens stop movement.
- **Evidence:** Browser movement and before/after camera screenshots.

#### CK-02-06 — Add sprint and delayed resource regeneration

- **Depends on:** `CK-02-05`
- **Owns:** `src/player/sprint.ts`; `src/player/resources.ts`; matching tests and `progress/CK-02-06.md`.
- **Build:** Spend stamina only while valid sprint movement occurs; implement stamina/mana delay and regeneration.
- **Accept:** Stationary Shift costs nothing; exhaustion returns to walking; regen delay/ceilings match defaults.
- **Evidence:** Unit timing and browser meter-ready snapshots.

#### CK-02-07 — Add collision-safe dash

- **Depends on:** `CK-02-06`
- **Owns:** `src/player/dash.ts`; `src/player/movement.ts`; matching tests and `progress/CK-02-07.md`.
- **Build:** Implement directional dash distance, stamina/cooldown and brief evasion flag; disallow canceled-screen activation.
- **Accept:** Cost paid once; wall ends movement; no infinite repeat from hold; evasion window is shorter than dash.
- **Evidence:** Unit dash transitions and collision fixture.

#### CK-02-08 — Implement pause and focus-loss session behavior

- **Depends on:** `CK-02-05`, `CK-02-07`
- **Owns:** `src/app/pause.ts`; `src/ui/pause-minimal.ts`; `tests/e2e/pause.spec.ts`; matching tests and `progress/CK-02-08.md`.
- **Build:** Pause clock, release pointer capture, clear inputs, and resume without integrating hidden wall time.
- **Accept:** Pause freezes pose/resources; blur/hidden/lock loss pause safely; Resume restores gesture capture without a pending attack.
- **Evidence:** Browser pause/resume and pressed-key blur cases.

### M03 — Sword combat and visible feedback

**Milestone acceptance:** Normal and charged sword attacks hit valid targets once, respect walls/resources, and show a complete visible attack/recovery loop.

#### CK-03-01 — Implement damage resolution and death deduplication

- **Depends on:** `CK-02-01`, `CK-00-07`
- **Owns:** `src/combat/damage.ts`; `src/combat/types.ts`; matching tests and `progress/CK-03-01.md`.
- **Build:** Resolve initial physical damage, HP bounds, attack IDs, friendly filtering and once-only death events.
- **Accept:** Repeated packet cannot double-kill; zero/invalid damage rejected; dead targets do not receive another reward event.
- **Evidence:** Unit packet/death tests.

#### CK-03-02 — Implement melee arc and line-of-sight queries

- **Depends on:** `CK-03-01`, `CK-01-01`
- **Owns:** `src/combat/queries.ts`; matching tests and `progress/CK-03-02.md`.
- **Build:** Query range, horizontal arc and wall obstruction against simple target colliders, independent of meshes.
- **Accept:** Wall blocks hit; targets outside arc/range miss; multiple targets receive at most one packet per swing.
- **Evidence:** Geometry/obstruction unit fixtures.

#### CK-03-03 — Define weapon state/attack adapter contract

- **Depends on:** `CK-00-06`, `CK-03-01`
- **Owns:** `src/weapons/types.ts`; `src/combat/weapon-dispatch.ts`; matching tests and `progress/CK-03-03.md`.
- **Build:** Introduce current weapon update/cancel interfaces and typed attack requests; dispatcher starts with sword only.
- **Accept:** Explicit input cancel differs from normal release; rejected attack leaves costs/state consistent.
- **Evidence:** Contract tests, no future class stubs.

#### CK-03-04 — Implement sword tap attack timing

- **Depends on:** `CK-03-03`
- **Owns:** `src/weapons/sword.ts`; matching tests and `progress/CK-03-04.md`.
- **Build:** Handle press anticipation, early release light slash, active interval and recovery; stamina commit at attack start.
- **Accept:** Tap produces one swing at release; held input does not auto-fire; recovery blocks another swing.
- **Evidence:** Unit sword tap/cancel sequences.

#### CK-03-05 — Implement sword charge and interruption

- **Depends on:** `CK-03-04`
- **Owns:** `src/weapons/sword.ts`; matching tests and `progress/CK-03-05.md`.
- **Build:** Add threshold/full-charge curve, release heavy attack and insufficient-stamina behavior without duplicating tap damage.
- **Accept:** Below/at/above threshold are distinct; pause/weapon cancellation spends no uncommitted cost; full charge caps power.
- **Evidence:** Unit charge boundary/state cases.

#### CK-03-06 — Create sword viewmodel and attack animation

- **Depends on:** `CK-03-05`, `CK-00-03`
- **Owns:** `src/render/weapons/sword.ts`; `src/render/viewmodel.ts`; matching tests and `progress/CK-03-06.md`.
- **Build:** Create original pixel-textured sword with state-driven anticipation, slash, charge indication and recovery.
- **Accept:** Animation aligns to simulation hit window; low-res output preserves silhouette; cancel returns cleanly.
- **Evidence:** Inspected tap and charge screenshots/short capture.

#### CK-03-07 — Add complete training-target diagnostic fixture

- **Depends on:** `CK-03-02`, `CK-01-08`
- **Owns:** `src/debug/fixtures/combat-room.ts`; `src/render/training-target.ts`; matching tests and `progress/CK-03-07.md`.
- **Build:** Build a functioning dev/test-only target room with HP/death behavior and optional obstruction wall.
- **Accept:** Targets expose real damage/death; fixture never appears in normal production campaign.
- **Evidence:** Unit fixture records and browser setup evidence.

#### CK-03-08 — Add resource HUD, reticle and damage feedback

- **Depends on:** `CK-02-01`, `CK-03-01`
- **Owns:** `src/ui/hud.ts`; `src/ui/hud.css`; `src/render/feedback.ts`; matching tests and `progress/CK-03-08.md`.
- **Build:** Render HP/stamina/mana, sword charge, hit marker and bounded hurt feedback from events.
- **Accept:** HUD tracks actual state; low HP and disabled flash setting are representable; no event listener accumulation.
- **Evidence:** Browser HUD assertions and inspected combat screenshot.

#### CK-03-09 — Integrate sword combat through actual input

- **Depends on:** `CK-03-06`, `CK-03-07`, `CK-03-08`, `CK-02-08`
- **Owns:** `src/app/combat-session.ts`; `src/main.ts`; `tests/e2e/sword.spec.ts`; matching tests and `progress/CK-03-09.md`.
- **Build:** Wire sword requests to target queries, resource/damage events and viewmodel in the real controller.
- **Accept:** Trusted tap and hold/release damage differently; blocked swing misses; pause during charge does not hit on resume.
- **Evidence:** Browser sword tests plus reviewed feedback evidence.

### M04 — Generated melee enemies and navigation

**Milestone acceptance:** Procedural melee enemies perceive, approach, telegraph, attack, recover and die in generated rooms without wall attacks or duplication.

#### CK-04-01 — Define enemy blueprints and runtime records

- **Depends on:** `CK-03-01`, `CK-00-05`
- **Owns:** `src/enemies/types.ts`; `src/enemies/blueprints.ts`; matching tests and `progress/CK-04-01.md`.
- **Build:** Create initially used stalker/brute blueprint fields, bounded stats, rig recipe and stable runtime IDs.
- **Accept:** Same source seed yields same blueprint; invalid stats/rig parts fail validation; IDs remain stable.
- **Evidence:** Unit blueprint schema cases.

#### CK-04-02 — Implement radius-aware A* paths

- **Depends on:** `CK-01-05`
- **Owns:** `src/enemies/navigation.ts`; matching tests and `progress/CK-04-02.md`.
- **Build:** Find usable grid paths with clearance, deterministic ties and bounded search; expose unreachable result.
- **Accept:** Paths avoid walls and too-small gaps; enclosed target terminates; graph/actual occupancy agree.
- **Evidence:** Unit path fixtures.

#### CK-04-03 — Implement perception and attack opportunity

- **Depends on:** `CK-04-01`, `CK-03-02`
- **Owns:** `src/enemies/senses.ts`; matching tests and `progress/CK-04-03.md`.
- **Build:** Query player detection, LOS, distance, frontal bearing and melee eligibility without renderer references.
- **Accept:** Walls prevent detection attacks; memory timeout is bounded; corner detection does not grant wall hits.
- **Evidence:** Unit sensing fixtures.

#### CK-04-04 — Implement stalker tell/attack/recovery machine

- **Depends on:** `CK-04-03`
- **Owns:** `src/enemies/ai/stalker.ts`; matching tests and `progress/CK-04-04.md`.
- **Build:** Create pursuit opportunity, fixed readable melee tell, committed attack, recovery, stagger and dead transitions.
- **Accept:** No damage before tell; interruption cancels uncommitted attack; once-only packet; minimum tell maintained.
- **Evidence:** Unit state/timing sequences.

#### CK-04-05 — Implement brute heavy melee machine

- **Depends on:** `CK-04-04`
- **Owns:** `src/enemies/ai/brute.ts`; matching tests and `progress/CK-04-05.md`.
- **Build:** Add slower, wider heavy attack with longer tell and bounded stagger; preserve explicit recovery.
- **Accept:** Brute differs mechanically from stalker; player can leave active arc during tell; death stops attack.
- **Evidence:** Unit behavior contrast and interruption cases.

#### CK-04-06 — Implement steering and enemy collision

- **Depends on:** `CK-04-02`, `CK-04-04`, `CK-02-03`
- **Owns:** `src/enemies/steering.ts`; matching tests and `progress/CK-04-06.md`.
- **Build:** Follow paths with separation, collision and replan cooldown; avoid permanent doorway pileups.
- **Accept:** Enemies cannot cross walls; pair separation is bounded; blocked path eventually replans without per-tick full searches.
- **Evidence:** Unit multi-enemy corridor simulation.

#### CK-04-07 — Generate original melee creature rigs

- **Depends on:** `CK-04-01`, `CK-01-06`
- **Owns:** `src/render/enemies/melee-rigs.ts`; matching tests and `progress/CK-04-07.md`.
- **Build:** Create three readable initial silhouettes with compatible seeded parts and state-driven tell/death pose hooks.
- **Accept:** Recipes match collision scale; tell direction is visible; models are distinct beyond palette.
- **Evidence:** Rig contact sheet and deterministic recipe checks.

#### CK-04-08 — Integrate enemy updates and combat rendering

- **Depends on:** `CK-04-05`, `CK-04-06`, `CK-04-07`, `CK-03-09`
- **Owns:** `src/app/enemy-session.ts`; `src/render/enemies/index.ts`; matching tests and `progress/CK-04-08.md`.
- **Build:** Connect runtime records, steering/AI, damage pipeline, player harm and render interpolation.
- **Accept:** Generated enemy approaches and attacks; sword kills stop AI; dead actors are removed once; no listener leaks.
- **Evidence:** Browser melee duel and wall-obstruction fixture.

#### CK-04-09 — Populate reproducible initial floor encounters

- **Depends on:** `CK-04-08`, `CK-01-05`
- **Owns:** `src/dungeon/encounters-basic.ts`; `src/app/floor-session.ts`; `tests/e2e/enemies.spec.ts`; matching tests and `progress/CK-04-09.md`.
- **Build:** Assign small seed-dependent stalker/brute groups outside safe entry and reserved path markers.
- **Accept:** Repeated seed matches placements/recipes; entry is non-hostile; multiple generated rooms are playable.
- **Evidence:** Floor encounter tests and inspected room evidence.

### M05 — Boss gate and three-floor playable slice

**Milestone acceptance:** A player can fight a generated boss, unlock and use a descent, die/retry safely, and complete a three-floor slice; 100-floor boundary logic is already correct.

#### CK-05-01 — Implement campaign progression reducer

- **Depends on:** `CK-00-05`, `CK-03-01`
- **Owns:** `src/app/campaign.ts`; matching tests and `progress/CK-05-01.md`.
- **Build:** Model new/playing/dead/transitioning/victorious states and floor 1–100; boss defeat and descent are separate commands.
- **Accept:** Locked descent rejects; floor 99 advances to 100; floor-100 boss defeat yields victory and never floor 101.
- **Evidence:** Unit progression/boundary cases.

#### CK-05-02 — Implement arena entrance and gate collision

- **Depends on:** `CK-01-04`, `CK-02-03`
- **Owns:** `src/bosses/arena.ts`; `src/render/gates.ts`; matching tests and `progress/CK-05-02.md`.
- **Build:** Add voluntary arena entry trigger, combat barrier, boss/exit positions and gate render driven by state.
- **Accept:** Barrier prevents escape after entry; defeat reopens routes; boss and reward pads have clearance.
- **Evidence:** Arena collision tests and gate screenshot.

#### CK-05-03 — Generate initial Cairn Warden boss blueprint

- **Depends on:** `CK-04-01`, `CK-05-02`
- **Owns:** `src/bosses/blueprints-basic.ts`; matching tests and `progress/CK-05-03.md`.
- **Build:** Create seeded boss name/rig/stats and two compatible heavy moves with initial depth parameters.
- **Accept:** Same seed matches; blueprint fits arena; boss is tougher than its baseline regular brute.
- **Evidence:** Unit blueprint/stat/clearance cases.

#### CK-05-04 — Implement initial boss two-move controller

- **Depends on:** `CK-05-03`, `CK-04-05`
- **Owns:** `src/bosses/controller-basic.ts`; matching tests and `progress/CK-05-04.md`.
- **Build:** Alternate a telegraphed frontal sweep and marked ground slam with a 50% HP phase change.
- **Accept:** Tells precede damage; phase change cannot immediate-hit; safe movement can avoid each move.
- **Evidence:** Unit boss timelines and safe-position cases.

#### CK-05-05 — Integrate arena/boss combat and boss HUD

- **Depends on:** `CK-05-04`, `CK-04-09`, `CK-03-08`
- **Owns:** `src/app/boss-session.ts`; `src/render/bosses/basic.ts`; `src/ui/boss-hud.ts`; matching tests and `progress/CK-05-05.md`.
- **Build:** Spawn exactly one boss, run encounter, display its name/health/phase, and emit defeat once.
- **Accept:** Boss is reachable and fightable; duplicate death event cannot reopen/reward twice; HUD disappears appropriately.
- **Evidence:** Browser boss fixture and inspected tell/phase evidence.

#### CK-05-06 — Implement reachable descent interaction

- **Depends on:** `CK-05-01`, `CK-05-05`
- **Owns:** `src/exploration/descent.ts`; `src/ui/interact-prompt.ts`; matching tests and `progress/CK-05-06.md`.
- **Build:** E interacts only with reachable exit after boss death; show guard/ready prompts.
- **Accept:** Before defeat E fails visibly; wall/distance prevents remote use; double press queues one transition.
- **Evidence:** Interaction unit cases and browser gate test.

#### CK-05-07 — Integrate floor unload and descent loading

- **Depends on:** `CK-05-06`, `CK-01-08`
- **Owns:** `src/app/descent-session.ts`; `src/app/floor-session.ts`; matching tests and `progress/CK-05-07.md`.
- **Build:** Dispose old actors/render resources, load next plan, spawn player at entry and preserve equipment/resources.
- **Accept:** No old AI/projectiles persist; one level per command; pending input cleared through loading.
- **Evidence:** Browser two-floor transition and resource snapshots.

#### CK-05-08 — Implement in-memory floor checkpoint and death retry

- **Depends on:** `CK-05-07`, `CK-02-08`
- **Owns:** `src/app/checkpoint.ts`; `src/ui/death.ts`; matching tests and `progress/CK-05-08.md`.
- **Build:** Capture immutable entry state; death pauses and offers retry restoring entry runtime, gains and resources.
- **Accept:** Retry keeps seed/layout; current-floor gains disappear; repeated death/retry does not duplicate entities.
- **Evidence:** Unit snapshot independence and browser retry.

#### CK-05-09 — Present terminal victory and simultaneous-death result

- **Depends on:** `CK-05-01`, `CK-05-05`
- **Owns:** `src/ui/victory.ts`; `src/app/boss-session.ts`; matching tests and `progress/CK-05-09.md`.
- **Build:** Commit final boss victory before player death handling, show summary and omit descent on floor 100.
- **Accept:** Final boss/player same tick produces victory; repeated event cannot count another kill; new campaign requires action.
- **Evidence:** Boundary unit test and victory screenshot.

#### CK-05-10 — Verify the three-floor playable vertical slice

- **Depends on:** `CK-05-08`, `CK-05-09`, `CK-05-07`
- **Owns:** `tests/e2e/vertical-slice.spec.ts`; `docs/evidence/CK-05-10/`; matching tests and `progress/CK-05-10.md`.
- **Build:** Use three reproducible generated floors to verify exploration, sword enemies, boss unlock, descent and retry.
- **Accept:** Real browser input reaches the loop; report any diagnostic accelerated setup separately from legitimate play.
- **Evidence:** Reviewed slice screenshots and bounded manual play record.

### M06 — All 100 floor profiles and dungeon variety

**Milestone acceptance:** Every campaign depth has valid region/difficulty data and multiple layout grammars; themed floors remain reachable and resource-safe.

#### CK-06-01 — Define ten regions and 100 depth profiles

- **Depends on:** `CK-01-05`, `CK-05-01`
- **Owns:** `src/dungeon/regions.ts`; `src/dungeon/difficulty.ts`; matching tests and `progress/CK-06-01.md`.
- **Build:** Implement region ranges, HP/damage/power curves, caps, room budgets and roster unlock metadata.
- **Accept:** All 1–100 resolve exactly once; invalid depths reject; comparable stats and budgets rise monotonically.
- **Evidence:** Unit complete-depth sweep.

#### CK-06-02 — Implement looped and split-wing layouts

- **Depends on:** `CK-01-05`, `CK-06-01`
- **Owns:** `src/dungeon/layouts/galleries.ts`; `src/dungeon/layouts/split-wing.ts`; matching tests and `progress/CK-06-02.md`.
- **Build:** Add two graph/room placement grammars with loops or paired wings, using shared carving/validation.
- **Accept:** Layouts differ in graph shape; critical path remains connected across seed samples.
- **Evidence:** Unit seed maps and two floor screenshots.

#### CK-06-03 — Implement courtyard and irregular-cavern layouts

- **Depends on:** `CK-06-02`
- **Owns:** `src/dungeon/layouts/courtyard.ts`; `src/dungeon/layouts/cavern.ts`; matching tests and `progress/CK-06-03.md`.
- **Build:** Add spokes/open court and irregular carved rooms without changing planar physics.
- **Accept:** Cavern collider clearance matches visuals; courtyard gives alternate routes; every output passes validation.
- **Evidence:** Unit shape/reachability corpus and screenshots.

#### CK-06-04 — Apply region materials, fog and lighting

- **Depends on:** `CK-06-01`, `CK-01-06`
- **Owns:** `src/render/textures/regions.ts`; `src/render/region-style.ts`; matching tests and `progress/CK-06-04.md`.
- **Build:** Create palette/material recipes for all ten regions; keep critical silhouettes/tells readable.
- **Accept:** Each region resolves valid textures; dark palettes remain playable; switching regions disposes stale materials.
- **Evidence:** Ten-region contact sheet and recipe tests.

#### CK-06-05 — Place non-blocking room props

- **Depends on:** `CK-06-03`, `CK-01-04`
- **Owns:** `src/dungeon/props.ts`; `src/render/props.ts`; matching tests and `progress/CK-06-05.md`.
- **Build:** Place niches, pillars and rubble with either honest colliders or explicit decorative non-solid placement.
- **Accept:** Solid props preserve required paths and arena lanes; renderer/grid occupancy agree; no spawn intersects props.
- **Evidence:** Collision/reachability tests and dressed-room evidence.

#### CK-06-06 — Implement constrained depth encounter budgets

- **Depends on:** `CK-06-01`, `CK-04-09`
- **Owns:** `src/dungeon/encounter-budget.ts`; matching tests and `progress/CK-06-06.md`.
- **Build:** Spend threat budget on available stalker/brute candidates initially; expose legal roster registry extension.
- **Accept:** Encounter count/cost obey caps; later comparable profiles increase threat; safe entry and boss space stay empty.
- **Evidence:** Unit budget corpus with unavailable-roster fallback.

#### CK-06-07 — Integrate region/layout/depth selection

- **Depends on:** `CK-06-04`, `CK-06-05`, `CK-06-06`, `CK-05-07`
- **Owns:** `src/dungeon/generate.ts`; `src/app/floor-session.ts`; matching tests and `progress/CK-06-07.md`.
- **Build:** Choose seeded grammar/region, apply placements and current compatible roster; keep one floor loaded.
- **Accept:** Depths 1/10/11/50/99/100 render correct region; same seed reproduces content; fallback is themed and playable.
- **Evidence:** Browser representative-depth fixtures.

#### CK-06-08 — Sweep reachability and generation termination

- **Depends on:** `CK-06-07`
- **Owns:** `src/dungeon/generate.test.ts`; `tools/generation-report.mjs`; matching tests and `progress/CK-06-08.md`.
- **Build:** Run at least 16 seeds ×100 floors, including forced retries and clearance for largest early boss.
- **Accept:** No invalid exit, overlapping spawn, unbounded retry or out-of-range floor; report fallback frequency.
- **Evidence:** Reproducible generation report.

#### CK-06-09 — Show floor/region and loading progress

- **Depends on:** `CK-06-07`, `CK-03-08`
- **Owns:** `src/ui/floor-label.ts`; `src/ui/loading.ts`; matching tests and `progress/CK-06-09.md`.
- **Build:** Show actual depth/region and loading stages/errors, with no premature ready interaction.
- **Accept:** Label changes after accepted descent only; loading cancels input; error state offers retry instead of blank screen.
- **Evidence:** Browser transition assertions and loading screenshot.

### M07 — Full procedural enemy roster and elites

**Milestone acceptance:** Eight distinct AI archetypes, constrained visual recipes and legal elites populate region-appropriate encounters with readable tells.

#### CK-07-01 — Define constrained archetype/rig/trait catalog

- **Depends on:** `CK-04-01`, `CK-06-01`
- **Owns:** `src/enemies/catalog.ts`; `src/enemies/constraints.ts`; matching tests and `progress/CK-07-01.md`.
- **Build:** Declare eight archetypes, six rig families, part sockets, unlocks, threat costs and legal compatibility tags.
- **Accept:** Invalid parts/abilities reject; summon recursion and no-tell combinations impossible; fixed catalog IDs remain stable.
- **Evidence:** Catalog/compatibility unit tests.

#### CK-07-02 — Implement archer spacing and fire behavior

- **Depends on:** `CK-07-01`, `CK-04-06`, `CK-09-02`
- **Owns:** `src/enemies/ai/archer.ts`; matching tests and `progress/CK-07-02.md`.
- **Build:** Maintain range, move to valid firing lanes, telegraph and fire swept projectiles through shared combat requests.
- **Accept:** Walls block fire; player closing distance forces reposition; ammo-independent enemy fire has bounded cooldown.
- **Evidence:** Unit ranged AI and projectile obstruction cases.

#### CK-07-03 — Implement hexer marked elemental areas

- **Depends on:** `CK-07-01`, `CK-10-01`, `CK-03-01`
- **Owns:** `src/enemies/ai/hexer.ts`; `src/combat/marked-area.ts`; matching tests and `progress/CK-07-03.md`.
- **Build:** Mark a legal ground region, wait a readable tell, then apply bounded elemental packet/status.
- **Accept:** Moving out before trigger avoids hit; marker lifetime ends; repeated area cannot permanently deny movement.
- **Evidence:** Unit marked-area timelines and safe-cell checks.

#### CK-07-04 — Implement skirmisher flank and dash

- **Depends on:** `CK-07-01`, `CK-04-06`
- **Owns:** `src/enemies/ai/skirmisher.ts`; matching tests and `progress/CK-07-04.md`.
- **Build:** Choose legal lateral approach cells then collision-safe short dash with tell/recovery.
- **Accept:** No wall relocation; cooldown prevents chain-dash lock; behavior differs from pursuit-only stalker.
- **Evidence:** Unit flank/dash path cases.

#### CK-07-05 — Implement bulwark posture and directional guard

- **Depends on:** `CK-07-01`, `CK-03-01`
- **Owns:** `src/enemies/ai/bulwark.ts`; `src/combat/posture.ts`; matching tests and `progress/CK-07-05.md`.
- **Build:** Reduce frontal hits with posture pool, rear vulnerability and explicit stagger-break window.
- **Accept:** Heavy posture packets can break guard; rear hit bypasses directional reduction; posture recovers only by rule.
- **Evidence:** Unit angle/posture/break tests.

#### CK-07-06 — Implement finite summoner waves

- **Depends on:** `CK-07-01`, `CK-04-06`
- **Owns:** `src/enemies/ai/summoner.ts`; `src/enemies/summons.ts`; matching tests and `progress/CK-07-06.md`.
- **Build:** Telegraph legal spawn points, request bounded non-summoning melee minions, and track summon ownership.
- **Accept:** Caps respected; summons cannot recursively summon or farm rewards; parent death follows documented cleanup.
- **Evidence:** Unit wave/cap/ownership cases.

#### CK-07-07 — Implement marked burrower relocation

- **Depends on:** `CK-07-01`, `CK-04-06`
- **Owns:** `src/enemies/ai/burrower.ts`; matching tests and `progress/CK-07-07.md`.
- **Build:** Select reachable clear emergence cell, show warning, relocate with bounded untargetable window, then recover.
- **Accept:** No emergence in walls/player collider; tell precedes harm; interrupted/dead burrower cannot reappear.
- **Evidence:** Unit relocation/timing cases.

#### CK-07-08 — Generate elite/stat/element variations

- **Depends on:** `CK-07-01`, `CK-06-06`, `CK-10-01`
- **Owns:** `src/enemies/generate.ts`; matching tests and `progress/CK-07-08.md`.
- **Build:** Roll compatible archetype/visual/element/stats and at most two elite traits from isolated source streams.
- **Accept:** A large roll corpus is finite, legal and varied; cosmetic changes do not alter stats; elite threat cost charged.
- **Evidence:** Blueprint corpus and representative generated list.

#### CK-07-09 — Expand creature rigs with ground silhouettes

- **Depends on:** `CK-07-01`, `CK-04-07`
- **Owns:** `src/render/enemies/ground-rigs.ts`; matching tests and `progress/CK-07-09.md`.
- **Build:** Add three distinguishable silhouettes each for husk, plated and crawler families, with valid part sockets.
- **Accept:** Nine recipes are visibly distinguishable; scale/tells align with collision; no detached invalid parts.
- **Evidence:** Inspected ground-rig contact sheet.

#### CK-07-10 — Expand creature rigs with caster/spectral silhouettes

- **Depends on:** `CK-07-09`
- **Owns:** `src/render/enemies/arcane-rigs.ts`; matching tests and `progress/CK-07-10.md`.
- **Build:** Add three silhouettes each for robed, fused construct and spectral families; spectral visuals still obey ground navigation.
- **Accept:** Nine additional recipes differ structurally; translucency does not hide attacks; no flying-physics implication.
- **Evidence:** Inspected arcane-rig contact sheet.

#### CK-07-11 — Integrate full roster and elite tell rendering

- **Depends on:** `CK-07-02`, `CK-07-03`, `CK-07-04`, `CK-07-05`, `CK-07-06`, `CK-07-07`, `CK-07-08`, `CK-07-10`, `CK-04-08`, `CK-09-07`
- **Owns:** `src/app/enemy-session.ts`; `src/render/enemies/index.ts`; `src/render/enemies/tells.ts`; matching tests and `progress/CK-07-11.md`.
- **Build:** Register implemented AI/rigs and elemental/elite markers; connect summon/projectile/area requests to runtime.
- **Accept:** Each archetype fights correctly in a real fixture; despawn/cancel cleans owned effects; no unavailable registry entries.
- **Evidence:** Browser archetype fixture gallery.

#### CK-07-12 — Integrate region roster and encounter safety

- **Depends on:** `CK-07-11`, `CK-06-08`
- **Owns:** `src/dungeon/encounter-budget.ts`; `tests/e2e/enemy-roster.spec.ts`; matching tests and `progress/CK-07-12.md`.
- **Build:** Use unlocked archetypes in actual floors and validate ranged lanes, summon clearance and threat composition.
- **Accept:** Early floors do not spawn forbidden elite abilities; later mixes stay capped/reachable; no permanent doorway jam.
- **Evidence:** Roster/depth sweep and late-floor combat evidence.

### M08 — Procedural loot and usable inventory

**Milestone acceptance:** Reproducible items, legal affixes, once-only rewards, pickups and comparison screens provide real equipment choices.

#### CK-08-01 — Define item instances and class/base schemas

- **Depends on:** `CK-00-05`, `CK-03-03`
- **Owns:** `src/loot/types.ts`; `src/loot/validate.ts`; matching tests and `progress/CK-08-01.md`.
- **Build:** Create stable UID/base/class/depth/rarity/stats/affix/visual records with bounded numeric validation. Include persistent bound-starter flag.
- **Accept:** Malformed/unknown records reject; item identities survive copies; no renderer/storage objects in item data.
- **Evidence:** Unit schema/range cases.

#### CK-08-02 — Author thirty mechanically distinct weapon bases

- **Depends on:** `CK-08-01`
- **Owns:** `src/loot/bases/weapons.ts`; matching tests and `progress/CK-08-02.md`.
- **Build:** Define six bases per class with at least two real timing/range/resource differences; stable content IDs.
- **Accept:** All five classes have six legal bases; duplicate behavior tuples are rejected; useful starter sword and bow exist.
- **Evidence:** Base catalog validation and balance table.

#### CK-08-03 — Implement rarity and depth stat rolls

- **Depends on:** `CK-08-02`, `CK-06-01`
- **Owns:** `src/loot/roll.ts`; `src/loot/rarity.ts`; matching tests and `progress/CK-08-03.md`.
- **Build:** Roll rarity/values from source streams using depth power and normalized weighted source overrides.
- **Accept:** Same source reproduces item; all rolls finite/bounded; rarity and depth change distributions meaningfully.
- **Evidence:** Seeded roll corpus with reported distributions.

#### CK-08-04 — Define affix compatibility and selection

- **Depends on:** `CK-08-03`
- **Owns:** `src/loot/affixes.ts`; `src/loot/affix-roll.ts`; matching tests and `progress/CK-08-04.md`.
- **Build:** Add at least 24 regular affixes and five class signatures; choose compatible/exclusive combinations with bounded fallback.
- **Accept:** No bow-only stat on other classes; all rarities obey counts; unavailable combinations terminate validly.
- **Evidence:** Affix corpus and ID/handler mapping contract.

#### CK-08-05 — Implement backpack/stack atomic transfers

- **Depends on:** `CK-08-01`
- **Owns:** `src/inventory/backpack.ts`; `src/inventory/transactions.ts`; matching tests and `progress/CK-08-05.md`.
- **Build:** Implement 24 slots, tonic/arrow stacks, add/remove/transfer and explicit full-inventory failures.
- **Accept:** No partial loss on failed transfer; stack caps respected; duplicate transaction ID has no repeated effect.
- **Evidence:** Unit transaction/full-backpack cases.

#### CK-08-06 — Implement equipment slots and quick-switch model

- **Depends on:** `CK-08-05`, `CK-03-03`
- **Owns:** `src/inventory/equipment.ts`; matching tests and `progress/CK-08-06.md`.
- **Build:** Manage two weapon slots, armor/charm positions, UID validation and cancel-before-switch request.
- **Accept:** Cannot equip missing item; switch cancels charge without firing; duplicated UID cannot occupy conflicting slots. Displaced gear needs space or explicit swap; bound starter cannot be lost.
- **Evidence:** Unit equip/cancel cases; class adapters registered later.

#### CK-08-07 — Implement source drops and once-only boss rewards

- **Depends on:** `CK-08-04`, `CK-05-05`
- **Owns:** `src/loot/drops.ts`; `src/loot/rewards.ts`; matching tests and `progress/CK-08-07.md`.
- **Build:** Resolve seeded enemy/chest/boss loot with source ledger; boss guarantees Rare-or-better class-usable choice.
- **Accept:** Repeated death/open/reward events cannot duplicate; selected usable class respects current implemented catalog.
- **Evidence:** Unit source/reward ledger cases.

#### CK-08-08 — Implement chests and reachable pickups

- **Depends on:** `CK-08-07`, `CK-08-05`, `CK-05-06`
- **Owns:** `src/exploration/chests.ts`; `src/exploration/pickups.ts`; `src/render/pickups.ts`; matching tests and `progress/CK-08-08.md`.
- **Build:** Open chest via E, reveal generated contents, transfer once, and preserve refused/full-pack items.
- **Accept:** Distance/walls block remote pickup; two inputs do not duplicate; capped ground drops preserve valuable boss rewards.
- **Evidence:** Unit interactions and browser chest/pickup fixture.

#### CK-08-09 — Implement inventory list and equip UI

- **Depends on:** `CK-08-06`, `CK-08-08`, `CK-02-08`
- **Owns:** `src/ui/inventory.ts`; `src/ui/inventory.css`; matching tests and `progress/CK-08-09.md`.
- **Build:** Show slots, rarity text/icons, stats, equipped state, keyboard navigation and safe paused equip actions.
- **Accept:** Selection/equip uses actual transactions; close clears input; full inventory offers explicit retention/drop choice.
- **Evidence:** Browser UI tests and inventory screenshot.

#### CK-08-10 — Implement item comparison and sorting

- **Depends on:** `CK-08-09`
- **Owns:** `src/ui/item-compare.ts`; `src/loot/item-summary.ts`; matching tests and `progress/CK-08-10.md`.
- **Build:** Show class-relevant stats/affixes, approximate power/DPS caveats and deterministic sort/filter.
- **Accept:** Damage/timing/resource deltas match real rolls; sorting preserves identity; equal scores tie stably.
- **Evidence:** Summary unit tests and comparison screenshot.

#### CK-08-11 — Integrate loot economy into combat floors

- **Depends on:** `CK-08-10`, `CK-11-19`, `CK-04-09`, `CK-08-13`
- **Owns:** `src/app/loot-session.ts`; `src/app/combat-session.ts`; `tests/e2e/loot.spec.ts`; matching tests and `progress/CK-08-11.md`.
- **Build:** Wire deaths/chests/pickups/equipment, actual affix handlers and all implemented class adapters.
- **Accept:** Pickup/equip changes actual combat behavior; death reward remains once-only; all rolled classes can be used.
- **Evidence:** Browser loot-to-combat sequence.

#### CK-08-12 — Validate procedural item variety and fairness

- **Depends on:** `CK-08-11`, `CK-14-02`
- **Owns:** `src/loot/roll.test.ts`; `tools/loot-report.mjs`; matching tests and `progress/CK-08-12.md`.
- **Build:** Generate reproducible large sample across depth/classes/sources; check legality, coverage and outliers.
- **Accept:** At least 10,000 rolls cover all bases/rarities/affixes; representative item power rises with depth; no zero-cost loops.
- **Evidence:** Loot report with legal combinations and observed frequencies.

#### CK-08-13 — Place deterministic treasure and resource guarantees

- **Depends on:** `CK-08-08`, `CK-06-07`
- **Owns:** `src/dungeon/treasure.ts`; matching tests and `progress/CK-08-13.md`.
- **Build:** Place chest/resource-source records on valid room pads with non-secret tonic guarantee and capped reward-cache policy.
- **Accept:** All floors have at least one reachable tonic source; treasure never blocks boss path; duplicate source IDs reject.
- **Evidence:** Seed/depth treasure placement corpus.

### M09 — Physical bow projectiles and aiming

**Milestone acceptance:** Left hold/release draws/fires actual arrows; right hold aims; pause/switch cancellation cannot generate a shot.

#### CK-09-01 — Implement swept projectile motion

- **Depends on:** `CK-03-02`, `CK-00-04`
- **Owns:** `src/combat/projectiles.ts`; matching tests and `progress/CK-09-01.md`.
- **Build:** Integrate velocity/gravity/lifetime and swept segment collisions against grid and target colliders.
- **Accept:** Fast arrow cannot tunnel; nearest collision wins; expiry/removal occurs once; projectile cap handled explicitly.
- **Evidence:** Unit thin-wall/moving-target/lifetime cases.

#### CK-09-02 — Implement projectile impact/team routing

- **Depends on:** `CK-09-01`, `CK-03-01`
- **Owns:** `src/combat/projectile-impact.ts`; matching tests and `progress/CK-09-02.md`.
- **Build:** Create one damage packet per committed impact, friendly filtering and recoverable world-arrow ID.
- **Accept:** Wrong-team targets ignored; obstruction stops arrow; impact/death/remove cannot create two damages.
- **Evidence:** Unit impact/obstruction/ID cases.

#### CK-09-03 — Implement bow draw and release state machine

- **Depends on:** `CK-03-03`, `CK-08-02`
- **Owns:** `src/weapons/bow.ts`; matching tests and `progress/CK-09-03.md`.
- **Build:** Handle minimum draw, full draw, variable speed/damage, recovery and arrow cost at accepted left-release.
- **Accept:** Press never fires; short draw aborts; empty arrows fail clearly; canceled draw never emits release shot.
- **Evidence:** Unit draw/charge/cancel boundaries.

#### CK-09-04 — Implement ADS and class movement modifiers

- **Depends on:** `CK-09-03`, `CK-02-05`
- **Owns:** `src/weapons/aim.ts`; `src/player/action-speed.ts`; matching tests and `progress/CK-09-04.md`.
- **Build:** Track right-held ADS with draw-compatible state, movement slowdown and class-scoped aim sensitivity.
- **Accept:** ADS without draw works; left release while ADS fires; switch/blur resets modifiers; sprint cannot bypass ADS slowdown.
- **Evidence:** Unit modifier/ADS sequences.

#### CK-09-05 — Render bow draw and interpolated ADS camera

- **Depends on:** `CK-09-04`, `CK-03-06`
- **Owns:** `src/render/weapons/bow.ts`; `src/render/aim-camera.ts`; matching tests and `progress/CK-09-05.md`.
- **Build:** Create string/arrow draw animation and smooth FOV/sensitivity camera bridge without mutating simulation.
- **Accept:** Full draw is readable; release clears nocked arrow; cancel restores baseline FOV; resize does not skew sight.
- **Evidence:** Inspected hip-fire/ADS/full-draw screenshots.

#### CK-09-06 — Render arrows and recoverable world impacts

- **Depends on:** `CK-09-02`, `CK-09-05`, `CK-08-08`
- **Owns:** `src/render/projectiles.ts`; `src/exploration/arrow-recovery.ts`; matching tests and `progress/CK-09-06.md`.
- **Build:** Render interpolated in-flight arrows, reachable wall impacts and once-only arrow recovery.
- **Accept:** Arrow follows actual trajectory; player cannot recover through wall or beyond reach; cap does not lose committed impacts.
- **Evidence:** Browser flight/recovery fixture.

#### CK-09-07 — Integrate bow resource/attack/UI flow

- **Depends on:** `CK-09-06`, `CK-09-03`, `CK-08-06`, `CK-03-09`
- **Owns:** `src/app/combat-session.ts`; `src/ui/bow-hud.ts`; matching tests and `progress/CK-09-07.md`.
- **Build:** Register bow with weapon dispatcher, update arrows/draw meter and route impacts through damage.
- **Accept:** Real bow damages targets; arrow count changes once; sword switch cancels draw; empty-ammo HUD explains failure.
- **Evidence:** Bow integration browser smoke.

#### CK-09-08 — Verify actual bow button combinations

- **Depends on:** `CK-09-07`, `CK-02-08`
- **Owns:** `tests/e2e/bow.spec.ts`; matching tests and `progress/CK-09-08.md`.
- **Build:** Exercise actual mouse press/hold/release and right ADS, cancellation, obstruction, ammo, and context-menu handling.
- **Accept:** No shot on press or cancel; released draw shoots; right-click does not open context menu; menu buttons remain functional.
- **Evidence:** Browser input suite with reviewed bow evidence.

### M10 — Statuses, defense, healing and character growth

**Milestone acceptance:** Defense/resource choices matter, harmful effects stay bounded, and XP/perks/healing work without farming or cancellation bugs.

#### CK-10-01 — Implement shared bounded status engine

- **Depends on:** `CK-03-01`, `CK-00-04`
- **Owns:** `src/combat/statuses.ts`; `src/combat/status-registry.ts`; matching tests and `progress/CK-10-01.md`.
- **Build:** Add burn/bleed/chill/shock/weaken with duration, stack/refresh/cooldown and source attribution rules.
- **Accept:** Pause freezes timers; DoT kills once; caps prevent permanent stun/full slow; source damage scaling not reapplied twice.
- **Evidence:** Unit status timelines and stacking cases.

#### CK-10-02 — Implement armor/resistance/critical pipeline

- **Depends on:** `CK-10-01`, `CK-08-01`
- **Owns:** `src/combat/damage.ts`; `src/player/derived-stats.ts`; matching tests and `progress/CK-10-02.md`.
- **Build:** Extend damage with bounded armor/resistance, source modifiers, crits and explicit block/evasion hooks.
- **Accept:** Caps hold with extreme rolls; crit stream restores; one calculation order; minimum/nonfinite handling correct.
- **Evidence:** Unit damage math and cap cases.

#### CK-10-03 — Implement sword guard and timely parry

- **Depends on:** `CK-03-05`, `CK-10-02`, `CK-02-06`
- **Owns:** `src/weapons/sword.ts`; `src/combat/guard.ts`; matching tests and `progress/CK-10-03.md`.
- **Build:** Add frontal right-held guard, stamina cost, 0.15 s parry window and enemy recovery/stagger result.
- **Accept:** Rear/elemental hits follow rules; insufficient stamina breaks guard; canceled guard cannot stay active.
- **Evidence:** Unit angle/window/guard-break cases.

#### CK-10-04 — Implement interrupted healing consumable

- **Depends on:** `CK-08-05`, `CK-10-02`
- **Owns:** `src/player/healing.ts`; matching tests and `progress/CK-10-04.md`.
- **Build:** Use Q with 0.75 s completion, tonic stack spend once, percent healing and cancel-on-damage/screen rules.
- **Accept:** Cancel retains tonic; completed use consumes one; full HP/empty stack explained; holding Q cannot consume all unintentionally.
- **Evidence:** Unit healing completion/cancel cases.

#### CK-10-05 — Implement XP and rank progression

- **Depends on:** `CK-04-08`, `CK-05-05`
- **Owns:** `src/player/progression.ts`; matching tests and `progress/CK-10-05.md`.
- **Build:** Award XP once per eligible kill/boss, rank thresholds and unspent points through cap 50.
- **Accept:** Repeated deaths/summons cannot farm XP; multiple level-ups compute correctly; cap and overflow are defined.
- **Evidence:** Unit XP/award/cap cases.

#### CK-10-06 — Implement perk choices and stat derivation

- **Depends on:** `CK-10-05`, `CK-10-02`
- **Owns:** `src/player/perks.ts`; `src/player/derived-stats.ts`; matching tests and `progress/CK-10-06.md`.
- **Build:** Apply Vitality/Might/Focus, individual caps and deterministic recomputation including equipment modifiers.
- **Accept:** No point spent twice; remove/re-equip does not compound; max-health changes clamp/preserve rules consistently.
- **Evidence:** Unit points/derived-stat tests.

#### CK-10-07 — Integrate defense/status/heal/progression HUD

- **Depends on:** `CK-10-03`, `CK-10-04`, `CK-10-06`, `CK-03-08`
- **Owns:** `src/app/player-session.ts`; `src/ui/status-hud.ts`; `src/ui/perks.ts`; `src/app/combat-session.ts`; matching tests and `progress/CK-10-07.md`.
- **Build:** Wire actual damage/effects, Q healing, XP, perk UI and cancellation into running game.
- **Accept:** Guard/parry affects real enemies; status icons expire; perk choice changes combat; healing tells match commitment.
- **Evidence:** Browser resource/defense/progression scenarios.

#### CK-10-08 — Verify survival and anti-exploit transitions

- **Depends on:** `CK-10-07`
- **Owns:** `tests/e2e/survival.spec.ts`; `src/player/resources.test.ts`; matching tests and `progress/CK-10-08.md`.
- **Build:** Cover regen delays, damage/heal interruption, simultaneous death, status expiry, guard exhaustion and repeated XP events.
- **Accept:** No immortality or negative resources; retry returns checkpoint values; all meters agree with simulation.
- **Evidence:** Survival regression results and reviewed HUD.

### M11 — Axe, daggers, staff and real affix effects

**Milestone acceptance:** All five classes offer distinct playable combat loops, and generated affixes/signatures change actual behavior within caps.

#### CK-11-01 — Implement axe cleave and charged overhead logic

- **Depends on:** `CK-03-03`, `CK-07-05`, `CK-08-02`, `CK-10-02`
- **Owns:** `src/weapons/axe.ts`; matching tests and `progress/CK-11-01.md`.
- **Build:** Add slower light cleave, charge/release overhead, resource/recovery and posture-breaking requests.
- **Accept:** Charge/tap differ; interrupted charge costs nothing; heavy breaks posture but still respects walls.
- **Evidence:** Unit axe timelines and posture cases.

#### CK-11-02 — Create axe viewmodel and event-driven feedback

- **Depends on:** `CK-11-01`, `CK-03-06`
- **Owns:** `src/render/weapons/axe.ts`; matching tests and `progress/CK-11-02.md`.
- **Build:** Render distinct wide cleave/overhead, charge tell and slow recovery based on axe state.
- **Accept:** Impact frame aligns with request; no sword animation reuse masquerading as axe; cancel recovers cleanly.
- **Evidence:** Inspected axe charge and impact evidence.

#### CK-11-03 — Implement dagger alternating combo and backstab

- **Depends on:** `CK-03-03`, `CK-08-02`, `CK-10-02`
- **Owns:** `src/weapons/daggers.ts`; matching tests and `progress/CK-11-03.md`.
- **Build:** Add three-strike alternating combo with reset timeout, short reach and target-facing rear bonus.
- **Accept:** Combo cannot bypass cooldown; rear bonus uses target orientation; wall and range miss correctly.
- **Evidence:** Unit combo/rear-angle cases.

#### CK-11-04 — Implement dagger evasive secondary

- **Depends on:** `CK-11-03`, `CK-02-07`
- **Owns:** `src/weapons/daggers.ts`; matching tests and `progress/CK-11-04.md`.
- **Build:** Add brief stance evasion with resource/cooldown; prevent indefinite overlap with dash immunity.
- **Accept:** Shared evade cap/cooldown enforced; canceled input clears stance; no permanent invulnerability from alternation.
- **Evidence:** Unit stance/dash-combination cases.

#### CK-11-05 — Create dagger twin viewmodels

- **Depends on:** `CK-11-04`, `CK-03-06`
- **Owns:** `src/render/weapons/daggers.ts`; matching tests and `progress/CK-11-05.md`.
- **Build:** Render alternating hands, combo rhythm and secondary movement with sharp readable silhouettes.
- **Accept:** Each strike is visibly distinct; reduced-motion retains timing tells; no detached weapon after switch.
- **Evidence:** Inspected combo and evasive evidence.

#### CK-11-06 — Implement elemental staff bolt casting

- **Depends on:** `CK-03-03`, `CK-09-02`, `CK-10-01`, `CK-08-02`
- **Owns:** `src/weapons/staff.ts`; matching tests and `progress/CK-11-06.md`.
- **Build:** Add immediate primary bolt with chosen element, cooldown, mana commit and bounded status payload.
- **Accept:** Failed mana/cooldown produces no projectile; supported elements differ; primary uses shared damage/status pipeline.
- **Evidence:** Unit staff cast/resource/status cases.

#### CK-11-07 — Implement staff channel burst secondary

- **Depends on:** `CK-11-06`, `CK-03-02`
- **Owns:** `src/weapons/staff.ts`; matching tests and `progress/CK-11-07.md`.
- **Build:** Add 0.6 s right-held channel, release cone burst, mana cost and interrupted-channel cancellation.
- **Accept:** Early/canceled release emits no burst; legal cone obeys walls; cost and target hits commit once.
- **Evidence:** Unit channel/cone/cancel cases.

#### CK-11-08 — Create staff viewmodel and elemental vocabulary

- **Depends on:** `CK-11-07`, `CK-03-06`
- **Owns:** `src/render/weapons/staff.ts`; matching tests and `progress/CK-11-08.md`.
- **Build:** Render original staff, channel glyphs and distinct ember/frost/storm bolt/burst effects.
- **Accept:** Elements distinguish by shape and text as well as color; tell remains visible through effects.
- **Evidence:** Inspected elemental contact sheet.

#### CK-11-09 — Apply regular stat/timing affix modifiers

- **Depends on:** `CK-08-04`, `CK-10-02`
- **Owns:** `src/loot/effective-stats.ts`; matching tests and `progress/CK-11-09.md`.
- **Build:** Implement compatible damage/crit/range/timing/resource-stat affixes as deterministic derived-stat transformations.
- **Accept:** All stat affixes resolve; minimum timings/caps hold; equip/unequip never compounds modifiers.
- **Evidence:** Affix stat coverage and cap tests.

#### CK-11-10 — Apply status and bounded on-hit affix payloads

- **Depends on:** `CK-11-09`, `CK-10-01`, `CK-09-02`
- **Owns:** `src/combat/affix-effects.ts`; matching tests and `progress/CK-11-10.md`.
- **Build:** Route status, stagger and on-hit resource modifiers through damage outcomes; prevent recursive retriggers.
- **Accept:** Every non-signature affix resolves; misses grant nothing; multi-target/refund effects obey per-attack caps.
- **Evidence:** Handler coverage and on-hit/refund cases.

#### CK-11-11 — Implement sword follow-through signature

- **Depends on:** `CK-11-10`, `CK-03-05`
- **Owns:** `src/combat/signatures/sword.ts`; matching tests and `progress/CK-11-11.md`.
- **Build:** After a committed charged sword strike, request one reduced-power follow-through cone.
- **Accept:** Distinct subattack IDs dedupe; follow-through respects walls/resources and cannot trigger itself.
- **Evidence:** Unit signature hit/recursive-trigger cases.

#### CK-11-12 — Implement bow piercing signature

- **Depends on:** `CK-11-10`, `CK-09-07`
- **Owns:** `src/combat/signatures/bow.ts`; `src/combat/projectiles.ts`; matching tests and `progress/CK-11-12.md`.
- **Build:** Allow up to two enemy penetrations with power decay; walls always terminate the arrow.
- **Accept:** Same target cannot be struck twice; penetration bound/decay apply; ordinary arrows stay unchanged.
- **Evidence:** Unit multi-target/wall penetration cases.

#### CK-11-13 — Implement axe shockwave signature

- **Depends on:** `CK-11-10`, `CK-11-01`
- **Owns:** `src/combat/signatures/axe.ts`; matching tests and `progress/CK-11-13.md`.
- **Build:** Charged overhead requests one short marked ground cone with lower damage and no recursive affix chain.
- **Accept:** Wave does not cross walls or become an infinite projectile; subattack attribution remains once-only.
- **Evidence:** Unit wave/range/obstruction cases.

#### CK-11-14 — Implement dagger finisher refund signature

- **Depends on:** `CK-11-10`, `CK-11-04`
- **Owns:** `src/combat/signatures/daggers.ts`; matching tests and `progress/CK-11-14.md`.
- **Build:** Completed third-strike damage can refund bounded stamina/recovery once per combo.
- **Accept:** Miss/death/cancel cannot refund; cap prevents repeated free combos; spent-state remains monotonic.
- **Evidence:** Unit combo/refund abuse cases.

#### CK-11-15 — Implement staff bounded chain signature

- **Depends on:** `CK-11-10`, `CK-11-07`
- **Owns:** `src/combat/signatures/staff.ts`; matching tests and `progress/CK-11-15.md`.
- **Build:** After accepted storm hit, select at most two additional LOS-valid targets with reduced power.
- **Accept:** Never returns to a visited target; links do not trigger new chains or ignore walls.
- **Evidence:** Unit chain selection/attribution cases.

#### CK-11-16 — Integrate axe and directional guard

- **Depends on:** `CK-11-02`, `CK-11-13`, `CK-08-06`, `CK-10-03`
- **Owns:** `src/app/weapon-adapters/axe.ts`; `src/render/weapons/index.ts`; `src/ui/weapon-help.ts`; matching tests and `progress/CK-11-16.md`.
- **Build:** Register axe logic/viewmodel/signature and higher-cost guard through existing dispatcher.
- **Accept:** Real light/charge/guard behavior works; switch cancels axe anticipation; no sword-only parry.
- **Evidence:** Browser axe class sequence.

#### CK-11-17 — Integrate daggers and evasive stance

- **Depends on:** `CK-11-05`, `CK-11-14`, `CK-11-16`
- **Owns:** `src/app/weapon-adapters/daggers.ts`; `src/render/weapons/index.ts`; `src/ui/weapon-help.ts`; matching tests and `progress/CK-11-17.md`.
- **Build:** Register dagger logic/viewmodels/signature, backstab feedback and secondary resource UI.
- **Accept:** Alternating combo/rear bonus/stance work through actual inputs; switching resets combo/evasion.
- **Evidence:** Browser dagger class sequence.

#### CK-11-18 — Integrate staff and elemental selection

- **Depends on:** `CK-11-08`, `CK-11-15`, `CK-11-17`
- **Owns:** `src/app/weapon-adapters/staff.ts`; `src/render/weapons/index.ts`; `src/ui/weapon-help.ts`; matching tests and `progress/CK-11-18.md`.
- **Build:** Register staff logic/visual/signature, mana, element selection from item recipe and channel feedback.
- **Accept:** Real bolt/burst apply element/status; insufficient mana shows reason; switch cancels channel.
- **Evidence:** Browser staff class sequence.

#### CK-11-19 — Integrate signatures and verify all-class switching

- **Depends on:** `CK-11-11`, `CK-11-12`, `CK-11-18`, `CK-09-08`
- **Owns:** `src/app/combat-session.ts`; `tests/e2e/weapon-classes.spec.ts`; matching tests and `progress/CK-11-19.md`.
- **Build:** Register complete signature dispatch for five classes and test shared quick-switch/input cancellation.
- **Accept:** No stale guard/ADS/channel after any pair switch; every signature modifies real combat once.
- **Evidence:** All-class normal-input browser regressions.

### M12 — Boss variety and the final Crypt Sovereign

**Milestone acceptance:** All ten region boss kits, legal move variations, phase transitions and level-100 victory are playable and validated.

#### CK-12-01 — Define boss kit and phase scheduler contracts

- **Depends on:** `CK-05-04`, `CK-06-01`, `CK-07-01`
- **Owns:** `src/bosses/kits.ts`; `src/bosses/scheduler.ts`; matching tests and `progress/CK-12-01.md`.
- **Build:** Generalize complete initial boss controller into weighted legal move selection, cooldowns, phases and cancellation.
- **Accept:** No phase skips a tell; selection terminates; move caps and incompatible traits validated.
- **Evidence:** Unit scheduler/phase cases.

#### CK-12-02 — Implement frontal wave and marked slam primitives

- **Depends on:** `CK-12-01`, `CK-07-03`
- **Owns:** `src/bosses/moves/wave.ts`; `src/bosses/moves/slam.ts`; matching tests and `progress/CK-12-02.md`.
- **Build:** Create collision/LOS-aware frontal and marked-area attack patterns with minimum heavy tells.
- **Accept:** Safe lanes/cells exist; one attack hits once; interrupted/dead boss clears markers without damage.
- **Evidence:** Unit tell/safe-zone/cancel cases.

#### CK-12-03 — Implement collision-aware charge primitive

- **Depends on:** `CK-12-01`, `CK-04-06`
- **Owns:** `src/bosses/moves/charge.ts`; matching tests and `progress/CK-12-03.md`.
- **Build:** Mark direction then charge along a validated path with bounded distance and recovery.
- **Accept:** Walls stop charge; no teleport through player/walls; recovery provides punish window.
- **Evidence:** Unit arena/charge path cases.

#### CK-12-04 — Implement marked barrage primitive

- **Depends on:** `CK-12-01`, `CK-09-02`
- **Owns:** `src/bosses/moves/barrage.ts`; matching tests and `progress/CK-12-04.md`.
- **Build:** Telegraph finite projectile patterns with escape lanes and global projectile caps.
- **Accept:** Pattern stays bounded; markers precede actual projectile motion; cap saturation cannot cause invisible hits.
- **Evidence:** Unit pattern/tell/cap cases.

#### CK-12-05 — Implement finite boss summon waves

- **Depends on:** `CK-12-01`, `CK-07-06`
- **Owns:** `src/bosses/moves/summon.ts`; matching tests and `progress/CK-12-05.md`.
- **Build:** Use arena-clear spawn pads, owner IDs and at-most-12 boss minions with no recursive summons.
- **Accept:** Repeated waves honor live cap; minion death cannot duplicate boss rewards/XP; boss death cleanup is defined.
- **Evidence:** Unit wave ownership/cap tests.

#### CK-12-06 — Implement damageable shield anchors

- **Depends on:** `CK-12-01`, `CK-03-02`
- **Owns:** `src/bosses/moves/anchors.ts`; `src/bosses/anchor-state.ts`; matching tests and `progress/CK-12-06.md`.
- **Build:** Create reachable targetable anchors granting a bounded shield phase; destroying them ends it.
- **Accept:** Any weapon can damage anchors; no invulnerable/unreachable anchor; saveable state and repeated destruction dedupe.
- **Evidence:** Unit shield/anchor reachability cases.

#### CK-12-07 — Author Vaults and Warrens boss kits

- **Depends on:** `CK-12-02`, `CK-12-03`, `CK-12-05`
- **Owns:** `src/bosses/catalog/early.ts`; matching tests and `progress/CK-12-07.md`.
- **Build:** Define Cairn Warden/Briar Matron move pools, capstone variants, phase rules and original visual recipes.
- **Accept:** Each has at least three available moves; generated selections and phase thresholds are legal.
- **Evidence:** Two-kit data/timeline tests.

#### CK-12-08 — Author Reliquary and Foundry boss kits

- **Depends on:** `CK-12-02`, `CK-12-04`
- **Owns:** `src/bosses/catalog/elemental.ts`; matching tests and `progress/CK-12-08.md`.
- **Build:** Define Bellkeeper/Furnace Marshal patterns, floor-compatible elemental lanes and phase variants.
- **Accept:** Moves differ beyond color; frozen/burning zones always leave movement choices; tells meet limits.
- **Evidence:** Two-kit data/safe-zone tests.

#### CK-12-09 — Author Ossuary and Mirror boss kits

- **Depends on:** `CK-12-04`, `CK-12-06`
- **Owns:** `src/bosses/catalog/defensive.ts`; matching tests and `progress/CK-12-09.md`.
- **Build:** Define Ivory Bailiff/Prism Seer with posture/anchors/barrage combinations and reachable weakpoints.
- **Accept:** Damage windows cannot permanently disappear; all kit ability IDs resolve.
- **Evidence:** Two-kit phase/reachability tests.

#### CK-12-10 — Author Storm and Choir boss kits

- **Depends on:** `CK-12-04`, `CK-12-05`
- **Owns:** `src/bosses/catalog/pressure.ts`; matching tests and `progress/CK-12-10.md`.
- **Build:** Define Coil Regent/Dirge Abbot finite storm patterns and minion-priority phase variants.
- **Accept:** Shock/summon budgets bounded; no arena saturation or endless phase from minion replenishment.
- **Evidence:** Two-kit budget/timeline tests.

#### CK-12-11 — Author Blackglass and Crown champion kits

- **Depends on:** `CK-12-03`, `CK-12-06`
- **Owns:** `src/bosses/catalog/deep.ts`; matching tests and `progress/CK-12-11.md`.
- **Build:** Define Ashen Colossus and Crown champions for 91–99, with mixed primitives and legal depth variants.
- **Accept:** Crown champion is distinct from final encounter; at least three available moves per kit; clearance valid.
- **Evidence:** Two-kit data/arena tests.

#### CK-12-12 — Implement final Sovereign three-phase kit

- **Depends on:** `CK-12-07`, `CK-12-08`, `CK-12-09`, `CK-12-10`, `CK-12-11`
- **Owns:** `src/bosses/catalog/sovereign.ts`; `src/bosses/moves/final-warning.ts`; matching tests and `progress/CK-12-12.md`.
- **Build:** Define floor-100 override, five mastered moves, 70%/35% phases and arena-wide marked attack with safe zones.
- **Accept:** Every phase remains avoidable; final pressure highest within caps; boss death routes to existing victory contract.
- **Evidence:** Unit final timelines and simultaneous-death boundary.

#### CK-12-13 — Render boss variants, tell markers and anchors

- **Depends on:** `CK-12-12`, `CK-07-10`, `CK-05-05`
- **Owns:** `src/render/bosses/variants.ts`; `src/render/bosses/tells.ts`; `src/render/bosses/anchors.ts`; matching tests and `progress/CK-12-13.md`.
- **Build:** Build region kit variants from shared rigs and animate their distinct tell/phase/anchor states.
- **Accept:** At least ten distinct kit silhouettes/recipes visible; warning safe zones clearly readable; anchors targetable visually.
- **Evidence:** Boss contact sheet and final-phase evidence.

#### CK-12-14 — Integrate boss generation, rewards and campaign boundary

- **Depends on:** `CK-12-13`, `CK-08-11`, `CK-05-09`
- **Owns:** `src/bosses/generate.ts`; `src/app/boss-session.ts`; `src/ui/boss-hud.ts`; matching tests and `progress/CK-12-14.md`.
- **Build:** Select one region boss per floor with constrained legal traits/moves; run scheduler and exact-once reward/victory.
- **Accept:** Floors 1–100 have exactly one boss; 100 overrides champion kit; save-ready reward ledger committed once.
- **Evidence:** Browser region and final-boss fixtures.

#### CK-12-15 — Sweep all bosses and arena solvability

- **Depends on:** `CK-12-14`, `CK-06-08`
- **Owns:** `src/bosses/generate.test.ts`; `tests/e2e/bosses.spec.ts`; matching tests and `progress/CK-12-15.md`.
- **Build:** Validate seed/depth boss matrix, legal tell/safe zones, phase completion, anchors/summons and exit reopening.
- **Accept:** No missing kit or unkillable phase; floor-100 killing blow finishes game; real input verifies representative fights.
- **Evidence:** Boss report and reviewed fight/phase screenshots.

### M13 — Durable campaign saves and checkpoint retry

**Milestone acceptance:** Reload/continue restores exact active progress; death retries the entry checkpoint; failed/unknown storage never silently destroys a campaign.

#### CK-13-01 — Serialize player/inventory snapshot DTO

- **Depends on:** `CK-08-11`, `CK-10-08`, `CK-00-05`
- **Owns:** `src/persist/player-codec.ts`; matching tests and `progress/CK-13-01.md`.
- **Build:** Encode resources, items, equipment, XP/perks, statuses and weapon cooldowns as plain versioned records.
- **Accept:** Round trip preserves stable UIDs/stats/times; held browser input is omitted; malformed values reject.
- **Evidence:** Player DTO round-trip and rejection cases.

#### CK-13-02 — Serialize floor/enemy/boss runtime DTO

- **Depends on:** `CK-12-15`, `CK-07-12`, `CK-05-08`
- **Owns:** `src/persist/floor-codec.ts`; matching tests and `progress/CK-13-02.md`.
- **Build:** Encode plan/deltas, entity states, gates/rewards, local tick/RNG cursors and checkpoint entry state.
- **Accept:** Opened chest/dead enemy/anchor/phase state survives; no mesh/function/event listener enters DTO.
- **Evidence:** Floor DTO state-matrix round trips.

#### CK-13-03 — Validate complete save envelope and versions

- **Depends on:** `CK-13-01`, `CK-13-02`
- **Owns:** `src/persist/save-codec.ts`; `src/persist/migrations.ts`; matching tests and `progress/CK-13-03.md`.
- **Build:** Define schema/content/generator versions, bounded validation and explicit compatibility/migration policy.
- **Accept:** Corrupt/missing/oversized records reject clearly; newer version preserved; supported migration keeps IDs and rewards.
- **Evidence:** Save envelope fixture tests.

#### CK-13-04 — Restore runtime without regeneration drift

- **Depends on:** `CK-13-03`, `CK-05-07`
- **Owns:** `src/persist/restore.ts`; matching tests and `progress/CK-13-04.md`.
- **Build:** Recreate simulation from valid snapshot, reset held input and rebuild render adapters from saved records.
- **Accept:** Continue does not reroll loot/enemies; RNG next draws match; boss phase/timers/cooldowns restore correctly.
- **Evidence:** Deterministic save-resume simulation comparison.

#### CK-13-05 — Implement transactional IndexedDB slot storage

- **Depends on:** `CK-13-03`
- **Owns:** `src/persist/database.ts`; matching tests and `progress/CK-13-05.md`.
- **Build:** Read/write active and entry-checkpoint records with atomic transition transactions and monotonic revision.
- **Accept:** Failed transaction leaves earlier slot intact; concurrent saves cannot overwrite a newer accepted revision.
- **Evidence:** Real-browser database transaction cases.

#### CK-13-06 — Implement save scheduling and lifecycle triggers

- **Depends on:** `CK-13-04`, `CK-13-05`
- **Owns:** `src/persist/save-coordinator.ts`; matching tests and `progress/CK-13-06.md`.
- **Build:** Save on pause/title/transition/victory, periodic dirty snapshots, serialized writes and visible status; best-effort pagehide only.
- **Accept:** No overlapping stale writes; descent saves new entry checkpoint consistently; unload is not sole durability mechanism.
- **Evidence:** Unit scheduling plus browser transition save.

#### CK-13-07 — Integrate durable retry and completed campaigns

- **Depends on:** `CK-13-06`, `CK-05-08`, `CK-05-09`
- **Owns:** `src/app/checkpoint.ts`; `src/app/campaign-lifecycle.ts`; matching tests and `progress/CK-13-07.md`.
- **Build:** Restore entry checkpoint on retry; persist dead/victorious states; explain floor-gain rollback.
- **Accept:** Death-then-reload still opens death; retry restores entry stock/resources; final victory survives reload once.
- **Evidence:** Browser retry/reload/completed-state tests.

#### CK-13-08 — Implement campaign continue and explicit abandon

- **Depends on:** `CK-13-07`
- **Owns:** `src/ui/campaign-slot.ts`; `src/app/campaign-lifecycle.ts`; matching tests and `progress/CK-13-08.md`.
- **Build:** Show active/dead/completed slot, Continue/Results, and explicit new/abandon flow without silent replacement.
- **Accept:** Cancel abandon preserves records; Continue restores pose/progress; completed slot opens results.
- **Evidence:** Browser screen/confirmation tests.

#### CK-13-09 — Implement bounded save import/export

- **Depends on:** `CK-13-03`, `CK-13-08`
- **Owns:** `src/persist/save-transfer.ts`; `src/ui/save-transfer.ts`; matching tests and `progress/CK-13-09.md`.
- **Build:** Export the existing versioned JSON save envelope as a downloadable `.save` file; let the player select a `.save` file in a later session, validate contents/version, preview summary and replace slot only after explicit selection/confirmation. Reuse the browser save codec rather than maintaining a second format.
- **Accept:** Download uses the `.save` extension; valid export/import restores active progress, IDs and checkpoint in a fresh session. Malformed/huge/newer files or renamed non-save content do not alter the existing campaign. Browser-local saving works independently of export/import.
- **Evidence:** Browser file/round-trip/error cases.

#### CK-13-10 — Handle denied/quota/corrupt storage gracefully

- **Depends on:** `CK-13-09`
- **Owns:** `src/persist/errors.ts`; `src/ui/save-status.ts`; matching tests and `progress/CK-13-10.md`.
- **Build:** Surface Not saved/compatibility errors with retry/export; preserve playable in-memory campaign and existing bytes.
- **Accept:** Injected denial/quota failure never claims saved; corrupt/unknown slot not auto-deleted; recovery options usable.
- **Evidence:** Browser storage failure matrix.

#### CK-13-11 — Verify long-lived save/resume and anti-duplication

- **Depends on:** `CK-13-10`
- **Owns:** `tests/e2e/persistence.spec.ts`; matching tests and `progress/CK-13-11.md`.
- **Build:** Test mid-fight/mid-charge saves, chest/reward ledgers, deep floors, RNG continuation, death rollback and final victory.
- **Accept:** No extra loot/XP on reload; input neutral on resume; representative floor 99/100 records validate.
- **Evidence:** Persistence regression results and state comparisons.

### M14 — Equipment, salvage and safe-room economy

**Milestone acceptance:** Armor/charms and dust purchases/upgrades affect real stats; deterministic traders provide bounded renewable combat resources.

#### CK-14-01 — Author armor/charm bases and legal affixes

- **Depends on:** `CK-08-01`, `CK-11-10`
- **Owns:** `src/loot/bases/equipment.ts`; `src/loot/equipment-roll.ts`; matching tests and `progress/CK-14-01.md`.
- **Build:** Add six armor and six charm bases with compatible defensive/resource/utility affixes and readable stats.
- **Accept:** All bases roll legally; resist/armor/resource caps apply; names/icons have stable content IDs.
- **Evidence:** Equipment catalog/roll tests.

#### CK-14-02 — Integrate equipped armor/charm stat effects

- **Depends on:** `CK-14-01`, `CK-10-06`, `CK-08-09`
- **Owns:** `src/player/derived-stats.ts`; `src/ui/item-compare.ts`; `src/app/loot-session.ts`; matching tests and `progress/CK-14-02.md`.
- **Build:** Recompute defensive/resource stats from one armor and charm; include equipment in loot and comparison.
- **Accept:** Equip/remove changes actual received damage/regen; no compounded effects or duplicate UID use.
- **Evidence:** Unit stat reversal and browser equip cases.

#### CK-14-03 — Implement atomic salvage and dust ledger

- **Depends on:** `CK-14-02`, `CK-08-05`
- **Owns:** `src/loot/salvage.ts`; `src/ui/salvage.ts`; matching tests and `progress/CK-14-03.md`.
- **Build:** Salvage explicit selected unequipped item for bounded dust by depth/rarity; protect accidental equipped deletion. Bound starter cannot be salvaged.
- **Accept:** Transaction consumes item/grants dust once; refusal/cancel changes nothing; repeat UID yields no extra dust.
- **Evidence:** Unit ledger and browser salvage interaction.

#### CK-14-04 — Generate safe-room shop placement and stock

- **Depends on:** `CK-14-03`, `CK-06-07`
- **Owns:** `src/loot/shop.ts`; `src/dungeon/safe-room.ts`; matching tests and `progress/CK-14-04.md`.
- **Build:** Place shops at defined floor entries; generate stable stock with guaranteed arrows/tonics and weapon option.
- **Accept:** No hostile/hazard within safe radius; same seed/checkpoint gives same stock; entry path remains clear.
- **Evidence:** Placement/stock corpus and shop screenshot.

#### CK-14-05 — Implement purchase and bounded item upgrades

- **Depends on:** `CK-14-04`
- **Owns:** `src/loot/economy.ts`; `src/ui/shop.ts`; matching tests and `progress/CK-14-05.md`.
- **Build:** Atomically buy stock with dust/backpack constraints and apply depth-bounded upgrade to persistent item UID.
- **Accept:** Insufficient currency/full bag does not partially buy; duplicate click no double charge; upgrade cap prevents compounding.
- **Evidence:** Economy unit cases and browser purchase/upgrade.

#### CK-14-06 — Persist economy and equipment transactions

- **Depends on:** `CK-14-05`, `CK-13-11`
- **Owns:** `src/persist/player-codec.ts`; `src/persist/floor-codec.ts`; `src/app/loot-session.ts`; matching tests and `progress/CK-14-06.md`.
- **Build:** Include dust, stock purchases and item upgrades in active/checkpoint records; restore as real transactions. Add tested version/default migration for newly saved fields.
- **Accept:** Reload preserves purchase once; checkpoint retry rolls back current-floor purchases/gains; upgraded UID survives.
- **Evidence:** Browser economy/save/retry sequence.

#### CK-14-07 — Verify ammunition/healing availability and choice

- **Depends on:** `CK-14-06`, `CK-08-12`
- **Owns:** `src/loot/economy.test.ts`; `tools/economy-report.mjs`; matching tests and `progress/CK-14-07.md`.
- **Build:** Model representative floors/resource spending/dust under unlucky legal loot; identify class starvation risks.
- **Accept:** Starter melee always usable; scheduled resource access exists; no finite-dust softlock introduced by mandatory costs.
- **Evidence:** Economy report; balance changes assigned separately if needed.

### M15 — Exploration, traps and optional room objectives

**Milestone acceptance:** Map, secrets, puzzles and shrines add meaningful variety without blocking the boss path or obscuring attack readability.

#### CK-15-01 — Implement explored-cell fog and minimap model

- **Depends on:** `CK-06-07`, `CK-02-05`
- **Owns:** `src/exploration/map.ts`; `src/ui/map.ts`; matching tests and `progress/CK-15-01.md`.
- **Build:** Track explored/visible grid cells, player/boss/exit discovered markers and paused map screen.
- **Accept:** No reveal through distant walls; same floor updates incrementally; map close clears input; saves include discovery.
- **Evidence:** Unit reveal cases and browser map screenshot.

#### CK-15-02 — Create region room-template vocabulary

- **Depends on:** `CK-06-05`
- **Owns:** `src/dungeon/room-templates.ts`; `src/render/room-dressing.ts`; matching tests and `progress/CK-15-02.md`.
- **Build:** Define six reusable template patterns per region using shared prop vocabulary and clear mechanical/geometry differences.
- **Accept:** Sixty legal data templates cover ten regions; placement uses validation; required clearances stay open.
- **Evidence:** Template coverage and inspected room contact sheet.

#### CK-15-03 — Implement pressure/blade trap state machine

- **Depends on:** `CK-15-02`, `CK-10-01`
- **Owns:** `src/exploration/traps/blade.ts`; `src/render/traps/blade.ts`; matching tests and `progress/CK-15-03.md`.
- **Build:** Trigger telegraphed blade after pressure contact, recover with cooldown and optional disarm interaction.
- **Accept:** No unavoidable entry spawn; tell precedes damage; paused/disabled trap cannot attack; path leaves dodge space.
- **Evidence:** Unit trap timing and browser tell evidence.

#### CK-15-04 — Implement dart traps and elemental patches

- **Depends on:** `CK-15-03`, `CK-09-02`
- **Owns:** `src/exploration/traps/dart.ts`; `src/exploration/traps/patch.ts`; `src/render/traps/patch.ts`; matching tests and `progress/CK-15-04.md`.
- **Build:** Add bounded LOS dart lane and visible elemental patch using shared projectile/status rules.
- **Accept:** Walls block darts; patches follow status caps; spawn and critical arena lanes cannot become permanent lethal zones.
- **Evidence:** Unit placement/timing tests and two trap screenshots.

#### CK-15-05 — Implement optional secret-room interactions

- **Depends on:** `CK-15-02`, `CK-08-08`
- **Owns:** `src/exploration/secrets.ts`; `src/render/secrets.ts`; matching tests and `progress/CK-15-05.md`.
- **Build:** Create hinted wall-switch and concealed side-door secrets with loot and discovered flag; E is sufficient.
- **Accept:** No class-specific tool required; secret doorway never replaces critical path; reward/discovery once-only.
- **Evidence:** Unit reachability and browser secret discovery.

#### CK-15-06 — Implement sigil-order and lever puzzles

- **Depends on:** `CK-15-05`
- **Owns:** `src/exploration/puzzles.ts`; `src/ui/puzzle.ts`; matching tests and `progress/CK-15-06.md`.
- **Build:** Generate bounded solvable optional clue/order and lever combinations; retryable wrong input, optional treasure.
- **Accept:** Solver proves generated solution; wrong attempt cannot erase exit; clue/prompt visible without color-only distinction.
- **Evidence:** Puzzle corpus and browser solve/reset.

#### CK-15-07 — Implement two-choice shrines and lore

- **Depends on:** `CK-15-06`, `CK-10-06`
- **Owns:** `src/exploration/shrines.ts`; `src/ui/shrine.ts`; `src/exploration/lore.ts`; `src/ui/journal.ts`; matching tests and `progress/CK-15-07.md`.
- **Build:** Offer displayed bounded resource/stat tradeoffs and short original discoveries; commit selection once. Expose collected lore in a small journal panel.
- **Accept:** Cancel applies nothing; choice cannot lower essential resources below safe rules; repeated use cannot stack indefinitely.
- **Evidence:** Unit shrine transactions and inspected choice screen.

#### CK-15-08 — Integrate exploration state and persistence

- **Depends on:** `CK-15-01`, `CK-15-04`, `CK-15-07`, `CK-13-11`
- **Owns:** `src/app/exploration-session.ts`; `src/persist/floor-codec.ts`; `tests/e2e/exploration.spec.ts`; matching tests and `progress/CK-15-08.md`.
- **Build:** Place/register traps/secrets/puzzles/shrines, update interaction priority, save map/objectives and validate actual paths. Extend save validation/migration for these fields.
- **Accept:** Interact selects nearest valid target; reload does not reset rewards; hazards/props never invalidate boss/exit routes.
- **Evidence:** Browser exploration/save cases and generation checks.

### M16 — Complete menus, controls and resilience

**Milestone acceptance:** New/continue/pause/settings/help flows are usable by keyboard/mouse and recover from capture/render/storage failures.

#### CK-16-01 — Implement title/new-campaign and seed flow

- **Depends on:** `CK-13-08`, `CK-06-09`
- **Owns:** `src/ui/title.ts`; `src/ui/new-campaign.ts`; `src/app/campaign-lifecycle.ts`; matching tests and `progress/CK-16-01.md`.
- **Build:** Show title, optional normalized seed, campaign summary and start action; preserve existing slot until explicit replacement.
- **Accept:** Entered seed yields reproducible first floor; empty seed creates/share-displays seed; title opens correct Continue/Results.
- **Evidence:** Browser new/continue/title screenshots.

#### CK-16-02 — Complete pause/restart/save-to-title flows

- **Depends on:** `CK-16-01`, `CK-13-10`, `CK-02-08`
- **Owns:** `src/ui/pause.ts`; `src/app/pause.ts`; matching tests and `progress/CK-16-02.md`.
- **Build:** Add Resume, retry checkpoint, settings/help, save-to-title, and explicit abandon semantics.
- **Accept:** Resume requires gesture; retry matches death policy; failed save remains visible before returning; no silent campaign wipe.
- **Evidence:** Browser pause/restart/title cases.

#### CK-16-03 — Implement persisted display/control settings

- **Depends on:** `CK-16-02`
- **Owns:** `src/ui/settings.ts`; `src/app/settings.ts`; `src/persist/settings.ts`; matching tests and `progress/CK-16-03.md`.
- **Build:** Add sensitivity/invert/FOV/world resolution/UI scale/feedback toggles; keep settings independent of campaign data.
- **Accept:** Changing resolution affects world only; FOV bounds hold; new campaign does not reset settings; denial falls back in memory.
- **Evidence:** Browser settings/reload and visual scale checks.

#### CK-16-04 — Implement named-action key rebinding

- **Depends on:** `CK-16-03`, `CK-00-06`
- **Owns:** `src/ui/keybinds.ts`; `src/core/bindings.ts`; matching tests and `progress/CK-16-04.md`.
- **Build:** Capture/reassign keyboard actions with conflict resolution, reset defaults and reserved Escape handling.
- **Accept:** Gameplay reads action map; duplicate conflicts require clear resolution; focus text fields do not move player.
- **Evidence:** Unit binding cases and browser rebind.

#### CK-16-05 — Implement help and keyboard-accessible panels

- **Depends on:** `CK-16-04`, `CK-11-19`
- **Owns:** `src/ui/help.ts`; `src/ui/focus.ts`; `src/ui/accessibility.css`; matching tests and `progress/CK-16-05.md`.
- **Build:** Show actual class controls/loot/status/checkpoint rules and apply focus order/labels to main panels.
- **Accept:** All menu actions reachable by keyboard; help agrees with implemented release controls and retry behavior.
- **Evidence:** Browser focus/control-help assertions and UI review.

#### CK-16-06 — Recover from pointer/audio/storage limitations

- **Depends on:** `CK-16-05`, `CK-13-10`
- **Owns:** `src/app/capabilities.ts`; `src/ui/capability-message.ts`; matching tests and `progress/CK-16-06.md`.
- **Build:** Provide explicit capture-denied, muted/suspended-audio and unsaved-storage states without a broken session.
- **Accept:** Retry capture requires gesture; no blocked permission hides playable controls; errors do not claim recovery prematurely.
- **Evidence:** Browser fault-injection matrix.

#### CK-16-07 — Handle WebGL context loss and resize restoration

- **Depends on:** `CK-16-06`, `CK-00-03`
- **Owns:** `src/render/context-recovery.ts`; `src/app/floor-session.ts`; matching tests and `progress/CK-16-07.md`.
- **Build:** Pause on context loss, rebuild renderer/assets from current simulation snapshot and restore scene on recovery.
- **Accept:** Floor/enemy/loot state unchanged; no regen/reroll; resize preserves UI/world aspect; repeated recovery doesn't leak.
- **Evidence:** Browser context-loss/resize fixture and resource report.

#### CK-16-08 — Verify screens and reduced-motion readability

- **Depends on:** `CK-16-07`
- **Owns:** `tests/e2e/screens.spec.ts`; `tests/e2e/accessibility.spec.ts`; matching tests and `progress/CK-16-08.md`.
- **Build:** Cover title→play→pause→inventory/map→death/retry→victory and readable low-motion/flash-disabled settings.
- **Accept:** No trapped focus or stale inputs; essential enemy/boss tells remain visible with motion/flash disabled.
- **Evidence:** Reviewed screen gallery and browser flow regressions.

### M17 — Original pixel art, readable animation and synthesized sound

**Milestone acceptance:** Every supported region/class/creature has a coherent pixel visual identity and sound feedback; polish preserves tells and gameplay timing.

#### CK-17-01 — Refine dungeon texture detail and seams

- **Depends on:** `CK-06-04`, `CK-15-02`
- **Owns:** `src/render/textures/regions.ts`; `src/render/materials.ts`; matching tests and `progress/CK-17-01.md`.
- **Build:** Add consistent 16/32-pixel motifs, dithering and edge-safe sampling to existing region materials.
- **Accept:** No missing/blurry atlas edges; adjacent tiles meet cleanly; ten regions remain structurally/palette distinct.
- **Evidence:** Inspected texture/room contact sheet at default resolution.

#### CK-17-02 — Generate item icons and rarity vocabulary

- **Depends on:** `CK-14-02`, `CK-08-10`
- **Owns:** `src/render/icons.ts`; `src/ui/item-icons.ts`; matching tests and `progress/CK-17-02.md`.
- **Build:** Generate all weapon/equipment base icons plus affix/rarity markers from item recipes.
- **Accept:** Every base resolves icon; color plus shape/text signals rarity; inventory remains legible at UI scales.
- **Evidence:** Catalog coverage and inventory icon contact sheet.

#### CK-17-03 — Refine enemy rig animation and reactions

- **Depends on:** `CK-07-11`, `CK-17-01`
- **Owns:** `src/render/enemies/animation.ts`; `src/render/enemies/tells.ts`; matching tests and `progress/CK-17-03.md`.
- **Build:** Animate idle/move/tell/attack/hit/death for supported rigs using logical state time.
- **Accept:** Death/tell animation cannot cause extra damage; archetype poses readable; reduced motion preserves attack timing.
- **Evidence:** Inspected archetype pose gallery.

#### CK-17-04 — Implement capped attack/impact particles

- **Depends on:** `CK-11-19`, `CK-17-03`
- **Owns:** `src/render/fx/pool.ts`; `src/render/fx/combat.ts`; matching tests and `progress/CK-17-04.md`.
- **Build:** Pool class/element trails, sparks and impacts with budget/priority so critical tells survive.
- **Accept:** Cap is enforced; particles recycle/dispose; dense fight never hides boss warning or exhausts memory.
- **Evidence:** Unit allocation caps and dense-fight screenshot.

#### CK-17-05 — Implement synthesized audio engine and gesture start

- **Depends on:** `CK-00-07`, `CK-16-06`
- **Owns:** `src/audio/engine.ts`; `src/audio/synthesis.ts`; matching tests and `progress/CK-17-05.md`.
- **Build:** Create Web Audio context lifecycle, master/effect/ambient buses, voice caps and original tone/noise envelopes.
- **Accept:** No sound before allowed gesture; resume/mute/dispose work; simultaneous voices bounded; no downloaded sound.
- **Evidence:** Audio lifecycle tests where feasible and listened sample set.

#### CK-17-06 — Add class attack and impact sound cues

- **Depends on:** `CK-17-05`, `CK-11-19`
- **Owns:** `src/audio/combat-cues.ts`; `src/audio/events.ts`; matching tests and `progress/CK-17-06.md`.
- **Build:** Map actual charge/release/hit/block/parry/empty-resource events to distinct synthesized cues.
- **Accept:** Miss does not play successful hit; repeated subscription cannot double-play; bow/sword/staff sounds distinguish.
- **Evidence:** Event bridge tests and reviewed/listened weapon samples.

#### CK-17-07 — Add enemy/boss positional warning cues

- **Depends on:** `CK-17-06`, `CK-12-14`
- **Owns:** `src/audio/spatial.ts`; `src/audio/enemy-cues.ts`; matching tests and `progress/CK-17-07.md`.
- **Build:** Pan/attenuate nearby movement/tells/death and boss phase cues with prioritized voice budget.
- **Accept:** Distance attenuation bounded; muted audio retains visual tells; phase/death sounds emit once.
- **Evidence:** Spatial/event tests and listened boss scene.

#### CK-17-08 — Add region ambience and restrained music layers

- **Depends on:** `CK-17-07`, `CK-06-01`
- **Owns:** `src/audio/ambience.ts`; `src/audio/music.ts`; matching tests and `progress/CK-17-08.md`.
- **Build:** Generate light seeded ambient motifs by region, tension layers and victory/defeat stingers.
- **Accept:** No endless node growth; pause/title/descent transition safely; music does not alter combat RNG.
- **Evidence:** Listened region set and audio resource snapshots.

#### CK-17-09 — Integrate audio settings and complete visual review

- **Depends on:** `CK-17-04`, `CK-17-08`, `CK-16-08`
- **Owns:** `src/ui/settings.ts`; `src/app/audio-session.ts`; `tests/e2e/presentation.spec.ts`; matching tests and `progress/CK-17-09.md`.
- **Build:** Wire volume settings and sound lifecycle; inspect combat/UI/regions for consistent original presentation.
- **Accept:** Mute and persisted volume work; no suspended-context errors; all class/enemy/boss visual recipes resolved.
- **Evidence:** Reviewed visual/audio checklist with representative screenshots.

### M18 — Measured performance and resource stability

**Milestone acceptance:** Instrumented dense floors stay bounded, floor transitions don't leak, and performance claims name the actual measurement environment.

#### CK-18-01 — Instrument simulation, draw and resource metrics

- **Depends on:** `CK-17-09`, `CK-15-08`
- **Owns:** `src/debug/metrics.ts`; `tools/performance-report.mjs`; matching tests and `progress/CK-18-01.md`.
- **Build:** Measure tick distributions, long tasks, generation time, draw calls, cap counts and lifecycle resources.
- **Accept:** Metrics observe actual work; p95 aggregation correct; production diagnostics remain disabled; record environment.
- **Evidence:** Dense floor benchmark report.

#### CK-18-02 — Budget AI/path work without changing outcomes

- **Depends on:** `CK-18-01`, `CK-07-12`
- **Owns:** `src/enemies/navigation.ts`; `src/enemies/steering.ts`; `src/app/enemy-session.ts`; matching tests and `progress/CK-18-02.md`.
- **Build:** Amortize deterministic sense/replan work with stable schedules, cached paths and explicit budgets.
- **Accept:** No enemy stops forever when budget full; tells/attacks keep exact timing; dense doorways remain navigable.
- **Evidence:** Timing comparison and AI correctness regressions.

#### CK-18-03 — Batch dungeon props/materials and cull safely

- **Depends on:** `CK-18-01`, `CK-17-01`
- **Owns:** `src/render/floor.ts`; `src/render/props.ts`; `src/render/culling.ts`; matching tests and `progress/CK-18-03.md`.
- **Build:** Reduce repeated geometry/material draw overhead using safe merging/instancing and room/frustum visibility.
- **Accept:** Culling cannot remove visible boss tells/targets; collider independent; compare draw calls before/after.
- **Evidence:** Fixed-pose screenshots and measured draw-call report.

#### CK-18-04 — Move or slice generation if measured stalls require it

- **Depends on:** `CK-18-01`, `CK-06-08`
- **Owns:** `src/dungeon/generation-service.ts`; `src/dungeon/generation-worker.ts`; `src/app/floor-session.ts`; matching tests and `progress/CK-18-04.md`.
- **Build:** Use measured evidence to implement one bounded async generation job with cancellation/versioned response, or accept existing path if budgets already pass.
- **Accept:** Outdated result cannot replace current floor; worker output equals sync seed output; loading remains interactive.
- **Evidence:** Generation timing plus cancellation tests; no empty worker placeholder if unnecessary.

#### CK-18-05 — Prove disposal over repeated floor cycles

- **Depends on:** `CK-18-02`, `CK-18-03`, `CK-18-04`
- **Owns:** `tests/e2e/resources.spec.ts`; `src/render/resource-audit.ts`; matching tests and `progress/CK-18-05.md`.
- **Build:** Run at least 25 enter/leave/retry cycles tracking meshes/textures/listeners/audio voices and runtime entity counts.
- **Accept:** Counts stabilize after warmup; old floor actors cannot damage player; retained callbacks/resources investigated.
- **Evidence:** Resource-cycle report; heap numbers qualified by GC availability.

#### CK-18-06 — Tune quality settings and browser fallback

- **Depends on:** `CK-18-05`, `CK-16-03`
- **Owns:** `src/render/quality.ts`; `src/ui/settings.ts`; matching tests and `progress/CK-18-06.md`.
- **Build:** Apply measured resolution/effects/light caps for selectable quality; preserve readability at lowest quality.
- **Accept:** No settings change combat logic; low quality keeps warning/weakpoint visibility; no silently changing player preference.
- **Evidence:** Default/low-quality comparison and measured frame data.

#### CK-18-07 — Report real-hardware and cloud budget results

- **Depends on:** `CK-18-06`
- **Owns:** `docs/performance.md`; `tools/performance-report.mjs`; matching tests and `progress/CK-18-07.md`.
- **Build:** Record actual browser/hardware, steady/dense benchmarks, unmet budgets and bounded follow-ups.
- **Accept:** No 60 FPS claim from SwiftShader correctness alone; remaining bottlenecks named with evidence.
- **Evidence:** Performance report and relevant regressions.

### M19 — Campaign coverage, balance and release readiness

**Milestone acceptance:** All required systems and 100-level boundaries are verified, representative combat is playable, and the repo is ready for an explicitly requested distribution step.

#### CK-19-01 — Run full generation and enemy legality sweep

- **Depends on:** `CK-18-07`, `CK-12-15`
- **Owns:** `tools/campaign-generation-report.mjs`; `src/dungeon/campaign-invariants.test.ts`; matching tests and `progress/CK-19-01.md`.
- **Build:** Run at least 64 seeds ×100 floors with final props/hazards/boss/roster and record retry/fallback distributions.
- **Accept:** All outputs reachable and capped; every region/grammar/archetype/boss family represented; no nonfinite records.
- **Evidence:** 6,400-floor final invariant report.

#### CK-19-02 — Measure loot/encounter/player scaling

- **Depends on:** `CK-19-01`, `CK-14-07`, `CK-10-08`
- **Owns:** `tools/balance-report.mjs`; `src/loot/balance.test.ts`; matching tests and `progress/CK-19-02.md`.
- **Build:** Measure median power, effective HP, class DPS/resource costs, threat and representative TTK at seven depths. Report measured/predicted ordinary-floor durations against the approved 3–6 minute pacing target.
- **Accept:** Floor 100 highest budget; comparable scaling monotonic; identify dominant/useless rolls or starvation rather than hide them.
- **Evidence:** Balance report; individual numerical corrections delegated separately.

#### CK-19-03 — Verify five-class browser combat regressions

- **Depends on:** `CK-19-02`, `CK-11-19`, `CK-16-08`
- **Owns:** `tests/e2e/combat-regression.spec.ts`; matching tests and `progress/CK-19-03.md`.
- **Build:** Use real input per class with valid equipped items, attack/cancel/switch/secondary/affix and wall scenarios.
- **Accept:** Sword tap/charge and bow ADS/release correct; axe/dagger/staff distinct; no diagnostics substituted for input coverage.
- **Evidence:** Browser class matrix and inspected evidence.

#### CK-19-04 — Soak 100 floor lifecycle transitions

- **Depends on:** `CK-19-03`, `CK-13-11`, `CK-15-08`
- **Owns:** `tests/e2e/campaign-soak.spec.ts`; `tools/campaign-soak.mjs`; matching tests and `progress/CK-19-04.md`.
- **Build:** Exercise generation/load, real damage death events, reward/gate/descent commands, periodic save/reload across 1–100 with labeled accelerated fixtures.
- **Accept:** No skip while boss alive, duplicate reward or floor 101; victory durable; resources remain bounded.
- **Evidence:** 100-floor integrity report; accelerated setup explicitly not a balance/playthrough claim.

#### CK-19-05 — Record representative legitimate play and boss fights

- **Depends on:** `CK-19-04`
- **Owns:** `docs/playtest.md`; `docs/evidence/CK-19-05/`; matching tests and `progress/CK-19-05.md`.
- **Build:** Play normal-input early slice and selected 10/25/50/75/99/100 combat, test every class and final phases; assign isolated fixes.
- **Accept:** Required moves/loot/healing usable; tells and difficulty judged with recorded gear; shortcuts marked; no unsupported full-100 playthrough claim.
- **Evidence:** Bounded play record, screenshots and specific defect tasks.

#### CK-19-06 — Check browser/resilience/storage matrix

- **Depends on:** `CK-19-05`, `CK-17-09`
- **Owns:** `docs/compatibility.md`; `tests/e2e/resilience.spec.ts`; matching tests and `progress/CK-19-06.md`.
- **Build:** Verify cloud Chromium and available desktop targets, resize/blur/context loss/storage denial/corrupt save/reload/new/abandon flows.
- **Accept:** Actual tested browsers listed; Safari or real hardware unavailable remains unverified; no silent lost campaign.
- **Evidence:** Compatibility matrix and regressions.

#### CK-19-07 — Write player guide and reproducible release build notes

- **Depends on:** `CK-19-06`
- **Owns:** `README.md`; `docs/player-guide.md`; `docs/release.md`; matching tests and `progress/CK-19-07.md`.
- **Build:** Document actual controls/classes/loot/retry/save policy, cloud commands, production build and known limits.
- **Accept:** Fresh workflow matches scripts; release assets contain no diagnostic cheat globals or runtime third-party service calls.
- **Evidence:** Reviewed guide and production smoke results.

#### CK-19-08 — Audit all tasks and campaign definition of done

- **Depends on:** `CK-19-07`, `CK-00-10`, `CK-05-10`, `CK-17-02`
- **Owns:** `docs/completion.md`; matching tests and `progress/CK-19-08.md`.
- **Build:** Reconcile accepted handoffs, checks and open defects against this spec; run final verify and summarize release state. Submit the audit for main-agent acceptance; the orchestrator updates CONTEXT.md.
- **Accept:** All required task outcomes accepted or explicitly blocked; no unresolved progression/save/combat defect hidden; no deployment claim without deployment.
- **Evidence:** Final verified report and next distribution decision.

## Appendix A. Concrete implementation defaults

These tables are planner-authored starting values. Implement them as data and tune from measured playtests; the builder does not need to invent a parallel design. All seconds convert to fixed ticks with a documented rounding rule. A percentage modifier is relative unless specified. Depth multipliers apply once to reference damage/HP. Rarity/affix values are rolled once into the item instance.

### A.1 Floors, movement, damage and rewards

- Region tier `t = floor((floorNumber - 1) / 10)`; base grid side `36 + 4t`, capped at 80. Base rooms `min(18, 7 + floor((floorNumber - 1)/8))`; fallback may use fewer rooms while preserving required content.
- Normal room interior 5–12 cells wide/deep; safe entry minimum 5×5; boss arena minimum 10×10 clear interior. Large boss clearance may expand it. Corridors at least two cells. At least 20% of noncritical room graph edges may form loops when geometry permits.
- Initial normalized floor threat budget `8 + 0.28d + 3t`, rounded down. Allocate at least two regular combat rooms when the room budget permits; reserve safe entry/arena first. Elite costs multiply archetype cost by 1.5 per trait; boss/summon budgets are separate.
- Knockback at most 1.2 m per hit and wall-clamped. Player stagger at most 0.2 s, with 0.75 s retrigger immunity; shock has its separate longer cooldown.
- Sword guard frontal half-angle 65°, reduces blockable direct physical damage by 70%; costs 14 stamina per blocked hit and 4/s while held. Parry costs 8 stamina, negates eligible melee hit and staggers attacker for 0.4 s. Axe guard reduces by 60%, costs 22/hit and 5/s, no parry. Zero stamina immediately ends guard. Elemental area/DoT is not guardable.
- Bow full-draw damage = base damage; minimum draw damage 35% and speed 50% of full. Full draw uses class base duration; no arrow fired before 0.12 s. Arrow lifespan 4 s; gravity 9.8 m/s². Base projectile collider radius 0.04 m.
- Sword charged damage = light base × `(1.4 + 0.8 × chargeFraction)`, cost = light cost ×1.8; charge fraction spans threshold→full charge. Axe charged damage = primary base × `(1.5 + chargeFraction)`, cost ×1.6. Charged recovery ×1.25. Daggers third strike ×1.35, rear bonus ×1.5, combo expires after 0.75 s inactivity.
- Staff secondary cone length 3 m, angle 70°, damage 1.6× bolt, mana 1.8× bolt cost, channel 0.6 s and recovery 0.65 s. Ember applies burn; frost chill; storm shock on supported status-cooldown rules.
- XP: ordinary kills `round(8 × threatCost × (1 + 0.02d))`; boss `100 + 10 × floorNumber`; summoned creatures grant no XP/dust/item drops. Award IDs are persistent and unique.
- Regular kill source: 15% weapon/equipment roll, 25% resource pack, 60% no item. Resource pack chooses 60% tonic / 40% eight arrows, subject to useful-player resources and source isolation. Boss: one Rare-or-better usable weapon choice plus dust and one tonic. Ordinary chest: one item plus eight arrows or a tonic; at least one accessible non-secret tonic source per floor.
- Ground overflow: keep boss/Mythic/Relic rewards in a reachable floor reward cache at entry/exit; merge consumable stacks; replace lowest-value uncollected Worn regular drop only if the newcomer is more valuable. Never delete a transferred or boss reward invisibly.
- Safe shop stock: two item offers, at least two tonic purchases and three eight-arrow packs. Tonic price `max(1, 2+t)` dust; arrow pack `max(1, 1+t)`; item price from rarity/depth. Salvage dust `max(1, ceil((1+t) × rarityFactor))`, factors 1/2/4/7/12. An item can upgrade to current ten-floor tier at most once per tier, for `5 × (nextTier+1)` dust; derive upgraded base stats from original base/depth plus 8% per legal upgrade tier, not repeated multiplication of current stats. Preserve affixes/UID.
- First entry kit: Worn Watchblade, Worn Shortbow, 20 arrows, three tonics, no armor/charm, zero dust. Starter Watchblade carries a persistent bound flag and cannot be salvaged/dropped. Non-equipped starter bow exists only when its completed class is available in the intermediate slice; full game starts with both.

### A.2 Weapon bases

Damage below is reference direct damage at depth 1 before rarity/roll/perks. Melee timings are windup/recovery after accepted attack; draw/channel anticipation is separate. All variants keep their class contract. The two distinguishing columns are genuine mechanics.

| Class / stable base ID | Damage | Reach or full projectile speed | Primary timings | Cost | Additional distinction |
| --- | --- | --- | --- | --- | --- |
| Sword / watchblade | 18 | 2.0 m | 0.12 / 0.30 s | 8 stamina | 90° arc; full charge 1.2 s |
| Sword / needlesword | 14 | 2.2 m | 0.10 / 0.24 s | 6 stamina | 55° arc; full charge 0.9 s |
| Sword / broadsteel | 22 | 1.9 m | 0.16 / 0.40 s | 11 stamina | 120° arc; full charge 1.3 s |
| Sword / longfang | 20 | 2.5 m | 0.18 / 0.38 s | 10 stamina | 70° arc; full charge 1.4 s |
| Sword / wardfoil | 15 | 1.8 m | 0.11 / 0.27 s | 7 stamina | Guard hit cost ×0.8; 80° arc |
| Sword / oathcleaver | 25 | 2.1 m | 0.20 / 0.48 s | 13 stamina | Posture damage ×1.25; charge 1.5 s |
| Bow / shortbow | 24 | 22 m/s | draw 0.8 / recover 0.35 s | 1 arrow | 3° base spread |
| Bow / longbow | 34 | 30 m/s | draw 1.2 / recover 0.50 s | 1 arrow | 1.5° spread |
| Bow / recurved | 27 | 26 m/s | draw 0.9 / recover 0.30 s | 1 arrow | 2° spread |
| Bow / siegewood | 42 | 28 m/s | draw 1.5 / recover 0.70 s | 1 arrow | Posture ×1.5; ADS walk ×0.6 |
| Bow / swiftstring | 18 | 20 m/s | draw 0.55 / recover 0.22 s | 1 arrow | 4° spread |
| Bow / glasslimb | 30 | 34 m/s | draw 1.0 / recover 0.45 s | 1 arrow | 1° spread; less ballistic drop through speed |
| Axe / handaxe | 26 | 2.0 m | 0.22 / 0.48 s | 15 stamina | 110° cleave; charge 1.0 s |
| Axe / executioner | 42 | 2.4 m | 0.40 / 0.75 s | 24 stamina | 80° cleave; charge 1.6 s |
| Axe / splitmaul | 36 | 2.2 m | 0.35 / 0.65 s | 22 stamina | Posture ×1.7; charge 1.4 s |
| Axe / crescent | 31 | 2.3 m | 0.28 / 0.55 s | 18 stamina | 140° cleave; charge 1.2 s |
| Axe / rusthook | 29 | 2.5 m | 0.30 / 0.60 s | 17 stamina | 95° cleave; charge 1.1 s |
| Axe / ironbite | 34 | 1.9 m | 0.25 / 0.58 s | 19 stamina | Posture ×1.4; charge 1.3 s |
| Daggers / twinshivs | 9 | 1.4 m | 0.05 / 0.16 s | 4 stamina | Combo third ×1.35 |
| Daggers / dirks | 12 | 1.6 m | 0.08 / 0.22 s | 5 stamina | Rear bonus ×1.6 |
| Daggers / fangpair | 10 | 1.3 m | 0.05 / 0.18 s | 4 stamina | Rear bonus ×1.75 |
| Daggers / hookknives | 11 | 1.5 m | 0.07 / 0.20 s | 5 stamina | Posture ×1.2 |
| Daggers / needlepair | 8 | 1.7 m | 0.06 / 0.15 s | 3 stamina | Narrower 40° arcs |
| Daggers / duskedges | 13 | 1.4 m | 0.10 / 0.25 s | 6 stamina | Combo third ×1.5 |
| Staff / emberrod | 20 | 18 m/s | recover 0.40 s | 9 mana | Ember; burst length 3.2 m |
| Staff / frostbranch | 17 | 22 m/s | recover 0.42 s | 8 mana | Frost; cone 80° |
| Staff / stormspire | 19 | 26 m/s | recover 0.38 s | 10 mana | Storm; cone 60° |
| Staff / ashwand | 14 | 24 m/s | recover 0.28 s | 6 mana | Ember; burst damage ×1.4 |
| Staff / rimecrook | 24 | 16 m/s | recover 0.60 s | 12 mana | Frost; cone length 3.6 m |
| Staff / coilcane | 16 | 30 m/s | recover 0.32 s | 8 mana | Storm; burst cost ×1.6 |

Default ADS FOV multiplier 0.72, mouse sensitivity multiplier 0.65, movement multiplier 0.70; draw alone movement multiplier 0.85, combined use the stronger slowdown rather than compounding. Dagger evasive stance costs 18 stamina, lasts 0.16 s, cooldown 1.1 s, and shares evasion retrigger lock with dash.

Armor bases: quiltcoat (armor 8), ringvest (14), scalejacket (20), platedmantle (26, movement −3%), wardrobe (10, mana +8), stoneharness (32, movement −5%). Charms: bloodseal (HP +12), wellspark (mana +10), fleetknot (stamina +10), ashward (ember resist +12%), rimeseal (frost resist +12%), coilward (storm resist +12%). Armor values use a modest `1 + 0.01d` depth multiplier rather than weapon power, then the shared reduction cap.

### A.3 Affix IDs, ranges and compatibility

All normal values roll in the shown interval. “Physical classes” means sword/axe/daggers/bow. A handler may ignore a capped excess value only after reporting effective stats accurately; never show an affix that does nothing by class incompatibility.

| ID / display name | Effect | Compatibility/exclusion |
| --- | --- | --- |
| keen / Keen | +3–8 percentage points crit chance | Weapons; cap 35% |
| ruinous / Ruinous | +0.10–0.25 crit multiplier | Weapons; cap 2.5 |
| forceful / Forceful | +8–18% direct physical damage | Physical classes |
| focused / Focused | +8–18% elemental damage | Staff; excludes forceful |
| fleet / Fleet | −5–12% recovery | Weapons; recovery floor 0.10 s |
| patient / Patient | +10–22% full charged/draw damage | Sword/axe/bow/staff burst |
| quickdraw / Quickdraw | −8–18% full draw duration | Bow; full draw ≥0.35 s |
| deepdraw / Deepdraw | +10–25% full-draw velocity | Bow |
| farreach / Farreach | +5–12% melee reach | Sword/axe/daggers; reach ≤3 m |
| steady / Steady | −6–15% attack resource cost | Stamina/mana weapons; cost ≥1 |
| cinder / Cinder | Burn payload with 5–12% hit-damage DPS | Weapons; excludes rime/charged |
| rime / Rime | Chill payload 15–25% | Weapons; excludes cinder/charged |
| charged / Charged | Shock attempt on hit | Weapons; excludes cinder/rime; target cooldown |
| serrated / Serrated | Bleed payload 5–12% hit-damage DPS | Melee physical |
| oppressive / Oppressive | Weaken 10–18% on heavy/fully drawn hit | Sword/axe/bow/staff |
| rupturing / Rupturing | +15–35% posture damage | Sword/axe/daggers/bow |
| braced / Braced | −10–22% guard hit cost | Sword/axe |
| precise / Precise | −15–35% bow spread | Bow; never negative spread |
| decisive / Decisive | +8–20% rear positional bonus | Daggers |
| conserving / Conserving | 8–15% arrow refund on valid target hit | Bow; one refund attempt/shot |
| restorative / Restorative | 1–3 stamina or mana on eligible hit | Stamina/mana weapons; once/attack; retain ≥1 net cost |
| enduring / Enduring | +8–18 max stamina | Armor/charm |
| fortified / Fortified | +8–20 armor | Armor/charm |
| warded / Warded | +6–15 percentage points one element resist | Armor/charm; single chosen element |

Signatures: `sword.followthrough`, `bow.piercer`, `axe.shockwave`, `daggers.finisher`, `staff.conductor`. They are Mythic class behaviors, not normal affix entries. Follow-through damage 25% of charged hit; piercing loses 30% damage per enemy penetration and stops after two penetrations; shockwave 30% charged hit at 3 m max; finisher refunds 25% of total combo stamina capped at 4; conductor links at most two extra targets within 4 m, 50%/25% original damage. Triggered effects cannot trigger other signature/chain effects recursively.

Statuses: burn/bleed lasts 3 s, maximum two stacks, DoT derived from committed direct damage after modifiers without crit reroll. Chill lasts 2 s and caps at 30%. Shock stagger 0.12 s with 1.5 s target immunity. Weaken lasts 3 s and caps at 20%. Refresh replaces duration with max(old,new); DoT stacks retain their source IDs. Player death clears statuses on retry through checkpoint restoration.

### A.4 Enemy reference values and unlocks

| Archetype | Earliest floor | HP | Hit damage | Speed | Threat cost | Tell/recovery | Important behavior limits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stalker | 1 | 30 | 9 | 2.4 m/s | 1 | 0.45 / 0.65 s | 1.7 m melee reach |
| Brute | 1 | 70 | 18 | 1.7 m/s | 3 | 0.90 / 1.10 s | 2.2 m cleave; stagger vulnerability |
| Archer | 8 | 26 | 8 | 2.2 m/s | 2 | 0.65 / 1.0 s | Prefer 6–10 m; projectile 18 m/s |
| Hexer | 18 | 24 | 11 | 1.9 m/s | 3 | 0.90 / 1.2 s | Mark radius 1.3 m; range 8 m |
| Skirmisher | 25 | 22 | 7 | 2.8 m/s | 2 | 0.40 / 0.65 s | Dash ≤2 m; cooldown ≥2 s |
| Bulwark | 35 | 55 | 12 | 1.6 m/s | 3 | 0.75 / 1.0 s | Posture 35×H(d); rear guard bypass |
| Summoner | 55 | 38 | 6 | 1.8 m/s | 4 | summon 1.1 / 2.0 s | Two minions/wave; four live; cooldown 8 s |
| Burrower | 75 | 34 | 12 | 2.1 m/s | 3 | emerge 0.7 / 1.0 s | Relocate ≤6 m; hidden ≤1 s; cooldown 5 s |

Elite traits unlock at 20: sturdy (+25% HP), swift (+10% movement, not reduced tell), elemental (one compatible payload), relentless (−10% recovery respecting floors), warded (one 20% resist), volatile (marked death burst after 0.8 s, no recursive death chains). At most two traits; sturdy/warded count separately; swift/relentless together unavailable before floor 60. No elemental heal, summon recursion, or permanent invulnerability.

Rig families: wrapped husk, plated sentinel, segmented crawler, robed effigy, fused construct, spectral remnant. Family-to-archetype compatibility is explicit: crawler permits stalker/skirmisher/burrower; plated permits brute/bulwark; robed permits hexer/summoner/archer; construct permits brute/bulwark/archer/hexer; spectral permits stalker/hexer/skirmisher; husk permits stalker/brute/archer/summoner. Spectral is a visual style and remains grid-grounded.

### A.5 Boss kits and move reference values

Regular region boss reference HP 350×H(d)×kit HP factor; attack reference damage 18×D(d)×move factor. Regular phase transition at 50% HP; capstones at 70%/35%. Bosses use at least two selected moves before floor 20, at least three thereafter. Cooldown between committed attacks at least 0.75 s; phase transition tell 1 s, no damage during transition.

| Kit | HP factor | Available moves | Capstone/phase distinction |
| --- | --- | --- | --- |
| Cairn Warden | 1.0 | Sweep, slam, charge | Alternating double marked slams, each with its own tell |
| Briar Matron | 0.95 | Slam, summon, barrage | Thorn lanes plus finite stalker waves |
| Bellkeeper | 1.0 | Wave, barrage, charge | Staggered frost rings with safe wedge |
| Furnace Marshal | 1.1 | Charge, slam, barrage | Ember lanes that expire before new saturation |
| Ivory Bailiff | 1.2 | Wave, charge, anchors | Two reachable shield anchors and exposed recovery |
| Prism Seer | 0.9 | Barrage, wave, anchors | Alternating marked diagonals; no literal mirror physics |
| Coil Regent | 1.0 | Charge, barrage, slam | Shock lanes respecting target immunity |
| Dirge Abbot | 1.05 | Summon, wave, barrage | Minion priority windows; never more than 12 boss summons |
| Ashen Colossus | 1.3 | Slam, charge, anchors | Wide heavy slams with long tells and clear edge escape |
| Crown champion (91–99) | 1.25 | Wave, slam, barrage, summon | Three-move weighted subset plus bounded elite traits |
| Crypt Sovereign (100 only) | 900/350 | Wave, slam, charge, barrage, summon, final warning | Three phases, distinct visual form, five or more total moves |

Move defaults: wave length 6 m, 90° arc, tell 0.8 s, factor 1.0; slam radius 2.5 m, tell 1.0 s, factor 1.4; charge max 8 m, tell 1.0 s, factor 1.2; barrage 6–12 projectiles, tell 0.9 s, projectile factor 0.65; summons tell 1.2 s, max four per wave and twelve live; anchors max three, target HP 25×H(d), must be damageable by any class, shield reduction at most 90%.

Final-warning move starts only in final phase: 1.5 s marked arena pattern with at least two radius-1.5 m safe zones connected to current player region, then factor-1.8 hit outside safety. No instant global unmarked damage. The final arena must be validated against largest warning/charge/summon pattern.

### A.6 Room and optional-objective recipes

Six reusable dressing/geometry patterns per region: perimeter niches/open center; offset pillar lanes; two-cover crossfire room; looped sarcophagus aisles; split-cover dueling room; visible hazard alcoves around safe transit. Apply region-specific props/palette and legal encounters to yield sixty defined template combinations, rather than sixty unrelated generator algorithms. Reserved path and arena clearances always win over decoration.

Secrets: switch-in-niche opens a visible hinted side door; paired inscription interaction opens optional alcove. Puzzle 1: repeat a visible 3–5 symbol ordered clue, wrong order resets progress only. Puzzle 2: three binary levers toggle shown lights; derive target from a generated valid solution so solvability is guaranteed, allow unlimited resets. Use distinct symbol shapes and labels.

Shrines choose between two explained finite effects, e.g. restore 25% HP versus grant a tonic, or trade 15% current HP for a Rare item. Never kill the player with a trade; no permanent irreversible movement deficit; each shrine ID commits once. Lore discoveries are short original region fragments recorded in a journal/map panel and save state; no cinematic/narrative engine required.


## Appendix B. Dependency graph and ready-task selection

This index is generated from the task cards. **Round** is the longest prerequisite chain plus one, assuming instant reviews; it is not an estimate of calendar duration or permission to run all tasks in a round together. Shared file ownership still requires serialization. The graph has no missing dependencies or cycles. The final gate depends, directly or transitively, on every other task.

A task is ready only when all listed prerequisites have accepted handoffs, relevant interfaces still match, and owned files are available. For “next task”, choose the first ready ID in document order. If a requested task is blocked, report its specific unaccepted prerequisite; don't silently build an unrelated milestone. Fixes inside the requested task are authorized, but unrelated prerequisites require the owner's broader instruction.

| Task | Title | Depends on | Earliest round |
| --- | --- | --- | --- |
| CK-00-01 | Audit the existing cloud scaffold | — | 1 |
| CK-00-02 | Create the application shell | CK-00-01 | 2 |
| CK-00-03 | Implement renderer resource lifecycle | CK-00-02 | 3 |
| CK-00-04 | Implement fixed-step clock | CK-00-01 | 2 |
| CK-00-05 | Implement seeded random streams and stable IDs | CK-00-01 | 2 |
| CK-00-06 | Implement semantic input sampling | CK-00-01 | 2 |
| CK-00-07 | Implement typed event collection | CK-00-04 | 3 |
| CK-00-08 | Create browser harness and diagnostic boundary | CK-00-02, CK-00-03 | 4 |
| CK-00-09 | Create combined verification command | CK-00-08 | 5 |
| CK-00-10 | Add CI verification workflow | CK-00-09 | 6 |
| CK-01-01 | Define floor grid and coordinate queries | CK-00-05 | 3 |
| CK-01-02 | Place seeded non-overlapping rooms | CK-01-01 | 4 |
| CK-01-03 | Connect room graph and carve corridors | CK-01-02 | 5 |
| CK-01-04 | Assign entry, arena and exit roles | CK-01-03 | 6 |
| CK-01-05 | Validate, retry and provide safe fallback | CK-01-04 | 7 |
| CK-01-06 | Generate base pixel materials | CK-00-03, CK-00-05 | 4 |
| CK-01-07 | Render occupancy and room markers | CK-01-05, CK-01-06 | 8 |
| CK-01-08 | Wire floor generation into app lifecycle | CK-01-07, CK-00-04, CK-00-07 | 9 |
| CK-02-01 | Define player resources and safe spawn state | CK-01-05 | 8 |
| CK-02-02 | Implement normalized planar locomotion | CK-02-01, CK-00-06 | 9 |
| CK-02-03 | Implement swept circle/grid collision | CK-02-02, CK-01-01 | 10 |
| CK-02-04 | Implement mouse look and pointer capture | CK-00-06, CK-00-02 | 3 |
| CK-02-05 | Connect player controller and camera | CK-02-03, CK-02-04, CK-01-08 | 11 |
| CK-02-06 | Add sprint and delayed resource regeneration | CK-02-05 | 12 |
| CK-02-07 | Add collision-safe dash | CK-02-06 | 13 |
| CK-02-08 | Implement pause and focus-loss session behavior | CK-02-05, CK-02-07 | 14 |
| CK-03-01 | Implement damage resolution and death deduplication | CK-02-01, CK-00-07 | 9 |
| CK-03-02 | Implement melee arc and line-of-sight queries | CK-03-01, CK-01-01 | 10 |
| CK-03-03 | Define weapon state/attack adapter contract | CK-00-06, CK-03-01 | 10 |
| CK-03-04 | Implement sword tap attack timing | CK-03-03 | 11 |
| CK-03-05 | Implement sword charge and interruption | CK-03-04 | 12 |
| CK-03-06 | Create sword viewmodel and attack animation | CK-03-05, CK-00-03 | 13 |
| CK-03-07 | Add complete training-target diagnostic fixture | CK-03-02, CK-01-08 | 11 |
| CK-03-08 | Add resource HUD, reticle and damage feedback | CK-02-01, CK-03-01 | 10 |
| CK-03-09 | Integrate sword combat through actual input | CK-03-06, CK-03-07, CK-03-08, CK-02-08 | 15 |
| CK-04-01 | Define enemy blueprints and runtime records | CK-03-01, CK-00-05 | 10 |
| CK-04-02 | Implement radius-aware A* paths | CK-01-05 | 8 |
| CK-04-03 | Implement perception and attack opportunity | CK-04-01, CK-03-02 | 11 |
| CK-04-04 | Implement stalker tell/attack/recovery machine | CK-04-03 | 12 |
| CK-04-05 | Implement brute heavy melee machine | CK-04-04 | 13 |
| CK-04-06 | Implement steering and enemy collision | CK-04-02, CK-04-04, CK-02-03 | 13 |
| CK-04-07 | Generate original melee creature rigs | CK-04-01, CK-01-06 | 11 |
| CK-04-08 | Integrate enemy updates and combat rendering | CK-04-05, CK-04-06, CK-04-07, CK-03-09 | 16 |
| CK-04-09 | Populate reproducible initial floor encounters | CK-04-08, CK-01-05 | 17 |
| CK-05-01 | Implement campaign progression reducer | CK-00-05, CK-03-01 | 10 |
| CK-05-02 | Implement arena entrance and gate collision | CK-01-04, CK-02-03 | 11 |
| CK-05-03 | Generate initial Cairn Warden boss blueprint | CK-04-01, CK-05-02 | 12 |
| CK-05-04 | Implement initial boss two-move controller | CK-05-03, CK-04-05 | 14 |
| CK-05-05 | Integrate arena/boss combat and boss HUD | CK-05-04, CK-04-09, CK-03-08 | 18 |
| CK-05-06 | Implement reachable descent interaction | CK-05-01, CK-05-05 | 19 |
| CK-05-07 | Integrate floor unload and descent loading | CK-05-06, CK-01-08 | 20 |
| CK-05-08 | Implement in-memory floor checkpoint and death retry | CK-05-07, CK-02-08 | 21 |
| CK-05-09 | Present terminal victory and simultaneous-death result | CK-05-01, CK-05-05 | 19 |
| CK-05-10 | Verify the three-floor playable vertical slice | CK-05-08, CK-05-09, CK-05-07 | 22 |
| CK-06-01 | Define ten regions and 100 depth profiles | CK-01-05, CK-05-01 | 11 |
| CK-06-02 | Implement looped and split-wing layouts | CK-01-05, CK-06-01 | 12 |
| CK-06-03 | Implement courtyard and irregular-cavern layouts | CK-06-02 | 13 |
| CK-06-04 | Apply region materials, fog and lighting | CK-06-01, CK-01-06 | 12 |
| CK-06-05 | Place non-blocking room props | CK-06-03, CK-01-04 | 14 |
| CK-06-06 | Implement constrained depth encounter budgets | CK-06-01, CK-04-09 | 18 |
| CK-06-07 | Integrate region/layout/depth selection | CK-06-04, CK-06-05, CK-06-06, CK-05-07 | 21 |
| CK-06-08 | Sweep reachability and generation termination | CK-06-07 | 22 |
| CK-06-09 | Show floor/region and loading progress | CK-06-07, CK-03-08 | 22 |
| CK-07-01 | Define constrained archetype/rig/trait catalog | CK-04-01, CK-06-01 | 12 |
| CK-07-02 | Implement archer spacing and fire behavior | CK-07-01, CK-04-06, CK-09-02 | 14 |
| CK-07-03 | Implement hexer marked elemental areas | CK-07-01, CK-10-01, CK-03-01 | 13 |
| CK-07-04 | Implement skirmisher flank and dash | CK-07-01, CK-04-06 | 14 |
| CK-07-05 | Implement bulwark posture and directional guard | CK-07-01, CK-03-01 | 13 |
| CK-07-06 | Implement finite summoner waves | CK-07-01, CK-04-06 | 14 |
| CK-07-07 | Implement marked burrower relocation | CK-07-01, CK-04-06 | 14 |
| CK-07-08 | Generate elite/stat/element variations | CK-07-01, CK-06-06, CK-10-01 | 19 |
| CK-07-09 | Expand creature rigs with ground silhouettes | CK-07-01, CK-04-07 | 13 |
| CK-07-10 | Expand creature rigs with caster/spectral silhouettes | CK-07-09 | 14 |
| CK-07-11 | Integrate full roster and elite tell rendering | CK-07-02, CK-07-03, CK-07-04, CK-07-05, CK-07-06, CK-07-07, CK-07-08, CK-07-10, CK-04-08, CK-09-07 | 23 |
| CK-07-12 | Integrate region roster and encounter safety | CK-07-11, CK-06-08 | 24 |
| CK-08-01 | Define item instances and class/base schemas | CK-00-05, CK-03-03 | 11 |
| CK-08-02 | Author thirty mechanically distinct weapon bases | CK-08-01 | 12 |
| CK-08-03 | Implement rarity and depth stat rolls | CK-08-02, CK-06-01 | 13 |
| CK-08-04 | Define affix compatibility and selection | CK-08-03 | 14 |
| CK-08-05 | Implement backpack/stack atomic transfers | CK-08-01 | 12 |
| CK-08-06 | Implement equipment slots and quick-switch model | CK-08-05, CK-03-03 | 13 |
| CK-08-07 | Implement source drops and once-only boss rewards | CK-08-04, CK-05-05 | 19 |
| CK-08-08 | Implement chests and reachable pickups | CK-08-07, CK-08-05, CK-05-06 | 20 |
| CK-08-09 | Implement inventory list and equip UI | CK-08-06, CK-08-08, CK-02-08 | 21 |
| CK-08-10 | Implement item comparison and sorting | CK-08-09 | 22 |
| CK-08-11 | Integrate loot economy into combat floors | CK-08-10, CK-11-19, CK-04-09, CK-08-13 | 25 |
| CK-08-12 | Validate procedural item variety and fairness | CK-08-11, CK-14-02 | 26 |
| CK-08-13 | Place deterministic treasure and resource guarantees | CK-08-08, CK-06-07 | 22 |
| CK-09-01 | Implement swept projectile motion | CK-03-02, CK-00-04 | 11 |
| CK-09-02 | Implement projectile impact/team routing | CK-09-01, CK-03-01 | 12 |
| CK-09-03 | Implement bow draw and release state machine | CK-03-03, CK-08-02 | 13 |
| CK-09-04 | Implement ADS and class movement modifiers | CK-09-03, CK-02-05 | 14 |
| CK-09-05 | Render bow draw and interpolated ADS camera | CK-09-04, CK-03-06 | 15 |
| CK-09-06 | Render arrows and recoverable world impacts | CK-09-02, CK-09-05, CK-08-08 | 21 |
| CK-09-07 | Integrate bow resource/attack/UI flow | CK-09-06, CK-09-03, CK-08-06, CK-03-09 | 22 |
| CK-09-08 | Verify actual bow button combinations | CK-09-07, CK-02-08 | 23 |
| CK-10-01 | Implement shared bounded status engine | CK-03-01, CK-00-04 | 10 |
| CK-10-02 | Implement armor/resistance/critical pipeline | CK-10-01, CK-08-01 | 12 |
| CK-10-03 | Implement sword guard and timely parry | CK-03-05, CK-10-02, CK-02-06 | 13 |
| CK-10-04 | Implement interrupted healing consumable | CK-08-05, CK-10-02 | 13 |
| CK-10-05 | Implement XP and rank progression | CK-04-08, CK-05-05 | 19 |
| CK-10-06 | Implement perk choices and stat derivation | CK-10-05, CK-10-02 | 20 |
| CK-10-07 | Integrate defense/status/heal/progression HUD | CK-10-03, CK-10-04, CK-10-06, CK-03-08 | 21 |
| CK-10-08 | Verify survival and anti-exploit transitions | CK-10-07 | 22 |
| CK-11-01 | Implement axe cleave and charged overhead logic | CK-03-03, CK-07-05, CK-08-02, CK-10-02 | 14 |
| CK-11-02 | Create axe viewmodel and event-driven feedback | CK-11-01, CK-03-06 | 15 |
| CK-11-03 | Implement dagger alternating combo and backstab | CK-03-03, CK-08-02, CK-10-02 | 13 |
| CK-11-04 | Implement dagger evasive secondary | CK-11-03, CK-02-07 | 14 |
| CK-11-05 | Create dagger twin viewmodels | CK-11-04, CK-03-06 | 15 |
| CK-11-06 | Implement elemental staff bolt casting | CK-03-03, CK-09-02, CK-10-01, CK-08-02 | 13 |
| CK-11-07 | Implement staff channel burst secondary | CK-11-06, CK-03-02 | 14 |
| CK-11-08 | Create staff viewmodel and elemental vocabulary | CK-11-07, CK-03-06 | 15 |
| CK-11-09 | Apply regular stat/timing affix modifiers | CK-08-04, CK-10-02 | 15 |
| CK-11-10 | Apply status and bounded on-hit affix payloads | CK-11-09, CK-10-01, CK-09-02 | 16 |
| CK-11-11 | Implement sword follow-through signature | CK-11-10, CK-03-05 | 17 |
| CK-11-12 | Implement bow piercing signature | CK-11-10, CK-09-07 | 23 |
| CK-11-13 | Implement axe shockwave signature | CK-11-10, CK-11-01 | 17 |
| CK-11-14 | Implement dagger finisher refund signature | CK-11-10, CK-11-04 | 17 |
| CK-11-15 | Implement staff bounded chain signature | CK-11-10, CK-11-07 | 17 |
| CK-11-16 | Integrate axe and directional guard | CK-11-02, CK-11-13, CK-08-06, CK-10-03 | 18 |
| CK-11-17 | Integrate daggers and evasive stance | CK-11-05, CK-11-14, CK-11-16 | 19 |
| CK-11-18 | Integrate staff and elemental selection | CK-11-08, CK-11-15, CK-11-17 | 20 |
| CK-11-19 | Integrate signatures and verify all-class switching | CK-11-11, CK-11-12, CK-11-18, CK-09-08 | 24 |
| CK-12-01 | Define boss kit and phase scheduler contracts | CK-05-04, CK-06-01, CK-07-01 | 15 |
| CK-12-02 | Implement frontal wave and marked slam primitives | CK-12-01, CK-07-03 | 16 |
| CK-12-03 | Implement collision-aware charge primitive | CK-12-01, CK-04-06 | 16 |
| CK-12-04 | Implement marked barrage primitive | CK-12-01, CK-09-02 | 16 |
| CK-12-05 | Implement finite boss summon waves | CK-12-01, CK-07-06 | 16 |
| CK-12-06 | Implement damageable shield anchors | CK-12-01, CK-03-02 | 16 |
| CK-12-07 | Author Vaults and Warrens boss kits | CK-12-02, CK-12-03, CK-12-05 | 17 |
| CK-12-08 | Author Reliquary and Foundry boss kits | CK-12-02, CK-12-04 | 17 |
| CK-12-09 | Author Ossuary and Mirror boss kits | CK-12-04, CK-12-06 | 17 |
| CK-12-10 | Author Storm and Choir boss kits | CK-12-04, CK-12-05 | 17 |
| CK-12-11 | Author Blackglass and Crown champion kits | CK-12-03, CK-12-06 | 17 |
| CK-12-12 | Implement final Sovereign three-phase kit | CK-12-07, CK-12-08, CK-12-09, CK-12-10, CK-12-11 | 18 |
| CK-12-13 | Render boss variants, tell markers and anchors | CK-12-12, CK-07-10, CK-05-05 | 19 |
| CK-12-14 | Integrate boss generation, rewards and campaign boundary | CK-12-13, CK-08-11, CK-05-09 | 26 |
| CK-12-15 | Sweep all bosses and arena solvability | CK-12-14, CK-06-08 | 27 |
| CK-13-01 | Serialize player/inventory snapshot DTO | CK-08-11, CK-10-08, CK-00-05 | 26 |
| CK-13-02 | Serialize floor/enemy/boss runtime DTO | CK-12-15, CK-07-12, CK-05-08 | 28 |
| CK-13-03 | Validate complete save envelope and versions | CK-13-01, CK-13-02 | 29 |
| CK-13-04 | Restore runtime without regeneration drift | CK-13-03, CK-05-07 | 30 |
| CK-13-05 | Implement transactional IndexedDB slot storage | CK-13-03 | 30 |
| CK-13-06 | Implement save scheduling and lifecycle triggers | CK-13-04, CK-13-05 | 31 |
| CK-13-07 | Integrate durable retry and completed campaigns | CK-13-06, CK-05-08, CK-05-09 | 32 |
| CK-13-08 | Implement campaign continue and explicit abandon | CK-13-07 | 33 |
| CK-13-09 | Implement bounded save import/export | CK-13-03, CK-13-08 | 34 |
| CK-13-10 | Handle denied/quota/corrupt storage gracefully | CK-13-09 | 35 |
| CK-13-11 | Verify long-lived save/resume and anti-duplication | CK-13-10 | 36 |
| CK-14-01 | Author armor/charm bases and legal affixes | CK-08-01, CK-11-10 | 17 |
| CK-14-02 | Integrate equipped armor/charm stat effects | CK-14-01, CK-10-06, CK-08-09 | 22 |
| CK-14-03 | Implement atomic salvage and dust ledger | CK-14-02, CK-08-05 | 23 |
| CK-14-04 | Generate safe-room shop placement and stock | CK-14-03, CK-06-07 | 24 |
| CK-14-05 | Implement purchase and bounded item upgrades | CK-14-04 | 25 |
| CK-14-06 | Persist economy and equipment transactions | CK-14-05, CK-13-11 | 37 |
| CK-14-07 | Verify ammunition/healing availability and choice | CK-14-06, CK-08-12 | 38 |
| CK-15-01 | Implement explored-cell fog and minimap model | CK-06-07, CK-02-05 | 22 |
| CK-15-02 | Create region room-template vocabulary | CK-06-05 | 15 |
| CK-15-03 | Implement pressure/blade trap state machine | CK-15-02, CK-10-01 | 16 |
| CK-15-04 | Implement dart traps and elemental patches | CK-15-03, CK-09-02 | 17 |
| CK-15-05 | Implement optional secret-room interactions | CK-15-02, CK-08-08 | 21 |
| CK-15-06 | Implement sigil-order and lever puzzles | CK-15-05 | 22 |
| CK-15-07 | Implement two-choice shrines and lore | CK-15-06, CK-10-06 | 23 |
| CK-15-08 | Integrate exploration state and persistence | CK-15-01, CK-15-04, CK-15-07, CK-13-11 | 37 |
| CK-16-01 | Implement title/new-campaign and seed flow | CK-13-08, CK-06-09 | 34 |
| CK-16-02 | Complete pause/restart/save-to-title flows | CK-16-01, CK-13-10, CK-02-08 | 36 |
| CK-16-03 | Implement persisted display/control settings | CK-16-02 | 37 |
| CK-16-04 | Implement named-action key rebinding | CK-16-03, CK-00-06 | 38 |
| CK-16-05 | Implement help and keyboard-accessible panels | CK-16-04, CK-11-19 | 39 |
| CK-16-06 | Recover from pointer/audio/storage limitations | CK-16-05, CK-13-10 | 40 |
| CK-16-07 | Handle WebGL context loss and resize restoration | CK-16-06, CK-00-03 | 41 |
| CK-16-08 | Verify screens and reduced-motion readability | CK-16-07 | 42 |
| CK-17-01 | Refine dungeon texture detail and seams | CK-06-04, CK-15-02 | 16 |
| CK-17-02 | Generate item icons and rarity vocabulary | CK-14-02, CK-08-10 | 23 |
| CK-17-03 | Refine enemy rig animation and reactions | CK-07-11, CK-17-01 | 24 |
| CK-17-04 | Implement capped attack/impact particles | CK-11-19, CK-17-03 | 25 |
| CK-17-05 | Implement synthesized audio engine and gesture start | CK-00-07, CK-16-06 | 41 |
| CK-17-06 | Add class attack and impact sound cues | CK-17-05, CK-11-19 | 42 |
| CK-17-07 | Add enemy/boss positional warning cues | CK-17-06, CK-12-14 | 43 |
| CK-17-08 | Add region ambience and restrained music layers | CK-17-07, CK-06-01 | 44 |
| CK-17-09 | Integrate audio settings and complete visual review | CK-17-04, CK-17-08, CK-16-08 | 45 |
| CK-18-01 | Instrument simulation, draw and resource metrics | CK-17-09, CK-15-08 | 46 |
| CK-18-02 | Budget AI/path work without changing outcomes | CK-18-01, CK-07-12 | 47 |
| CK-18-03 | Batch dungeon props/materials and cull safely | CK-18-01, CK-17-01 | 47 |
| CK-18-04 | Move or slice generation if measured stalls require it | CK-18-01, CK-06-08 | 47 |
| CK-18-05 | Prove disposal over repeated floor cycles | CK-18-02, CK-18-03, CK-18-04 | 48 |
| CK-18-06 | Tune quality settings and browser fallback | CK-18-05, CK-16-03 | 49 |
| CK-18-07 | Report real-hardware and cloud budget results | CK-18-06 | 50 |
| CK-19-01 | Run full generation and enemy legality sweep | CK-18-07, CK-12-15 | 51 |
| CK-19-02 | Measure loot/encounter/player scaling | CK-19-01, CK-14-07, CK-10-08 | 52 |
| CK-19-03 | Verify five-class browser combat regressions | CK-19-02, CK-11-19, CK-16-08 | 53 |
| CK-19-04 | Soak 100 floor lifecycle transitions | CK-19-03, CK-13-11, CK-15-08 | 54 |
| CK-19-05 | Record representative legitimate play and boss fights | CK-19-04 | 55 |
| CK-19-06 | Check browser/resilience/storage matrix | CK-19-05, CK-17-09 | 56 |
| CK-19-07 | Write player guide and reproducible release build notes | CK-19-06 | 57 |
| CK-19-08 | Audit all tasks and campaign definition of done | CK-19-07, CK-00-10, CK-05-10, CK-17-02 | 58 |

### B.1 Example task launch

Owner: **“Start CK-03-05.”**

The orchestrator reads this context/spec and accepted CK-03-04 handoff, checks sword interfaces and file availability, then assigns Luna only sword charge/interruption logic and its tests. After the builder submits its handoff, the orchestrator spawns a separate Luna reviewer for threshold/cancellation/resource behavior. Confirmed findings go to the builder or a new Luna fixer, and the reviewer verifies repairs. Repeat with a fresh reviewer only as needed, up to three rounds total. On a clean accepted result, the orchestrator records the outcome and round count in CONTEXT.md and reports it. Unresolved issues after round 3 remain unaccepted. This does not launch all remaining combat work.

Owner: **“Start the next task.”** Initially this selects CK-00-01. Once accepted, ready modules may be independent, but the normal workflow still launches one requested task at a time. The owner's later request can authorize a milestone or parallel disjoint tasks.

### B.2 Regression fixes and changing requirements

Use a fix ID such as `CK-09-08.fix-01`, with the affected task as prerequisite, owned files, reproduction, regression case and handoff. If an accepted task's behavior is invalidated, mark that task and affected milestone as changes requested until the fix is accepted. Do not renumber existing IDs. A new owner requirement first gets an orchestrator-authored design/dependency update, then implementation tasks.

## Appendix C. Requirement coverage

| Required outcome | Design sections | Implementing/verification tasks |
| --- | --- | --- |
| Pixelated first-person art | 2, 7.2 | CK-01-06/07, CK-06-04, CK-17-01/03/04 |
| WASD and full mouse turning | 1.3, 3.2–3.4 | CK-02-02/03/04/05/08, CK-16-04 |
| 100 seeded traversable levels | 4, A.1/A.6 | CK-01-02/03/04/05, CK-06-01/02/03/07/08, CK-19-01 |
| Procedural varied enemies | 5.4, A.4 | CK-04-01/09, CK-07-01/08/09/10/11/12 |
| Boss on every level / locked passage | 1.1, 6.1, A.5 | CK-05-01/02/05/06/07, CK-12-01 through CK-12-15 |
| Increasing difficulty / toughest level 100 | 4.3, A.1/A.4/A.5 | CK-06-01/06, CK-07-08/12, CK-12-12/15, CK-19-02 |
| Final boss ends campaign | 3.5, 7.1 | CK-05-01/09, CK-12-12/14/15, CK-13-07/11, CK-19-04 |
| Procedural varied loot | 6.2, A.2/A.3 | CK-08-01 through CK-08-13, CK-11-09 through CK-11-15, CK-14-01 |
| Sword normal and charged attacks | 5.2, A.1/A.2 | CK-03-04/05/06/09, CK-10-03, CK-19-03 |
| Bow right-click ADS / left-release shot | 5.2, A.1/A.2 | CK-09-01 through CK-09-08, CK-19-03 |
| Distinct axe/dagger/staff classes | 5.2, A.2 | CK-11-01 through CK-11-08, CK-11-16 through CK-11-19 |
| Health/healing/status/defense/progression | 5.1/5.3, A.1/A.3 | CK-02-01/06/07, CK-10-01 through CK-10-08 |
| Inventory/equipment/economy | 6.2/6.3 | CK-08-05/06/08/09/10/11, CK-14-01 through CK-14-07 |
| Optional exploration mechanics | 6.3, A.6 | CK-15-01 through CK-15-08 |
| Save/resume, death, checkpoint and victory | 7.1 | CK-05-08/09, CK-13-01 through CK-13-11, CK-14-06, CK-15-08 |
| Menus/settings/accessibility/resilience | 7.3 | CK-16-01 through CK-16-08, CK-19-06 |
| Original audio/art and bounded performance | 2, 7.2 | CK-17-01 through CK-17-09, CK-18-01 through CK-18-07 |
| Cloud workflow and Luna delegation | 0, 2 | CK-00-01/08/09/10; every task handoff; orchestrator CONTEXT updates |

## Appendix D. Risks, decisions, and completion

### D.1 Risks and response

| Risk | Planned response |
| --- | --- |
| A small builder changes too much | Narrow owned files; explicit contracts; split task before broad rewrite; main-agent review. |
| Procedural output creates a softlock | Actual occupancy/clearance validation, bounded retries, complete fallback, final 6,400-floor sweep. |
| Variety is only cosmetic | Eight AI roles, five weapon contracts, multiple geometry grammars, ten boss kits and real affix handlers. |
| Gear scales faster/slower than encounters | Independent depth curves, class/resource reports and representative actual combat; data changes with regression checks. |
| Save/retry duplicates drops or loses work | Atomic ledger transactions, checkpoint rollback, strict DTOs/versioning and browser reload tests. |
| Renderer masks broken simulation | Pure simulation checks plus real-input browser cases; diagnostic acceleration explicitly labeled. |
| Pixel effects hide threats | Distinct silhouettes, reserved warnings, capped effects, reduced-motion/low-quality review. |
| Cloud render performance differs from player hardware | Separate cloud correctness/CPU results from recorded real-device FPS; state unsupported measurements honestly. |
| Architecture drifts between Luna tasks | Accepted interface handoffs, composition-root integration tasks and bounded fix IDs. |
| Long plan becomes mistaken for completed work | SPEC remains requirements; CONTEXT/handoffs record accepted reality, not generated checkmarks. |

### D.2 Confirmed decisions and tunable details

The existing browser stack is retained. The owner approved single-player desktop play, five classes, ten regions, floor-entry checkpoint retry, pixel-textured 3D presentation, 3–6 minute ordinary floors/approximately 5–10 hour campaign pacing, and one baseline commit followed by one commit per accepted task. Browser saves precede `.save` transfer. Cloudflare Pages is the intended host. Deployment timing, public release and any native/mobile/gamepad expansion remain separate later requests. Rank/perk/economy numbers, difficulty curves, loot weights and other detailed content values are tuned from playtests. Changing a confirmed choice requires recording the new owner direction and updating affected design sections/cards/coverage.

### D.3 Definition of done

- All required tasks have accepted evidence and independent Luna review under REVIEW.md, with no unresolved confirmed in-scope defects or unverified required checks.
- New campaign and Continue work; WASD/mouse look, five weapon classes, loot/equipment and enemy/boss fights are playable.
- Generated floors are reproducible, navigable, varied and correctly themed through all 100 depths.
- Difficulty rises through the campaign; the floor-100 encounter budget/final boss represent its peak.
- Each boss guards the descent; rewards are once-only; final boss death ends the game and never loads floor 101.
- Death/retry, active saves, checkpoints and victory restoration obey the documented rules under normal storage, with honest failures under denied storage.
- Player-facing screens, help, settings, audio/art, readability and resource/performance claims match measured behavior.
- Required verification passes, selected screenshots are inspected, representative real play is recorded, and unverified platforms/hardware are named.
- The repo has reproducible cloud install/start/build/check commands and an honest completion report.

A production build alone is not completion. This specification is not a claim that the game already exists. Implementation begins only when the owner requests a task or milestone. **First task: CK-00-01.**
