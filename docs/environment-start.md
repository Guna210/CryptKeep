# Starting a CryptKeep cloud task

The repository uses TypeScript, Three.js, Vite, Vitest, and Playwright Test. The current checkout contains project context and environment tooling only; the game application, app entry point, unit tests, and E2E tests have not been created.

For a new task:

1. Read `CONTEXT.md`, `SPEC.md` Section 0, `REVIEW.md`, the assigned task card and its accepted prerequisite handoffs/review reports. Respect the coordinator/Luna task boundaries; the specification does not itself authorize implementation. A request to start a task or milestone authorizes that scoped work and its independent Luna review/repair workflow (maximum three rounds per task).
2. Use the existing `/workspace/CryptKeep` checkout. Cloud tasks already have isolated environments; do not create a Git worktree unless the owner explicitly requests one. Run `cd /workspace/CryptKeep` before repository commands.
3. Dependencies may already be present in the prepared cloud snapshot; check rather than assuming every new environment is ready. If `node_modules` is missing, run `bash /workspace/CryptKeep/tools/cloud-install.sh`; it uses `npm ci` and keeps npm's cache in `/workspace/.cache/cryptkeep/npm`.
4. Run `npm run verify:environment` to validate the installed toolchain. This checks generated temporary fixtures, not game behavior.
5. Start `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` only after a real app entry point exists. The current repository has no `index.html` or application source, so the reserved `dev`, `build`, `typecheck`, and `test` commands are not yet game workflow checks.

Once an app exists, verify server readiness from another shell with `curl -fsS http://127.0.0.1:5173/` and the app's documented browser smoke check. That check should assert real app content and report browser failures; an HTTP response alone does not establish that the game works. Do not leave a development server running for the current empty app checkout. `npm run test:e2e` is reserved for future tests in `tests/e2e` and currently has no test files to run.

The environment check uses the preinstalled `/usr/bin/chromium`. To select another compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its path. No Playwright browser download is required.

When invoking `exec_command` through the sandbox, environment/browser checks, Vite development servers and Git network calls require `sandbox_permissions: "with_additional_permissions"` with `additional_permissions: { network: { enabled: true } }`. This enables the local-server binding used by the smoke check as well as authorized network access. Without it, the observed default command failed with `listen EPERM` on loopback; the network-enabled run passed. Preserve inherited cloud proxy/CA settings and destination policy.

Pre-compaction verification on 2026-10-06 passed all five `verify:environment` checks: TypeScript compile, two generated Vitest tests, Vite fixture build, HTTP serving and Chromium/Three.js pixel readback. This is recorded environment evidence only. All 196 implementation tasks remain unaccepted; CK-00-01 is the first ready task and must still follow the builder/independent-review workflow.
