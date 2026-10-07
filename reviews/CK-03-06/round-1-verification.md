# CK-03-06 review — round 1 verification

- **Task:** CK-03-06, Create sword viewmodel and attack animation
- **Stage:** Same-reviewer verification after the coordinated round-one repair
- **Reviewer/model/agent:** `/root/ck_03_06_reviewer_r1` (`gpt-6-luna`)
- **Builder/fixer:** `/root/ck_03_06_builder` (`gpt-6-luna`)
- **Baseline:** `722f61df82993572b39efe186c4084498f92c190`
- **Repaired candidate base:** `badf4651bee917363c1694087489dfddcdf3b0d8`
- **Repaired candidate:** `d897ed9376fe1ec00b93932b66af2bb134095df3` on `codex/cryptkeep-m03-review`
- **Hosted tree:** `641496b16a3d5630d5f557d3649c67863e2e9fa9`
- **Frozen repair manifest:** `/tmp/cryptkeep-CK-03-06-repaired-r1.json`

## Frozen manifest and local verification

The repaired submission manifest hashes match the files inspected. Full SHA-256 manifest:

| File | SHA-256 |
| --- | --- |
| `.github/workflows/verify.yml` | `b6022ac7d3f7744e9308c077e77b7a1af9251ab74b337afc45a64c798d5d4ba5` |
| `src/render/weapons/sword.ts` | `29208e5986c5030cea9c61ce1bb45810943ceb355e1e788b30af60da418c51e7` |
| `src/render/viewmodel.ts` | `a1d8aeb65afceed7cecea14eeb1d34955145601e118572e7cc78eafc5d1c1597` |
| `src/render/viewmodel.test.ts` | `72d63783078eb0dcca328624048c438d885fc8eecda63eb19ae374001227f274` |
| `tests/e2e/viewmodel.spec.ts` | `7db0adc753d40219cc58520d4ad29590db450d394e5d4a92dd1860638dd1db33` |
| `tests/harness/viewmodel-fixture.ts` | `9349df447c60b521bb925215e5f5dca3580578a4617dc186ff18486cf5dec46e` |
| `tests/harness/viewmodel.html` | `89602209191940bcfd341b67e47012591a414c75dbe0f70271332091cc4fca0b` |
| `progress/CK-03-06.md` | `e73cd482b2ca748b8f15fd62a35ae1d2557f3a8c8bbb80a4032012950b72dedc` |
| `progress/CK-03-06.round-1-fix.md` | `86257dfd5256770fe8dbb56ff2f82d1830c41d4505f0e24ec2735ac61e153802` |
| `docs/evidence/CK-03-06/tap.png` | `0866e8dc40bc0ab69571ab1894cd4f9295e40d212b2c3f50c983b8b566d11c48` |
| `docs/evidence/CK-03-06/charge.png` | `e988c916a11f1d755ceba8d9ec13b660b2e731ebc2afb3f212f0e69e780d118f` |

Independent commands on the repaired snapshot:

- `npm run typecheck` — passed.
- `npm test` — passed: 28 Vitest files, 161 tests, plus integrated tooling verification.
- `node --test --test-isolation=none tools/verify.test.mjs` — passed: all seven named cases.
- `npm run build` — passed; existing minified chunk advisory at 614.91 kB.
- `git diff --check` — passed.

## Finding disposition

### CK-03-06-R1-F01 — RESOLVED

The fixture now computes `rootRemoved` as `!renderer.scene.children.includes(model.root)` after calling model disposal twice. This checks the container that owns the corrected scene-attached root and preserves the existing camera-parent and renderer-context assertions. The prior check against `renderer.camera.children` is gone. Independent local checks pass, and hosted run `37591727979` on the exact repaired candidate passed the corrected browser assertion.

## Independent hosted browser verification

I independently checked GitHub run `37591727979`, attempt 1. It is a successful push run on `codex/cryptkeep-m03-review` with `head_sha` exactly `d897ed9376fe1ec00b93932b66af2bb134095df3` and tree `641496b16a3d5630d5f557d3649c67863e2e9fa9`, matching the frozen repaired candidate. Its sole job, `verify` (`112694556308`), completed successfully. Job steps show locked dependency install, Chromium setup, complete verification, and scoped evidence upload succeeded; failure evidence upload was skipped as expected. The job log confirms typecheck passed, all 28 app test files/161 tests passed, tooling verification passed, build passed, all 21 Chromium browser cases passed, and the full verify workflow completed. The pre-repair run `37580926939` is not used as evidence for F01.

Run artifact `11468937378` is named `cryptkeep-m03-37591727979-1`, belongs to the same run/head SHA, and reports digest `sha256:b1eac38396d7903d00e82b2f32c4d1ed786957bc41ec721ddd5d34d7e17ab60c`. The refreshed tap and charge PNGs were opened and inspected. Their SHA-256 hashes match the durable copies in `docs/evidence/CK-03-06/`: tap `0866e8dc40bc0ab69571ab1894cd4f9295e40d212b2c3f50c983b8b566d11c48`; charge `e988c916a11f1d755ceba8d9ec13b660b2e731ebc2afb3f212f0e69e780d118f`. The tap frame shows a clear pixel-textured full sword in the lower-right/center; the charge frame shows a distinct diagonal sword pose and bright blue rune. Both silhouettes are readable and unclipped. The fixture's browser case also passed its corrected scene-root removal, camera-preservation, context-retirement, draw-call, and page/console error assertions. These synthetic-state component captures and hosted Chromium checks do not establish integrated native combat or target-device GPU performance.

The candidate's workflow preserves existing master/PR/manual triggers, read-only contents permission, full verification command and failure evidence. The review-branch extension uploads scoped M03 evidence under the run-and-attempt artifact name with seven-day retention; the hosted artifact identity and upload step match this setup.

## Verdict

**PASS.** F01 is resolved and verified on the exact repaired source. Independent local checks and independent hosted verification all pass. The hosted run executed the corrected browser assertion, and its run head/artifact and inspected screenshot hashes match this repaired submission. No unresolved or new confirmed findings remain in round one. Remaining evidence limits are synthetic-state component rendering in hosted Chromium, without integrated native combat or measured hardware GPU performance claims.
