# CK-01-08 round 1 repaired-snapshot verification

**Reviewer:** `/root/ck_01_08_reviewer_r1`, GPT-6 Luna (independent reviewer; same reviewer as round 1)
**Task/round:** CK-01-08, round 1 verification after the single coordinated repair
**Builder/fixer:** `/root/ck_01_08_builder`, GPT-6 Luna
**Baseline:** `47a4e2ceba0930230e2b9e451f8b33ea91456b4a`
**Reviewed snapshot:** the 15-file repaired manifest below, verified before and after checks
**Verdict: PASS.** All three round-1 findings are resolved in the frozen snapshot. Required checks passed, the submitted image matches its frozen hash, and no new confirmed in-scope findings were found.

## Finding resolution

- **CK-01-08-R1-F01 — Resolved.** `FloorSession.load` now transfers library/floor ownership only after scene insertion and camera fitting succeed. Still-pending resources are cleaned on pre-commit failures. Post-commit old-floor cleanup and event delivery use isolated cleanup/dispatch paths; the ready flag is set before delivery. The checked-in regression test uses a throwing ready observer and verifies `load` resolves, the shared library remains live across replacement, the observer is not called again for ready, the error is exposed in the snapshot, and floor/library disposal occurs once at final teardown.
- **CK-01-08-R1-F02 — Resolved.** `dispose` catches lifecycle delivery failures, clears owned references, independently attempts floor/library/subscriber/collector cleanup, and sets final state; repeated disposal is safe. Main teardown wraps each owned cleanup step so one failure does not skip later teardown. The regression test uses a throwing disposed observer and asserts floor, library, subscriptions, snapshot state, and repeated disposal.
- **CK-01-08-R1-F03 — Resolved.** The named pagehide handler is registered outside the WebGL branch. Teardown removes the form callback, document/window handlers, diagnostics global, and shell DOM while independently disposing session/world resources. The browser tests dispatch pagehide twice for both supported and unsupported startup; the supported flow counts the submit callback before and after teardown and dispatches on the retained form to check it cannot revive the app.

## Independent checks and evidence

- `node -e '<sha256 check against /tmp/cryptkeep-CK-01-08-r1-verification-manifest.json>'` — all 15 hashes matched before testing and again after testing.
- Temporary Vite-loaded observer harness (no repository edits) — passed for throwing observers on `session-ready`, `session-paused`, `session-resumed`, and `session-disposed`. It received all four events without an escaping error; the ready snapshot remained `ready`, recorded 3 observer errors from ready/pause/resume, retained the library until disposal, then reported `disposed` with zero floors. Floor and library disposers each ran once. Vite printed an optional websocket `listen EPERM` warning under the sandbox; module loading and the harness completed with exit 0.
- `npm run verify` (network-enabled sandbox for browser servers) — passed all stages: typecheck; 14 Vitest files / 73 tests; 7 Node verification-runner tests; production build; and 9/9 Playwright tests across development and production. Existing no-page-error/console-error harness checks passed. The floor browser test exercised different seeds, invalid-input recovery, 25 replacements, one canvas/one active floor, and supported pagehide cleanup. Shell checks exercised resize/draw count, repeated supported and unsupported pagehide, diagnostics removal, and DOM removal. Production diagnostics remained absent, including with a query string.
- Vite reported the existing large-chunk advisory: 585.34 kB minified, 150.07 kB gzip. No FPS/GPU performance claim was measured.
- Inspected the submitted 1280×800 `docs/evidence/CK-01-08/preview.png`: the floor fits the scene, ceiling is absent, controls and legend text are legible, and role markers are visible though small at this scale. The full verification did not rewrite the image; its SHA-256 remained `ea522fa086f6905175a05819526f1598067748cbc2d694a2a8b5d9bfa64167e6`, identical to the frozen manifest and pre-test copy in `/tmp/ck0108-r1-verification/preview.png`.
- Checked repaired implementation, matching unit/browser regressions, repair handoff, task card, review protocol, and accepted prior floor/session/event contracts. No other confirmed in-scope defect was found. Native renderer lifecycle logs showed four contexts created over its explicit repeated-renderer test and zero live contexts after final cleanup; these are test-harness resource counts, not a platform-wide GPU guarantee.

The initial round-1 report remains preserved at [round-1.md](round-1.md). After the code/test/evidence snapshot passed verification, the coordinator corrected only the task handoff wording from in-progress names to the frozen snapshot's `sessionErrors` / `lastSessionError` field names. This is documentation metadata only; I checked the corrected handoff and refreshed manifest, and all 15 hashes match. The full verification was run against the identical source, test, and evidence hashes. I made no implementation, test, evidence, Git, or publication changes; this verification report is the only file I wrote.

## Frozen repaired manifest

```json
{
  "src/app/floor-session.ts": "238faa09ca421da69e11dcf9807acc6b1d5614239e44404fd69f99ecdd7fd9a2",
  "src/app/floor-session.test.ts": "673ffc99341f01474f0497a1a5366704ebc663c91528f95c4e50e9f9e0437757",
  "src/main.ts": "dc697b6d22b9cab0afb0354965278d9b1ff5cbb0ffa4e35ed42443dfd9a94ea0",
  "src/app/shell.ts": "a723bd7a470f6b1fa29ed76916ed00a1fa5689fe98562d376236252b3fa7a687",
  "src/ui/shell.css": "4294bf1d718dbb5b33a96cf70efcadcdd0b6d3a9380683f6c3df7e8cf2890cd4",
  "src/debug/index.ts": "375fb7ec56be4a5ec358e68c540d5191f9643af40e71521e23165b3bc4fdbb55",
  "tests/harness/browser.ts": "5fec10d7f4834744066e718cd998c15b8c1fd324d23bea319f267f8283207a75",
  "tests/e2e/floor.spec.ts": "2befb5740ee674b72629b5129de4def3cdc3b4e50146c2e2f11588b4bd17fb5a",
  "tests/e2e/shell.spec.ts": "9b043715a3500b55aa7214cf654c8734da386594293f143449fe10ccc53dd8e5",
  "tests/e2e/production.spec.ts": "4eab3e18b61e19978f9f0c00bf77cd3b2b991ef735c00b9b0ab7855974f262ad",
  "README.md": "02af0043e9b80aad3e976bb8918308309a3c33073bffa3bb880d7fb7c29a7ea4",
  "docs/environment-start.md": "b6a968478b784811c23e4f28954231d4c2227827ccc7986189e11e05b8e90990",
  "docs/evidence/CK-01-08/preview.png": "ea522fa086f6905175a05819526f1598067748cbc2d694a2a8b5d9bfa64167e6",
  "progress/CK-01-08.md": "541658b0e5f94674ba74c09839bc169b0b0bdda505a785fc803dca7eb6ac0a29",
  "progress/CK-01-08.round-1-fix.md": "7e75347decf265cae70492278c186f00844b68597db16c0291353fd5a7fe00a0"
}
```
