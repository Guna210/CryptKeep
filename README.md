# CryptKeep

CryptKeep is a browser-based first-person dungeon crawler under development, built with TypeScript, Three.js, and Vite. The app currently renders a low-resolution 3D dungeon preview and reports WebGL 2 compatibility; gameplay systems are being added in task-sized stages.

## Implementation plan

[SPEC.md](SPEC.md) defines the complete 100-level game and 196 small implementation tasks across 20 milestones. Each task includes dependencies, file ownership, acceptance checks and evidence requirements. [CONTEXT.md](CONTEXT.md) records live progress and recovery information. The first milestone M00 is complete: CK-00-01 through CK-00-10 are independently reviewed and published. See [progress/CK-00-10.md](progress/CK-00-10.md) for the successful hosted verification run and [CONTEXT.md](CONTEXT.md) for task progress.

Approved direction: single-player desktop browser, pixel-textured 3D rooms/creatures, five weapon classes, ten regions and floor-entry checkpoint retry. Target ordinary floors at 3–6 minutes and the full campaign at approximately 5–10 hours, to be tested and tuned. Git checkpoints use one baseline commit followed by one commit per accepted task; every accepted task is pushed, including trivial, documentation and tooling work.

## Cloud setup

Use the existing `/workspace/CryptKeep` checkout in Codex Cloud. Run:

```sh
bash tools/cloud-install.sh
```

The script installs the exact versions recorded in `package-lock.json` with `npm ci`, stores npm's cache in `/workspace/.cache/cryptkeep/npm`, then validates TypeScript/Three.js, Vitest, Vite production build and server startup, and a real Three.js WebGL render in the preinstalled Chromium. The temporary fixture lives under the ignored `.cache/` directory.

To repeat only the setup validation, run `npm run verify:environment`. See [docs/environment-start.md](docs/environment-start.md) for task startup instructions.

## Application commands

`npm run dev` serves the current preview. `npm run verify` runs typecheck, the unit suite, production build, and browser checks in order, stopping with a failing exit on the first failed stage and printing a short status for each. The unit suite covers clock, RNG, input, events, and IDs; `npm test` also runs real child-process tests for verifier ordering and failure handling. `npm run build` builds the app, while `npm run test:e2e` builds again before running development shell/renderer checks and a production-preview smoke test against fresh `dist/`, so the combined verification intentionally repeats the build. The shared browser harness listens for page errors and `console.error` before navigation, waits for readiness, and reports captured failures. Development exposes read-only `window.__cryptkeepDiagnostics.snapshot()` readiness and renderer counts; returned snapshots are detached and immutable, and production has no diagnostic global. The preview is not playable gameplay. `npm run verify:environment` runs generated fixtures only and must not be reported as real-app or gameplay verification. Local/cloud Playwright uses the configured Chromium binary and launch flags; CI installs Chromium into its ephemeral runner and resolves its executable path from `playwright-core`. See [docs/environment-start.md](docs/environment-start.md) for CI setup and its evidence limits.

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
