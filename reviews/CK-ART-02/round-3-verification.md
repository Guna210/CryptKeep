# CK-ART-02 — round 3 repaired-snapshot verification

- **Reviewer:** `/root/cartoon_refinement_reviewer_r3` (same independent reviewer as round 3)
- **Repair under review:** `reviews/CK-ART-02/round-3.md`, finding `CK-ART-02-R3-F01`.
- **Repaired snapshot:** `5b9db697d165e630908d1a199ba6cb6b38e875cf`, tree `c8a82829f41e3639078a80fc76578e128ac77823`, parent `c1e218671bb12411ff7cd9225fe4b3c37d3cf01d`.
- **Scope:** Scoped reroll-test timeout repair and source identity. No source or test files were edited by the reviewer.

## Independent source verification

- Independently recomputed all 14 source hashes in the frozen round-three manifest; all match. The only source/test change from the round-two accepted-art snapshot is `tests/e2e/floor.spec.ts`.
- Inspected the actual test diff. It retains all 25 reroll seeds and ready-state checks, invalid-seed recovery, scene/canvas/listener assertions, screenshot, double-`pagehide` teardown, retained-form inertness, and browser error assertion. The cumulative budget is scoped to this one lifecycle test at 60 seconds. Each seed fill, native button click, and ready-state poll has its own five-second bound, and each cycle is labeled for diagnosis. No suite-wide timeout or acceptance assertion was changed.
- The correction is proportionate to the observed cumulative test-budget exhaustion: the prior failure artifact records the browser alive at Floor 1 with textbox seed `cycle-23`, after completed rerolls `cycle-0` through `cycle-22` (23 cycles). It did not show an indefinite freeze. The delay's cause remains unknown.
- Exact-snapshot hosted run [37649648943](https://github.com/Guna210/CryptKeep/actions/runs/37649648943), job `112889335595`, passed typecheck, all 173 application tests, tooling tests, and build. Browser E2E passed 23/25. The production rendering check passed and produced artifact `cryptkeep-cartoon-art-02-37649648943-1` (artifact ID `11495363188`).
- Independently downloaded/opened the exact-run production images from `/tmp/cryptkeep-art02-final-images/`. The yaw-zero image shows the distinct yellow core inside the orange attached flame and the visible sword. The native-angle image retains the full torch and shows the room corner; rounded stones and mortar joints remain visually consistent. Image SHA-256 values: yaw-zero `d5a9ac0f990513e7f586e6fc586e681a68ade8109e9957fd40311ce95a961874`; angle `354f3c1e3ab8dab75f159d0b40d8d3bd130ab948f59d67e2d5cc92c1f915d95a`.

## Findings and status

### CK-ART-02-R3-F01 — The scoped test budget did not take effect; reroll lifecycle still times out (P2, unresolved)

**Location:** `tests/e2e/floor.spec.ts`, final test options at the lifecycle test declaration.

**Evidence:** The exact hosted run still reports `Test timeout of 30000ms exceeded` during the 25-cycle reroll test, this time at cycle 16/25. The source passes `{ timeout: 60_000 }` as a third argument to `test(title, callback, options)`. Inspection of the installed Playwright declarations shows test details are passed as the second argument before the callback; timeout is set with `test.setTimeout(...)` inside the test or applicable configuration. Thus this third argument does not set the lifecycle's test timeout, consistent with the hosted 30-second failure. The per-fill, click, and poll bounds and all original 25 cycles/assertions remain intact.

**Status:** UNRESOLVED. The intended test-budget repair is not effective on the published snapshot. The actual cumulative runtime cause remains unknown; hosted evidence does not show an indefinite freeze or establish an application regression.

### CK-ART-02-R3-NF01 — Swept-wall browser check also fails on the exact snapshot (P2, unresolved)

**Location:** `tests/e2e/movement.spec.ts:191` (stamina refill while held at a wall).

**Evidence:** The same exact hosted run's swept-wall check timed out while polling for stamina to return to 100; the observed value was 92.13. This check passed in the prior exact-snapshot run. The current run does not establish whether this is a source defect or timing variation, and no gameplay/movement source was changed by round three.

**Status:** UNRESOLVED. This is a second required browser failure on the final round. Its cause is not established.

## Verdict

**CHANGES REQUIRED.** The exact published snapshot passed typecheck, 173 application tests, tooling tests, build, and production image review, but only 23/25 browser checks passed. The scoped lifecycle timeout was ineffective and the reroll check again hit its 30-second limit; a swept-wall stamina poll also failed. The artwork remains visually accepted, but CK-ART-02 is not accepted. This is the final verification in round 3; no fourth repair round is authorized by the task protocol. The owner must decide whether to leave the task unaccepted or issue a new instruction.
