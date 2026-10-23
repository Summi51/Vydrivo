# Vydrivo 75-second explainer

A six-scene vertical system explainer: one typed idea becomes one finished MP4.

## Important limitation

This cut uses **real licensed stock footage**, not AI-generated footage. It is a
system explainer, not the V1 AI-footage product export. The V1 AI-footage gate
in `docs/PRD-V1.md` is **not** satisfied by this render, and no AI video provider
is configured.

## Structure

| Scene | Seconds | Treatment |
| --- | ---: | --- |
| 1. One idea | 10 | Full-bleed typing footage |
| 2. The pipeline | 8 | Browser → API → database/worker diagram |
| 3. Review the plan | 12 | Checklist footage + three scene cards + `APPROVED` |
| 4. Render one scene | 18 | Editor footage + render progress + locked narration/captions |
| 5. One vertical video | 15 | Phone footage + `1080 × 1920` badge and player bar |
| 6. Change one scene | 12 | Four-card revision stack + `ONE IDEA → ONE MP4` |

Total: **75 seconds**, **2250 frames** at 30 fps. Footage: **55 seconds** (73.3%).

## Local outputs

Generated media is intentionally ignored by git.

- `prototype/output/vydrivo-explainer/vydrivo-explainer-en.mp4`
- `prototype/output/vydrivo-explainer/vydrivo-explainer-hi.mp4`
- `prototype/output/vydrivo-explainer/vydrivo-explainer-en-contact-sheet.jpg`
- `prototype/output/vydrivo-explainer/vydrivo-explainer-hi-contact-sheet.jpg`
- `prototype/output/vydrivo-explainer/render-en.json`
- `prototype/output/vydrivo-explainer/render-hi.json`
- `prototype/output/vydrivo-explainer/stills/`

Both exports validate as 1080×1920, 30 fps, 2250 frames, H.264/AAC, 75.03 s,
full decode, with audible narration (mean volume about −21 dB).

## Reproduce

The build needs the private narration/footage inputs under `prototype/private/`
and the fitted narration under `prototype/output/vydrivo-<lang>-final/`.

```bash
node prototype/vydrivo-build.mjs
node prototype/vydrivo-render.mjs en --stills
node prototype/vydrivo-render.mjs en
node prototype/vydrivo-render.mjs hi
```

No provider calls are made by the build or render scripts. Rendering uses the
installed headless shell at
`node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell`
and requires at least 20 GiB free.

## Stock footage provenance

All clips are used under the
[Pexels License](https://www.pexels.com/license/) (free use, no attribution
required). They are labelled as stock in the build/render reports.

| Scene | Pexels ID | Source page | Original |
| --- | ---: | --- | --- |
| 1. Typing | 12692035 | `https://www.pexels.com/search/videos/woman%20typing%20laptop/` | 1080×1920, 60 fps, 15.998 s |
| 3. Checklist | 36633828 | `https://www.pexels.com/search/videos/woman%20reviewing%20notes/` | 1080×1920, 25 fps, 12.920 s |
| 4. Video editor | 1536321 | `https://www.pexels.com/search/videos/video%20editor/` | 1280×720, 30 fps, 19.518 s |
| 5. Phone | 38410501 | `https://www.pexels.com/search/videos/holding%20phone/` | 1080×1920, 25 fps, 21.280 s |

Source video URLs and output checksums are recorded in
`prototype/vydrivo-build.mjs` and the generated `build-report.json`.
