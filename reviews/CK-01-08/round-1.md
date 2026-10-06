# CK-01-08 independent review — round 1

**Verdict: CHANGES REQUIRED.** The frozen manifest matches the reviewed files. The ordinary verification suite passes, but event subscriber exceptions can corrupt the session’s resource ownership and prevent disposal; app teardown also misses cleanup paths.

## Findings

### CK-01-08-R1-F01 — A throwing ready subscriber disposes the committed material library

**Reproduction:** Construct a `FloorSession`, subscribe a callback that throws, and call `load("seed")`. `EventCollector.flush()` deliberately reports callback failures as `AggregateError` after delivering to subscribers. In `load`, the new library and floor have already been assigned as current and the old floor has been disposed before `session-ready` is dispatched ([floor-session.ts](/workspace/CryptKeep/src/app/floor-session.ts:85)). The thrown error enters the load catch, which then disposes `pendingLibrary` even though it is now the session’s committed library ([floor-session.ts](/workspace/CryptKeep/src/app/floor-session.ts:101)).

**Expected:** Once the replacement is committed, callback failure must not dispose resources still borrowed by the active floor or make a successful load look like a failed generation. Ready notification should remain once per session lifetime.

**Actual:** `load` rejects while `snapshot()` still reports the new rendered floor; its material library has been disposed, and `readyEmitted` remains false. A retry can dispatch `session-ready` again. The UI catches this as `GENERATION FAILED` despite the replacement being visible.

**Repair guidance:** Separate pre-commit rollback from post-commit notification errors. Only dispose resources that remain pending. Ensure lifecycle delivery cannot change a committed load’s success or ownership state, and mark the ready event as emitted consistently.

### CK-01-08-R1-F02 — A throwing disposed subscriber aborts resource and subscriber cleanup

**Reproduction:** Subscribe a callback that throws and call `dispose()`. `dispose` dispatches `session-disposed` before releasing the floor, material library, subscriptions, and collector ([floor-session.ts](/workspace/CryptKeep/src/app/floor-session.ts:156)). Dispatch propagates the collector’s `AggregateError`, so the later cleanup statements do not run.

**Expected:** Disposal remains idempotent and releases owned resources and subscriptions even when event delivery fails. A reporting error may be surfaced after cleanup.

**Actual:** The session is marked internally disposed, but the rendered floor and library remain allocated and the collector/subscription set remains uncleared. A second `dispose()` returns immediately, so cleanup cannot be retried. In the app, this exception also interrupts `teardown` before renderer disposal, diagnostics removal, and browser-listener removal ([main.ts](/workspace/CryptKeep/src/main.ts:31)).

**Repair guidance:** Put owned-resource and listener cleanup on an exception-safe path, and report delivery errors only after cleanup completes. Make app teardown similarly resilient to session disposal errors.

### CK-01-08-R1-F03 — Pagehide cleanup is absent on unsupported startup and leaves the form listener attached on supported startup

**Reproduction:** In the unsupported WebGL path, diagnostics are installed before capability branching ([main.ts](/workspace/CryptKeep/src/main.ts:18)); pagehide handling is only registered inside `if (shell.context)` ([main.ts](/workspace/CryptKeep/src/main.ts:47)). Dispatching pagehide after unsupported startup therefore leaves `window.__cryptkeepDiagnostics` installed. In the supported path, the anonymous form submit listener is attached at [main.ts](/workspace/CryptKeep/src/main.ts:76), but teardown removes only document/window listeners and does not remove that form listener or dispose the shell.

**Expected:** Pagehide removes owned app listeners and the development API regardless of WebGL support, as well as the form submit listener after supported startup.

**Actual:** Unsupported startup retains the development global after pagehide. Supported startup retains the form callback on the shell DOM after pagehide. The callback currently checks `stopped` indirectly through its nested generator, so it does not revive generation, but the listener and its captured app state remain attached.

**Repair guidance:** Install one idempotent teardown path independent of WebGL initialization; retain and remove the form listener, remove the diagnostics API, and dispose the shell as part of teardown.

## Verification and evidence

