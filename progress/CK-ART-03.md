# CK-ART-03 implementation handoff

Implemented on `cartoon-art-preview` from baseline `0f771edf92d16f394eed4b259a48bba6a1a5e27b`. No merge or push was performed. Main owns publication and hosted browser proof.

## Artwork and rendering

`src/render/textures/painted.ts` is the reproducible source artwork. It rasterizes authored vector-style polygons, tapered brush strokes, engraved paths, seams, and selected wear into opaque RGBA `DataTexture` recipes. The stone design is a stable 2×2 atlas with four separately composed chipped-plane patterns. The steel map reserves UV strips for blade face, reverse, and edge; the front has broad reflections, a tapered darker fuller, and selected edge nicks. Brass carries an engraved leaf/flame motif with placed tarnish; leather has crossing wrap shading and grain; wood has flowing grain and irregular knots. This is vector-authored painted-style art, not human-painted art, and uses no external assets or image-generation service.

`src/render/floor.ts` applies atlas variants by stable block position while keeping shared indexed geometry, spatial chunk culling, instancing, and per-floor disposal. The entry room gains a low base course, torch alcove surrounds, a worn crate, and an iron-hooped barrel at opposite room edges. Torch heads retain separate orange/yellow flame geometry and at most two existing point lights. `src/render/weapons/sword.ts` owns three small maps for steel, leather, and brass and disposes those textures with the sword materials. UV panel regions are explicit in source.

The default library uses 13 owned textures and 13 materials; the camera-space sword owns three more textures. At the default 128px recipe size, CPU RGBA payload is 1,245,184 bytes (1.19 MiB): 256×256 stone atlas plus twelve 128×128 maps, and three 128×128 sword maps. GPU mip chains add roughly one third, about 415,061 bytes, for approximately 1.58 MiB of texel storage before driver alignment/metadata. Authored texture contact sheet: `test-results/CK-ART-03/contact-sheet.png`, generated from the TypeScript source recipes with Node's type stripping and Pillow; it is local visual evidence, not a hosted room screenshot.

## Behavior and evidence

The lifecycle e2e now calls `test.setTimeout(60_000)` inside the 25-reroll test, preserving its rerolls and teardown assertions. The swept-wall stamina check waits for 45 real simulation ticks before checking refill. The production browser proof saves the default entry, then captures native Explore/mouse room-angle and closer sword/stone views under `test-results/CK-ART-03/`; it asserts production diagnostics are absent and anchors mouse movement at the actual Explore click coordinates. The branch workflow uploads that directory with a run-and-attempt-specific artifact name and seven-day retention.

Completed locally after final source edits:

- `npm run typecheck` — pass.
- `npm test` — 174 application tests and one tooling test pass.
- `npm run build` — pass; Vite reports its existing large-chunk advisory (695.26 kB minified JS, 183.57 kB gzip).

Local browser execution was not attempted because the environment previously denied loopback binding; do not bypass/retry it. The actual room/sword screenshots and 25-case browser suite remain for the hosted workflow. No aesthetic pass is claimed until the actual images are inspected. Independent Luna review and owner evaluation remain pending.

The complete implementation source/test/workflow/progress SHA-256 manifest is `/tmp/cryptkeep-art03-source.json`.

## Durable frozen source manifest

Original builder handoff hash records its submitted snapshot; this source-only manifest avoids a self-hash cycle as coordination metadata is added. Vector artwork was authored by the Luna builder.

```json
{
  "task": "CK-ART-03",
  "baseline": "0f771edf92d16f394eed4b259a48bba6a1a5e27b",
  "branch": "cartoon-art-preview",
  "method": "authored deterministic vector-style TypeScript surface rasterizer; no external assets or image-generation service",
  "localVisualEvidence": {
    "path": "test-results/CK-ART-03/contact-sheet.png",
    "bytes": 102869,
    "sha256": "4a2ed51446f8fedd30e964be770176b093bea4dd0a8cac57a9af85378212d9e4"
  },
  "textureBudget": {
    "floorLibraryTextures": 13,
    "swordTextures": 3,
    "cpuRgbaBytesAt128px": 1245184,
    "estimatedGpuMipTexelBytes": 1660245
  },
  "source_files": [
    {
      "path": ".github/workflows/verify.yml",
      "bytes": 2288,
      "sha256": "0815f2ff993cc7422ee4dc945f74b9e6063794668935eb83f660442c35562ea5"
    },
    {
      "path": "src/render/floor.ts",
      "bytes": 23135,
      "sha256": "86692325a77d864cd515848f0ec596f5973988fffc90775a4f62a0d6332d4cbe"
    },
    {
      "path": "src/render/floor.test.ts",
      "bytes": 15068,
      "sha256": "72ec7394db693ce90daaa53c925f1d16772581864229c8fd63546a7ae74c822f"
    },
    {
      "path": "src/render/materials.ts",
      "bytes": 3471,
      "sha256": "04fbcabf6eff7755dc82a4c79c67beec6c9e7cbe99c81f9f6e4d7de40b45d390"
    },
    {
      "path": "src/render/materials.test.ts",
      "bytes": 2497,
      "sha256": "bca647b48009a137da253e3db2fc04f48d82f9b8688e02137154ab8c91f41cdf"
    },
    {
      "path": "src/render/textures/painted.ts",
      "bytes": 11291,
      "sha256": "c06655ca8cf9d339470b8ba90ea0d4558ae1f999ada3cece22b40978e01ddccc"
    },
    {
      "path": "src/render/textures/painted.test.ts",
      "bytes": 990,
      "sha256": "9594c4e2fb8ed0b902785237c58a22877c8a6d0908b20409886255e59b7ec1c2"
    },
    {
      "path": "src/render/weapons/sword.ts",
      "bytes": 9499,
      "sha256": "d60111bcc5e4b6df872f1b3842f6a5f2892a3bdc011d43edef08b8b28023c20e"
    },
    {
      "path": "src/render/viewmodel.test.ts",
      "bytes": 4245,
      "sha256": "a5452003c88777799f4c6873af426ba8a56a52a01689850599ec6d078bc46f4c"
    },
    {
      "path": "tests/e2e/floor.spec.ts",
      "bytes": 4830,
      "sha256": "f02af5ebc2a313f311fd3b8a667c3c714c07edef36a8e9f1260ecff17950ce22"
    },
    {
      "path": "tests/e2e/movement.spec.ts",
      "bytes": 16544,
      "sha256": "bad6423fb0698549a495687e4ef0245977f6bbca87fda162dfe2af31be89cfc6"
    },
    {
      "path": "tests/e2e/production.spec.ts",
      "bytes": 3691,
      "sha256": "7c77722951053049ae7265a23474709bedce03a3bda2aae4fdd07fc70babe6b6"
    }
  ],
  "original_handoff_hash": {
    "path": "progress/CK-ART-03.md",
    "bytes": 3520,
    "sha256": "1c0619a4e079ccc82f513e4510496c8b499dcc62b8e64c9831d14b6ad6b38191"
  }
}
```
