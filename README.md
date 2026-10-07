# CryptKeep

CryptKeep is a browser-based first-person dungeon crawler under development, built with TypeScript, Three.js, and Vite. The current slice generates a seeded dungeon and supports first-person movement, sprint, dash, pause/resume, sword attacks, shared stamina, and combat feedback. Procedural enemies and campaign progression remain planned.

## Implementation plan

[SPEC.md](SPEC.md) defines the complete 100-level game and 196 small implementation tasks across 20 milestones. Each task includes dependencies, file ownership, acceptance checks and evidence requirements. [CONTEXT.md](CONTEXT.md) records live progress and recovery information. M00–M03 are complete:35 of196 task cards are independently reviewed and published, including first-person movement, sword combat and feedback. See [CONTEXT.md](CONTEXT.md) for accepted-task evidence, hosted verification and the next task.

Approved direction: single-player desktop browser, pixel-textured 3D rooms/creatures, five weapon classes, ten regions and floor-entry checkpoint retry. Target ordinary floors at 3–6 minutes and the full campaign at approximately 5–10 hours, to be tested and tuned. Git checkpoints use one baseline commit followed by one commit per accepted task; every accepted task is pushed, including trivial, documentation and tooling work.

## Cloud setup

Use the existing `/workspace/CryptKeep` checkout in Codex Cloud. Run:

```sh
bash tools/cloud-install.sh
```

The script installs the exact versions recorded in `package-lock.json` with `npm ci`, stores npm's cache in `/workspace/.cache/cryptkeep/npm`, then validates TypeScript/Three.js, Vitest, Vite production build and server startup, and a real Three.js WebGL render in the preinstalled Chromium. The temporary fixture lives under the ignored `.cache/` directory.

To repeat only the setup validation, run `npm run verify:environment`. See [docs/environment-start.md](docs/environment-start.md) for task startup instructions.

## Application commands

Run `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` in the cloud environment and open its forwarded port. The app generates floor 1; enter a seed and choose **Generate dungeon** to create another layout. Choose **Explore dungeon** once to capture the mouse, then use WASD to walk, Left Shift to sprint, Space for a directional dash, and the mouse to look. Sprint consumes stamina only while moving; a dash costs 25 stamina, travels up to 2.2 m, and has a 0.8 second cooldown. Stamina and mana regenerate after their idle delays. Escape, window blur, a hidden page, or lost mouse capture pauses the simulation and opens an accessible **Resume** panel. Choose **Resume** with a click, Enter, or Space to request native mouse capture again; play resumes only after capture succeeds. Focus or visibility returning never resumes automatically. Movement uses generated floor walls and the player has a 1.6 m eye height. Use the development training room to fight a practice target; generated enemies and the remaining campaign systems are planned.

`npm run dev` serves the current playable slice. In development, the clearly labeled **DEV TRAINING** controls load a hand-built room with one pixel-textured practice target; normal generated floors remain empty of enemies until the enemy milestone. Left click taps for a light sword attack; holding and releasing charges a heavier attack. Both use the player's stamina, and the HUD shows resources, charge, hit feedback, and incoming-damage feedback. Escape, blur, a hidden page, or lost mouse capture pauses play and cancels pending charge. `npm run verify` runs typecheck, the unit suite, production build, and browser checks in order, stopping with a failing exit on the first failed stage and printing a short status for each. `npm test` also runs real child-process tests for verifier ordering and failure handling. `npm run build` builds the app, while `npm run test:e2e` builds again before running development and production browser checks against fresh `dist/`, so the combined verification intentionally repeats the build. Development exposes read-only `window.__cryptkeepDiagnostics.snapshot()` readiness, renderer, floor, player and combat snapshots; returned snapshots are detached and immutable, and production has no diagnostic global or training controls. The sword integration tests exercise trusted browser mouse input in the real development app. `npm run verify:environment` runs generated fixtures only and must not be reported as real-app or gameplay verification. Local/cloud Playwright uses the configured Chromium binary and launch flags; CI installs Chromium into its ephemeral runner and resolves its executable path from `playwright-core`. See [docs/environment-start.md](docs/environment-start.md) for CI setup and its evidence limits.

## Runtime and storage notes

The game is intended for the browser, with Cloudflare Pages as the planned host; cloud setup does not publish it. Campaigns initially save locally through planned IndexedDB storage; later `.save` download/import reuses the same versioned campaign format. Save behavior is specified but not implemented or tested yet, and no game data is currently saved. Fresh-browser offline loading remains a separate delivery decision.

Dependencies, builds, and browser checks should stay in the cloud to limit local disk use. Installed dependencies can be retained in a published cloud environment snapshot, but running processes do not survive a new task and must be started again when needed.

## Platform

- Node.js 24.19.0 or later and npm 11.9.0 or later. The CK-00-01 audit measured Node.js 24.19.0 and npm 11.9.0.
- TypeScript 7.0.2
- Three.js 0.186.1
- Vite 8.3.3
- Vitest 5.0.3
- Playwright Test/Core 1.63.0, using system Chromium (default `/usr/bin/chromium`; CK-00-01 measured Chromium 151.0.7922.173)

The CK-00-01 environment verification passed five generated-fixture checks. These establish toolchain operation only; no game source or gameplay behavior was tested. See [docs/environment-start.md](docs/environment-start.md) and [progress/CK-00-01.md](progress/CK-00-01.md) for the measured baseline and outcomes.
