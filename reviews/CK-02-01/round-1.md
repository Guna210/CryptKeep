# CK-02-01 independent review — round 1

- **Task:** CK-02-01, Define player resources and safe spawn state
- **Round:** 1
- **Reviewer/model/agent:** independent GPT-6 Luna reviewer `/root/ck_02_01_reviewer_r1`
- **Builder:** `/root/ck_02_01_builder`
- **Baseline:** `2901bb7`; submitted files are uncommitted and include untracked TypeScript sources.
- **Scope:** the five-file submission manifest, actual generated-floor integration, and relevant existing grid/role/generation interfaces. `CONTEXT.md` coordination changes were excluded from task scope.

## Submission identity

Manifest source: `/tmp/cryptkeep-CK-02-01-submission.json`. I recomputed the hashes after review checks; all five match the supplied frozen manifest:

```json
{
  "src/player/state.ts": "b51141384719b29dbae7adb354ca7f127c9ddf47c398d672537696334c314f3e",
  "src/player/resources.ts": "611b2ed8fd712cef9e672f38ec848129b01ce68da998cd3b97668bdac91c18aa",
  "src/player/state.test.ts": "4c9508c915daeb2a7f5be195b06c434974399bc7c50aa0e1f66a9fb1834d0bc5",
  "src/player/resources.test.ts": "4c7760488d255bf6bf03a9f4ac6c299bb4055d1daf71a29c1f471aac502b89a0",
  "progress/CK-02-01.md": "0eb7e3ebf24179438c04ca43244c3cc0f3d0aff4c7402f5f5a6905e4e7fca176"
}
```

## Requirements and inspected behavior

Read `REVIEW.md` in full, SPEC sections 0, 3 and 5.1, the CK-02-01 task card, and `progress/CK-01-05.md` plus `progress/CK-02-01.md`. The submission provides plain frozen pose/velocity/resource records, the required 0.28 m radius and 1.6 m camera height, initial 100/100/60 resources, zero velocity, and radians with yaw zero facing -Z. Spawn selection uses the generated entry-cell center and validates the supplied circle against actual tile occupancy; invalid position/angles repair to that entry, and an unsafe entry throws. Resource helpers retain finite nonnegative maxima and bounded current values; failed spending leaves the input resource unchanged.

The actual `generateFloor` output was exercised, including supplied-pose preservation, nonfinite input repair, straight wall contact/overlap, and resource spending. The colocated cases also use real generation and cover solid/outside repairs and deterministic entry selection. No movement or regeneration was introduced.

## Checks

- `npm test` — passed: **16 application test files / 86 tests**, then **1 Node tooling test / 1 pass**. This confirms the actual Node tooling subcommand count rather than counting the enclosing npm process.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted its existing advisory that the minified JS chunk is above 500 kB.
- Independent real-floor reproduction through Vite SSR — valid position retained; NaN and ±Infinity positions repaired to valid entry; exact straight-wall contact accepted; wall overlap rejected; insufficient spend failed unchanged; exact spend reduced the resource to zero.
- Independent generated-floor diagonal corner reproduction — found F01 below. The Vite SSR server also printed the repository's existing sandbox `listen EPERM` WebSocket diagnostic while successfully loading modules and completing the reproduction.
- Post-check SHA-256 values for all five manifest paths match the frozen manifest above.

## Findings

### CK-02-01-R1-F01 — P3 — exact diagonal wall-corner tangency is rejected

- **Location:** `src/player/state.ts:95-99`.
- **Requirement:** the submitted clearance contract says a supplied pose is kept when its full 0.28 m circle clears actual walkable occupancy; the handoff and test suite explicitly treat exact radius contact at a straight wall edge as valid. The same tangent-clearance rule should hold at tile corners.
- **Reproduction:** generate `generateFloor({ campaignSeed: "ck0201-review-corner", floorNumber: 1 }).plan`. The first matching walkable-to-solid edge with a walkable diagonal neighbor is at walkable tile `(17, 7)` and solid tile `(18, 7)`. Let the solid tile's lower-left corner be `(36, 14)` meters and supply `{ x: 36 - 0.28 / sqrt(2), z: 14 - 0.28 / sqrt(2) }`, i.e. `{ x: 35.80201010126777, z: 13.802010101267767 }`.
- **Expected:** `isPoseValid` returns true because the circle is tangent to the solid tile corner at radius 0.28 m, matching the accepted straight-wall tangent case.
- **Actual:** it returns false. Floating point evaluates the squared corner distance as `0.0784`, while `0.28 * 0.28` evaluates as `0.07840000000000001`; the `>` skip condition therefore counts this mathematically tangent contact as an overlap and repairs a valid pose.
- **Bounded correction:** use a small scale-appropriate tolerance for the squared-distance tangency comparison (or an equivalent robust comparison), while continuing to reject a meaningful overlap. Add an exact diagonal tangent and a nearby true-overlap regression case.

## Verdict

**CHANGES REQUIRED.** One confirmed low-priority in-scope clearance defect remains. Required unit, typecheck, and build checks passed; there are no other confirmed findings. The task remains review-round 1 pending a scoped repair and same-reviewer verification.