- Independently ran `npm run verify` with network-enabled execution: typecheck passed; unit/tooling passed (14 Vitest files, 71 tests, plus 7 verification-runner tests); production build passed; browser suite passed (9/9). Bundle output was 584.41 kB minified (149.84 kB gzip), with the existing >500 kB advisory.
- The ungranted sandbox attempt could not start the browser web servers; the network-enabled run completed all stages successfully.
- Reproduced F01 and F02 with a temporary in-memory Vite-loaded harness (no repository test/source edits): a throwing subscriber made `load` reject with `AggregateError` while `currentFloors` remained 1 and the library dispose count became 1; then `dispose` threw `AggregateError` while the floor dispose count stayed 0 and lifecycle stayed `ready`. Vite emitted a denied optional websocket-listener warning in this restricted environment, but module loading and the harness completed.
- Browser evidence logged two distinct seeds and floor counts (seed A hash `fnv1a:51e76751`, 1,348 instances; seed B hash `fnv1a:37c28319`, 1,366 instances). The floor E2E exercised 25 replacement cycles with one canvas and one active floor; renderer tests recorded native resource counts and cleanup. These tests do not exercise throwing `FloorSession` subscribers or unsupported-mode pagehide cleanup.
- Before browser tests, saved the committed `preview.png` to `/tmp/ck0108-review/preview-before.png` (SHA-256 `ea522fa086f6905175a05819526f1598067748cbc2d694a2a8b5d9bfa64167e6`). The suite regenerated it (SHA-256 `793556f583cd21a8f6ca3d480abb190f583ac5e60fcbc691cc6eb0d4f1885256`). I inspected both: floor coverage and marker visibility are comparable; the regenerated status label is brighter amber. Restored the original byte-for-byte; its original hash now matches.
- Visual review: map fits the view, ceiling is absent, panel text is legible, and the four legend labels are readable. Marker dots are small at the saved 1280×800 preview scale. No FPS or GPU-performance claim was measured.
- Full frozen manifest is embedded below. All 14 listed hashes matched before and after review.

## Frozen manifest

```json
{
  "src/app/floor-session.ts": "0fb589fa9b52a5fa7322b8cd1859ba3de1bddd448987f6ca7c41ec037582dfb7",
  "src/app/floor-session.test.ts": "ce1942c14ada4d343f6e2dd9eec165e4e4517a4ab6eac3ebfc1e0bdb39bad211",
  "src/main.ts": "929115ba25b432f88799e58ff21f095e143881240f0783a09939d5f09b73c018",
  "src/app/shell.ts": "a723bd7a470f6b1fa29ed76916ed00a1fa5689fe98562d376236252b3fa7a687",
  "src/ui/shell.css": "4294bf1d718dbb5b33a96cf70efcadcdd0b6d3a9380683f6c3df7e8cf2890cd4",
  "src/debug/index.ts": "375fb7ec56be4a5ec358e68c540d5191f9643af40e71521e23165b3bc4fdbb55",
  "tests/harness/browser.ts": "5fec10d7f4834744066e718cd998c15b8c1fd324d23bea319f267f8283207a75",
  "tests/e2e/floor.spec.ts": "c915174a64b18ca93dfe8835c33fc78bee38679c60d8dd7bc945ae9268038fe2",
  "tests/e2e/shell.spec.ts": "97f423a4ef11a7cc18ccf0181602fffda3f92ab277accf4e985d1df8c9c91a74",
  "tests/e2e/production.spec.ts": "4eab3e18b61e19978f9f0c00bf77cd3b2b991ef735c00b9b0ab7855974f262ad",
  "README.md": "02af0043e9b80aad3e976bb8918308309a3c33073bffa3bb880d7fb7c29a7ea4",
  "docs/environment-start.md": "b6a968478b784811c23e4f28954231d4c2227827ccc7986189e11e05b8e90990",
  "docs/evidence/CK-01-08/preview.png": "ea522fa086f6905175a05819526f1598067748cbc2d694a2a8b5d9bfa64167e6",
  "progress/CK-01-08.md": "2f5686245cb91dce90ef541345fcd855a97d5793ae890327d985c96adcfaf110"
}
```
