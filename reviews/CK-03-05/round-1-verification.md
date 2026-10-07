# CK-03-05 — Round 1 repair verification

- **Reviewer:** `/root/ck_03_05_reviewer_r1` (GPT-6 Luna)
- **Builder/fixer:** `/root/ck_03_05_builder`
- **Round:** 1 verification; no additional repair pass performed.
- **Baseline:** `032a4fd49e460d4f920af101d5efa0a3e8a50546`.
- **Repaired snapshot:** `/tmp/cryptkeep-CK-03-05-repaired-r1.json`.
- **Scope inspected:** sword source and tests, original and repaired handoffs, repair record, prior round-one finding, and the existing weapon dispatcher/input contract.

## Frozen manifest

All supplied hashes match the files inspected and verified:

| File | SHA-256 | Match |
| --- | --- | --- |
| `src/weapons/sword.ts` | `cbcad186b93ef980ce5658b1e5a038f7b6289f92b12fa08bf327edd2f1f6a163` | yes |
| `src/weapons/sword.test.ts` | `d0bb61e87eb5940a75d521a27fe73ba54e7aa60ebd47f61d1aadae34eee3c15e` | yes |
| `progress/CK-03-05.md` | `5163cc75ba89de3fbeb70c89f342da4cd491140e5ca0a633b7673a522641724d` | yes |
| `progress/CK-03-05.round-1-fix.md` | `416ae35667c25d546b57fd95f41accd7fd77450d3b2e428e0e32af35bb6d6390` | yes |

Existing unrelated edits to `CONTEXT.md` and `decisions/M03-hosted-verification.md` remain outside the repaired manifest and were left untouched.

## Finding disposition and behavior review

- **CK-03-05-R1-F01 — RESOLVED.** `reachesChargeThreshold` now uses strict `elapsedSeconds >= 0.25`. Held-time accumulation uses Kahan compensation, allowing the accumulated 15 × 1/60-second duration to equal 0.25 exactly without fuzzy threshold classification. The added regression releases at `0.25 - 1e-16` and `0.25 - 2e-16`; both commit light (18 damage, 10 stamina). Exact 0.25 and 15 ticks select heavy; 72 ticks reach exactly 1.2 seconds and full charge.
- No unresolved or new confirmed in-scope findings.

Regression inspection confirms unchanged light values and timing (18 damage, 10 stamina, 0.06/0.12/0.30 seconds); heavy curve and timing (30–54 damage, 18–30 stamina, 0.10/0.16/0.50 seconds); no press cost/hit or held auto-fire; one active-onset request; clean insufficient-heavy rejection with no fallback hit/spend; cancellation without release or pending cost and no refund of committed cost; elapsed phase carry; and runtime-monotonic attack IDs. InputSampler.clearInput discards stale edges; the dispatcher cancels the old state and then preserves fresh ordered edges supplied after that clear.

## Independent commands and outcomes

- `sha256sum src/weapons/sword.ts src/weapons/sword.test.ts progress/CK-03-05.md progress/CK-03-05.round-1-fix.md` — all four frozen hashes matched.
- `npm run typecheck` — passed.
- `npm test` — passed: 27 test files, 158 tests; integrated tooling command passed.
- `npm run build` — passed. Vite reports the existing >500 kB chunk advisory (614.91 kB JS).
- `node --test --test-isolation=none tools/verify.test.mjs` — passed, all seven named cases.

No browser run was needed for this pure adapter task. Rendering/HUD integration is outside this card. No network/browser check was attempted. Verification covers the trusted typed adapter boundary and does not claim hostile-plugin fuzzing.

## Verdict

**PASS.** The repaired submission resolves F01, the targeted threshold and charge-cap cases pass, relevant light/cancel/resource/timing/ID regressions remain covered, and all required repository checks pass on the frozen repaired snapshot. No repair is requested in this round.
