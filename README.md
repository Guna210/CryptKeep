# CryptKeep

CryptKeep is planned as a browser-based first-person dungeon crawler using TypeScript, Three.js, and Vite. The repository is currently in environment setup and planning: there is no game application, playable page, or game test suite yet.

## Implementation plan

[SPEC.md](SPEC.md) defines the complete 100-level game and 196 small implementation tasks across 20 milestones. Each task includes dependencies, file ownership, acceptance checks and evidence requirements. The main agent plans and orchestrates; GPT-6 Luna subagents implement assigned tasks. Separate Luna agents review submissions under [REVIEW.md](REVIEW.md), with at most three review/repair rounds per task. [CONTEXT.md](CONTEXT.md) records current progress and recovery information. For the current audit, review and acceptance status, see [CONTEXT.md](CONTEXT.md) and [progress/CK-00-01.md](progress/CK-00-01.md). No gameplay implementation has started.

Approved direction: single-player desktop browser, pixel-textured 3D rooms/creatures, five weapon classes, ten regions and floor-entry checkpoint retry. Target ordinary floors at 3–6 minutes and the full campaign at approximately 5–10 hours, to be tested and tuned. Git checkpoints use one baseline commit followed by one commit per accepted task; every accepted task is pushed, including trivial, documentation and tooling work.

## Cloud setup

Use the existing `/workspace/CryptKeep` checkout in Codex Cloud. Run:

```sh
bash tools/cloud-install.sh
```

The script installs the exact versions recorded in `package-lock.json` with `npm ci`, stores npm's cache in `/workspace/.cache/cryptkeep/npm`, then validates TypeScript/Three.js, Vitest, Vite production build and server startup, and a real Three.js WebGL render in the preinstalled Chromium. The temporary fixture lives under the ignored `.cache/` directory.

To repeat only the setup validation, run `npm run verify:environment`. See [docs/environment-start.md](docs/environment-start.md) for task startup instructions.

## Future application commands

`npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, and `npm run test:e2e` reserve the usual application workflows. There is no app entry point or game source to serve/build yet; typecheck currently checks the shared tool configuration only. No game unit or E2E tests exist. `verify:environment` runs generated fixtures only and must not be reported as gameplay validation. Playwright Test uses the system Chromium binary and the launch flags validated by the environment check; no browser download is required.

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
