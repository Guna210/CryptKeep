# CK-02-05 — Round 1 repaired-snapshot verification

**Task:** CK-02-05, connect the player controller and camera
**Reviewer/model/agent:** independent reviewer `/root/ck_02_05_reviewer_r1`, GPT-6 Luna
**Builder/fixer:** `/root/ck_02_05_builder`, one coordinated round-one repair pass
**Verdict:** **PASS**

## Snapshot identity

Reviewed the repaired submission against `/tmp/cryptkeep-CK-02-05-repaired-r1.json`. Every current path hash matches the recorded value:

- `src/app/player-session.ts` — `e7740cebb72d7bd534b561a91eb9e21cdec817f27820f5895c42b29bde29ac51`
- `src/app/pointer-capture.ts` — `449916c0cdfc40835e3e105a294a42942fd099b637acabfe85e823a2cc04f17b`
- `src/app/shell.ts` — `f3e2eec8ca21a3771d3d5aca2d1c64531cb6731e8c944bcc28ae45bf1bb4d37d`
- `src/main.ts` — `fc7bfe645c1bdc7de4637e99c478b90f5fff92bc357a95722abc33b8d65d51d6`
- `src/debug/index.ts` — `a948cb4bf345c0e20d2eeda909c54572ebaf6daae97e18f5cb54053059004358`
- `src/ui/shell.css` — `a4811114ddd9b1eee51ef413700220d4c37a8a384fbec6207bbcae390a92d584`
- `tests/e2e/movement.spec.ts` — `21c420980e7f044575a3a61a43fd509128f42064c2a763b85d621a623b651a9d`
- `tests/e2e/floor.spec.ts` — `abefcb67e830201554c199c757781e3219cbb43ac3b5d4ba8d694481735e432d`
- `README.md` — `2938af0c1f45adc7b731a0e0341a719fa4ddb04df8ae05a942056d991aa4a2e9`
- `docs/environment-start.md` — `c4bc5d976b9adf0d6dbe1683020c51a9909c1aa13c738cbcb2e95093f70cc158`
- `docs/evidence/CK-02-05/before.png` — `93653a3d8cb01739b30fc506b78491314a5ec53aab52af72657c7a6bb1f55048`
- `docs/evidence/CK-02-05/after.png` — `07789c488e1a331220bc3cd8fd1be78a0f29ba367a95103045516ec3696a0f25`
- `progress/CK-02-05.md` — `2d95711d91cfa9fef7632f70339e29212d73a86cc692b1059d02ff60f7ce9a74`
- `progress/CK-02-05.round-1-fix.md` — `62e85084d0df2aea32101fd6b5f70bafe16e9dc2b20529b570a7c8e5c31ec32c`

The accepted `src/app/floor-session.ts` remains unchanged at SHA-256 `238faa09ca421da69e11dcf9807acc6b1d5614239e44404fd69f99ecdd7fd9a2`. The original before/after evidence files are byte-identical to the original 13-path submission. `docs/evidence/CK-01-08/preview.png` retains its prior SHA-256 `ea522fa086f6905175a05819526f1598067748cbc2d694a2a8b5d9bfa64167e6`. No temporary probe files remain.

## Review findings

- **CK-02-05-R1-F01 — RESOLVED.** `PlayerSession` now listens for `focusin` on editable targets and invokes the normal cancellation path during capture/request/wait states. The regression test holds W, exposes the seed form while playing, focuses the input, verifies capture becomes idle and the pose remains fixed before keyup. Focus does not auto-resume. This test removes the compact-playing class to expose the normally hidden form; it establishes focus cancellation with a held key, not ordinary user accessibility of that hidden field during play.
- **CK-02-05-R1-F02 — RESOLVED.** Mapped keydown ignores `event.repeat`. The browser test cancels with Escape, uses a fresh native Explore capture, sends a synthetic `repeat: true` W event and verifies no movement, then confirms a fresh real non-repeat W press moves. Cancellation still uses `clearInput` without manufacturing a normal release.
- **CK-02-05-R1-F03 — RESOLVED.** Teardown removes the named Explore click listener; `PlayerSession.dispose()` removes its focus listener. Browser instrumentation observes one listener of each kind during app life, then zero after repeated `pagehide`. Clicking the retained detached Explore button does not reacquire pointer lock or revive diagnostics/DOM. Unsupported-startup cleanup also removes the Explore handler if setup registered it.
- **New findings:** none. The changed controller, main lifecycle wiring, and movement regressions were inspected for input/capture/cancellation regressions. Existing no-focus-autoresume, native capture, generated-wall first-solid-face/full-circle clearance, and zero inward normal-velocity checks remain covered and passed.

## Verification

- `npm run verify` — passed independently: typecheck, 20 Vitest files / 107 tests, 7 Node tooling tests, production build, and 14 Playwright tests across development/production. The build retains the existing advisory for a minified JavaScript chunk above 500 kB.
- `npx playwright test tests/e2e/movement.spec.ts --project=development` — passed 3/3, including movement/camera/stop and pause-resume paths, first generated wall contact, and pagehide listener cleanup.
- `git diff --check` — passed.
- Both selected CK-02-05 screenshots were previously opened and inspected; current bytes match their original manifest hashes. The original M01 screenshot remains unchanged.

## Limits

The `repeat: true` DOM event is synthetic by design; its cancellation and recapture sequence uses native Chromium pointer lock, and fresh movement afterward uses real Playwright keyboard input. The held-W focus test explicitly reveals the compact-hidden seed form to exercise editable-focus handling while movement is held. Only configured Chromium was exercised; hardware rendering performance and other browser engines remain unmeasured.
