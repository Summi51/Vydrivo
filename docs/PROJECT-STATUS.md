# Vydrivo — Project Status

Version: 1.0
Date: 20 October 2026
Role: source of truth for what is built, not a product spec
Requirements: [PRD-V1.md](PRD-V1.md)
Design: [PIPELINE-TECHNICAL-DESIGN.md](PIPELINE-TECHNICAL-DESIGN.md), [DASHBOARD-SYSTEM-DESIGN.md](DASHBOARD-SYSTEM-DESIGN.md)

Update this file in the same change that adds or changes a feature. A row is `built` only when code exists and its check has been run. Design docs are not proof of implementation.

## Rules

- One feature at a time. Do not start the next until the current row has evidence.
- ₹0 incremental service spend. No paid API, cloud account, or auto-retry.
- Do not call Gemini or ElevenLabs unless the user asks for that run.
- Graphics exports are diagnostics. They do not pass the footage gate.
- Secrets stay in ignored `.env.local`. This file records commands and results, never keys.

## Current evidence

Checked 20 October 2026: `npm test` passed, 15 of 15.
Node scripts, not TypeScript. Zod is not installed. Remotion is `^4.0.448`.
Graphic test, 21 October 2026: `prototype/output/nabi-pak.mp4` is 19.0s, 1080×1920, H.264 + AAC. No face or body. Not an AI-footage product export.


## Feature board

| ID | Feature | Status | Evidence | Not true yet |
|---|---|---|---|---|
| F0 | Local harness | built | `package.json`, `npm run preflight`, `npm test` | Not a web app |
| F1 | Free-tier narration | built | `prototype/narrate.mjs`, `prototype/voice-policy.mjs` | Not per scene; commercial rights unverified |
| F2 | Footage compose | built | `prototype/compose.mjs`, `prototype/media.mjs` | One short clip, not a 60–90s product export |
| F3 | Fixed graphic demos | built | `WaterCycle.jsx`, `RamStorage.jsx`, `SnakeJoke.jsx`, `NabiPak.jsx` | Hand-timed; not the topic pipeline |
| F4 | Storyboard contract | built | `prototype/storyboard.mjs` | No labels, component type, or cue phrases |
| F5 | Review lock | built | `requireReview`, `storyboardHash` | No editor UI |
| F6 | Gemini planner | code only | `prototype/planner.mjs`, `prototype/plan.mjs` | Live call not run; blocked unless free tier is verified |
| F7 | Timeline compiler | built | `prototype/timeline.mjs`, `prototype/compile.mjs` | Needs operator-supplied assets; no audio-hash reuse |
| F8 | Render boundary | built | `remotion/timeline-validation.mjs`, `StoryboardVideo.jsx` | One generic diagram, not a component catalog |
| F9 | Graphics export check | built | `prototype/graphics-test.mjs` | Reuses one saved voice file; labeled not AI footage |
| F10 | Scene narration cache | built | `prototype/narration-cache.mjs`; `narrate.mjs` returns before the speech call on a verified hit | Index is written only after a later successful generation; existing voice folders are not backfilled |
| F11 | MP4 check on compile path | not started | — | `compile.mjs` writes props; it does not probe the MP4 |
| F12 | Dashboard scaffold | not started | — | No Next.js app, auth, or database |

## Now

F11 is next: after a compiled timeline is rendered, probe the MP4 and reject a bad duration, size, or codec. `compile.mjs` still only writes props.

## Do not build yet

Dashboard, accounts, billing, Instagram, a second video provider, and automatic Gemini calls. Those wait until F11 has evidence.
