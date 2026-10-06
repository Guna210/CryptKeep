# Starting a CryptKeep cloud task

The repository uses TypeScript, Three.js, Vite, Vitest, and Playwright Test. It includes a rendered low-resolution 3D preview with shell and renderer lifecycle browser checks. Gameplay systems are still being implemented in staged tasks.

For a new task:

1. Read `CONTEXT.md`, `SPEC.md` Section 0, `REVIEW.md`, the assigned task card and its accepted prerequisite handoffs/review reports. Respect the coordinator/Luna task boundaries; the specification does not itself authorize implementation. A request to start a task or milestone authorizes that scoped work and its independent Luna review/repair workflow (maximum three rounds per task).
2. Use the existing `/workspace/CryptKeep` checkout. Cloud tasks already have isolated environments; do not create a Git worktree unless the owner explicitly requests one. Run `cd /workspace/CryptKeep` before repository commands.
3. Dependencies may already be present in the prepared cloud snapshot; check rather than assuming every new environment is ready. If `node_modules` is missing, run `bash /workspace/CryptKeep/tools/cloud-install.sh`; it uses `npm ci` and keeps npm's cache in `/workspace/.cache/cryptkeep/npm`.
4. Run `npm run verify:environment` to validate the installed toolchain. This checks generated temporary fixtures, not game behavior. On 2026-10-06, CK-00-01 measured Node.js `v24.19.0`, npm `11.9.0`, and system Chromium `151.0.7922.173`; `npm ls --depth=0` and the package-lock top-level versions matched all eight declared packages. Dependencies were already installed, so no install was needed.
5. Start `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` to serve the preview. Run `npm run build`, `npm run typecheck`, and `npm run test:e2e` for the current app workflow. `npm test` exits with “No test files found” until a task adds Vitest tests.

Verify server readiness with `curl -fsS http://127.0.0.1:5173/`; the Playwright suite starts Vite automatically. Browser checks cover shell compatibility, visible Three.js output, responsive low-resolution buffers, and renderer resource cleanup. An HTTP response or preview screenshot does not establish that gameplay works.

The world renderer exclusively owns the WebGL2 context passed to it and retires that context when disposed. A later renderer instance must use a fresh canvas and WebGL2 context; the renderer leaves canvas DOM ownership with the application shell.

The environment check uses the preinstalled `/usr/bin/chromium`. To select another compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its path. No Playwright browser download is required.

When invoking `exec_command` through the sandbox, environment/browser checks, Vite development servers and Git network calls require `sandbox_permissions: "with_additional_permissions"` with `additional_permissions: { network: { enabled: true } }`. This enables the local-server binding used by the smoke check as well as authorized network access. Without it, the observed default command failed with `listen EPERM` on loopback; the network-enabled run passed. Preserve inherited cloud proxy/CA settings and destination policy.

CK-00-01 ran `npm run verify:environment` with the network-enabled sandbox grant. All five generated-fixture checks passed. Those results establish toolchain operation only. CK-00-02 adds the initial shell and browser checks; these establish shell behavior, not gameplay.

The current 3D scene is a diagnostic preview only: no generated dungeon, player controls, simulation, or playable game is implemented yet. The environment check removes its temporary fixture after execution. See [../CONTEXT.md](../CONTEXT.md), [../progress/CK-00-01.md](../progress/CK-00-01.md), [../progress/CK-00-02.md](../progress/CK-00-02.md), and [../progress/CK-00-03.md](../progress/CK-00-03.md) for live task status and evidence.
