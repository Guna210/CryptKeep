# Cartoon art preview — CK-ART-01

Owner authorization (2026-10-07): implement the cartoon dungeon direction inspired by the second supplied image on a separate branch, commit and push for automatic Cloudflare Pages preview, and do not merge. This is a reversible art experiment; it does not approve a permanent replacement of the full game plan.

## Scope and acceptance

- Branch `cartoon-art-preview`, based on accepted master `e225151713f33963dcae6ceef4dc20d302036439`. Never move or merge master. M04 onward remains outside scope.
- A normal production visit immediately offers the existing first-person generated dungeon, with WASD, mouse capture/look, sprint/dash, pause, and sword light/charged attacks retained. No debug command or DEV-only fixture is needed to see the style.
- Replace coarse full-screen pixel scaling with smooth viewport-aware rendering, bounded buffer size/device pixel ratio, and appropriate texture sampling. Preserve compatibility and context teardown. Avoid introducing camera shake, bob, strobing/flickering lights, motion blur or postprocessing dependencies.
- Translate the second reference's art language: cool teal/slate masonry with intentional broad shape variation, visible mortar and dimensional block edges; calmer floor slabs; warm amber torch sconces; restrained moss/accent detail. Use original procedural assets/geometry, not the attached image as a texture. Lighting must keep the walkable dungeon readable.
- Integrate a matching clean stylized sword, preserving its state-derived pose and charge cue. A faceted blade, brass guard and dark grip are appropriate. The existing DEV dummy may stay as a diagnostic asset.
- Decoration is visual only: no hidden collision change, obstruction of walkable routes, game RNG changes, role/entry changes, or enemy/campaign implementation. Bound geometry/draw calls and active lights; prefer instancing/shared resources. Own and dispose every new renderer resource through the existing floor lifecycle, including diagnostic world replacement where applicable.
- Preserve material-library and floor contracts where practical. Changes to former pixel-specific tests must verify the new branch requirements; preserve simulation/input and disposal checks. A first reference viewpoint is not a target camera; this remains fully 3D first person.
- Typecheck, application/tool tests, production build, and existing browser regressions must pass. Add a meaningful production screenshot/check for the new style with a stable seed and pose; inspect actual image, page/console errors and resize. Do not claim GPU performance or motion-sickness resolution from software Chromium.
- Extend the existing GitHub Actions push allowlist to this preview branch and upload its visual evidence so hosted verification is available if local loopback is denied. This is task verification, not Cloudflare administration.

## Ownership and workflow

Luna builder owns render modules/new render helpers, matching tests, narrowly necessary shell canvas/CSS/context creation, browser style evidence test, `.github/workflows/verify.yml`, and `progress/CK-ART-01.md`. Main owns this decision, CONTEXT/SPEC coordination and Git. No library switch, new paid service, external asset dependency, deployment configuration or package installation is required.

Submit exact changed-file hashes, check results, resource/asset design and screenshot location. Main publishes a candidate on this branch for hosted checks if required. A fresh Luna reviewer independently checks the exact submission under REVIEW.md (maximum three rounds). After PASS, main updates CONTEXT and commits/pushes acceptance records on this branch. Owner decides whether to continue or merge after looking at Cloudflare's preview.

Cloudflare preview alias is expected to be `https://cartoon-art-preview.cryptkeep.pages.dev/` when its branch-preview integration is enabled; do not represent that deployment as verified without evidence.
