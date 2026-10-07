# CK-ART-02 round 3 repair handoff

Repair of `reviews/CK-ART-02/round-3.md` finding R3-F01, based on exact hosted snapshot `c1e218671bb12411ff7cd9225fe4b3c37d3cf01d` on `cartoon-art-preview`. Only `tests/e2e/floor.spec.ts` changed in this repair. The cumulative lifecycle test now has a scoped 60-second timeout to cover startup, invalid-seed recovery, 25 full-resolution rerolls and their ready polling, and teardown. Each of the 25 reroll steps has a five-second seed-fill bound, five-second native button-click bound, and five-second readiness poll; step labels report which cycle failed. No suite/default timeout, renderer resolution, AA, app behavior, gameplay, native input, or assertion count changed.

All 25 seed cycles remain in the loop. The test still checks initial and changed floor state, invalid input/error feedback and recovery, `currentFloors === 1` and ready lifecycle per cycle, one canvas/active floor/listener after all cycles, screenshot capture, repeated pagehide, diagnostics removal, app cleanup, submit-listener cleanup, inert retained form, and no browser errors.

## Checks and limits

- `npm run typecheck` — passed.
- `npm test` — 32 Vitest files / 173 tests passed; tooling verification passed.
- `npm run build` — passed; Vite reports its existing advisory that the app JavaScript chunk exceeds 500kB.
- `git diff --check` — passed.
- Local browser E2E was not run because local loopback is prohibited by the task protocol. Hosted run `37641423165` previously passed 24/25 browser checks and reached cycle 23 before the 30-second cumulative test budget expired. The page was alive; the cause of the delay remains unknown. This adjustment treats it as a scoped cumulative test budget and preserves bounded individual actions. The exact repaired source still needs a hosted 25/25 run and screenshot verification. No app performance or GPU/FPS claim is made.

Exact fourteen-file source SHA-256 manifest: `/tmp/cryptkeep-art02-repaired-r3.json`.

## Durable frozen source manifest

```json
{
  "task": "CK-ART-02",
  "round": 3,
  "baseline": "c1e218671bb12411ff7cd9225fe4b3c37d3cf01d",
  "source_files": [
    {
      "path": ".github/workflows/verify.yml",
      "sha256": "266d7f3cd58971f57c886f7bdf933bc630318d6f450a7e28ef9a58c9a95d7a00"
    },
    {
      "path": "src/render/floor.ts",
      "sha256": "9ca9beac1d202bc7f412c25e56847f61ab1a9815a57419342d858e6b9a611dc0"
    },
    {
      "path": "src/render/floor.test.ts",
      "sha256": "7c84b58763d34caf57d1314e087b42ff882bbcc65ccd576f44af4ac8d0c40078"
    },
    {
      "path": "src/render/materials.ts",
      "sha256": "4e97d67df22e54173689c8a7fd891d4a9aaed1a84efd60e2b6b5923b4f205415"
    },
    {
      "path": "src/render/textures/base.ts",
      "sha256": "fa6ec703ea3538018cee914281a51dcb4e0e6014ca243e100e54013cc7165af7"
    },
    {
      "path": "src/render/weapons/sword.ts",
      "sha256": "873ccc26003dc7bb7c6c834437105f08f3fa7638effb6bdbb84f47d5cd2508ad"
    },
    {
      "path": "src/render/viewmodel.test.ts",
      "sha256": "4c00fd4248ea0b3bec0c2dc9db2920ed7c6695155a3d69317188844ae97b23ee"
    },
    {
      "path": "src/app/floor-session.test.ts",
      "sha256": "cc6b49fda89c728fbbe297a1dafa67a01a316cec6d7dcae665eafad4ba54f9ef"
    },
    {
      "path": "tests/e2e/floor-renderer.spec.ts",
      "sha256": "e3f17fc7133db9e4c26061bba22b126481c9151062e536986f34bd7db8babc87"
    },
    {
      "path": "tests/e2e/floor.spec.ts",
      "sha256": "1a94eeac06e9ec2d37190238df80034c3e8fd7bb9f9a9ba84b221634fdb32245"
    },
    {
      "path": "tests/e2e/production.spec.ts",
      "sha256": "fa95b9d1a090f6dfa790c27ed7cfdd335c5d3a3dd54d38c81eb34790a627fb28"
    },
    {
      "path": "tests/harness/floor-renderer.ts",
      "sha256": "56f6ab841133e61c6a527ae2ae27772799ab7d588ff7db008b6c90629c509519"
    },
    {
      "path": "tests/harness/browser.ts",
      "sha256": "5fec10d7f4834744066e718cd998c15b8c1fd324d23bea319f267f8283207a75"
    },
    {
      "path": "playwright.config.ts",
      "sha256": "f0842005204a54136095320266aa47ab657ff3143f9ebb1b98fd2f1e97216a6d"
    }
  ]
}
```

## Final verification outcome

The intended60sec timeout did **not** become effective: exact hosted run37649648943 on5b9db697 still logs30000ms and fails reroll16/25. The repair is not accepted. This run passed173app/type/tool/build and23/25browser; wall-stamina regeneration polling also fails. Final independent report is reviews/CK-ART-02/round-3-verification.md; three-round limit reached, no further automatic repair. Source hashes above remain unchanged.
