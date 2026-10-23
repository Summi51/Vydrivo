# Vydrivo — Project Status

Version: 1.2
Date: 23 October 2026
Role: source of truth for what is built, not a product spec
Requirements: [PRD-V1.md](PRD-V1.md)
Design: [PIPELINE-TECHNICAL-DESIGN.md](PIPELINE-TECHNICAL-DESIGN.md), [DASHBOARD-SYSTEM-DESIGN.md](DASHBOARD-SYSTEM-DESIGN.md)

Update this file in the same change that adds or changes a feature. A row is `built` only when code exists and its check has been run. Design docs are not proof of implementation.

## Rules

- One feature at a time. Do not start the next until the current row has evidence.
- ₹0 incremental service spend. No paid API, cloud account, or auto-retry.
- Do not call the planning provider or ElevenLabs unless the user asks for that run.
- Graphics exports are diagnostics. They do not pass the footage gate.
- Secrets stay in ignored `.env.local`. This file records commands and results, never keys.

## Current evidence

Checked 23 October 2026: `npm test` passed, 27 of 27.
Node scripts, not TypeScript. Zod is not installed. Remotion is `^4.0.448`.
Graphic test, 21 October 2026: `prototype/output/nabi-pak.mp4` is 19.0s, 1080×1920, H.264 + AAC. No face or body. Not an AI-footage product export.
Solar-system diagnostic, 23 October 2026: `prototype/output/solar-system-1792740571973/solar-system.mp4` is 60.3s, 1080×1920, H.264 + AAC. One male ElevenLabs narration call (`iP95p4xoKVk53GoZ742B`, `eleven_multilingual_v2`) under the free-allowance guard; ₹0. Animated graphics only; not AI footage and not a V1 product export.


## Feature board

| ID | Feature | Status | Evidence | Not true yet |
|---|---|---|---|---|
| F0 | Local harness | built | `package.json`, `npm run preflight`, `npm test` | Not a web app |
| F1 | Free-tier narration | built | `prototype/narrate.mjs`, `prototype/voice-policy.mjs` | Not per scene; commercial rights unverified |
| F2 | Footage compose | built | `prototype/compose.mjs`, `prototype/media.mjs` | One short clip, not a 60–90s product export |
| F3 | Fixed graphic demos | built | `WaterCycle.jsx`, `RamStorage.jsx`, `SnakeJoke.jsx`, `NabiPak.jsx` | Hand-timed; not the topic pipeline |
| F4 | Storyboard contract | built | `prototype/storyboard.mjs` | No labels, component type, or cue phrases |
| F5 | Review lock | built | `requireReview`, `storyboardHash` | No editor UI |
| F6 | Planning adapter | code only | `prototype/planner.mjs`, `prototype/plan.mjs` | OpenAI-compatible chat endpoint via `AI_BASE_URL`/`AI_MODEL`/`AI_API_KEY`; live call not run; blocked unless `AI_FREE_TIER_VERIFIED=true` |
| F7 | Timeline compiler | built | `prototype/timeline.mjs`, `prototype/compile.mjs` | Needs operator-supplied assets; no audio-hash reuse |
| F8 | Render boundary | built | `remotion/timeline-validation.mjs`, `StoryboardVideo.jsx` | One generic diagram, not a component catalog |
| F9 | Graphics export check | built | `prototype/graphics-test.mjs`; `prototype/solar-system-render.mjs` + `remotion/SolarSystem.jsx` | Labeled diagnostics, not AI footage; solar run used one new male TTS call at ₹0 |
| F10 | Scene narration cache | built | `prototype/narration-cache.mjs`; `narrate.mjs` returns before the speech call on a verified hit | Index is written only after a later successful generation; existing voice folders are not backfilled |
| F11 | MP4 check on compile path | not started | — | `compile.mjs` writes props; it does not probe the MP4 |
| F12 | Landing/frontend foundation | built | Next.js 16.4.2 matching Stitch screen `4955dde556584d4587a141ff79a2f7b6`; `app/`, `components/IdeaForm.jsx` | No database or live generation UI |
| F13 | Local project draft | built | `lib/project-draft.js`; `/projects/new`; form saves this browser tab only | Not an account, not MongoDB, not a storyboard |
| F14 | Auth API + screens | built | `/api/v1/auth/{csrf,sign-up,sign-in,google,refresh,sign-out,recovery,password}`, `/auth/callback`; `components/AuthScreen.jsx`; `/sign-in`, `/sign-up`, `/recover`; `/app` sign-out + session keeper | Localhost and 127.0.0.1 are the same local origin. Supabase absent returns 503. No password storage. No production SMTP; local review screenshots stay in gitignored `prototype/private/review/` |

## Now

F14 now has the documented auth routes and a Stitch split-screen UI shared by `/sign-in` and `/sign-up`, with `/recover` still reachable from the sign-in form. The left panel carries the storyboard-first branding; the right panel keeps the Google button, email/password fields, remember-me, and Sign In / Create Account tabs. Start a project opens `/sign-in`. Forms call `/api/v1/auth/*` with a CSRF token. Localhost and 127.0.0.1 on the same port are treated as one local origin. Email and Google callbacks land on `/auth/callback`, then `/app`. Without Supabase URL and publishable key the routes return 503 and store nothing. Google stays disabled until `SUPABASE_GOOGLE_ENABLED=true`. No password is stored in MongoDB, sessionStorage, or a local table.

Email/password sign-up stores a one-hour PKCE cookie and sends the confirmation link to `/auth/callback`. Opening that link in the same browser exchanges the code and lands on `/app`; a 202 sign-up response shows an inline check-your-email message. A `token_hash` link is verified without that cookie. Confirm email off still returns a session immediately. Google is unchanged. Unconfirmed sign-in stays 403. Supabase's built-in mailer still allows only a few messages per hour. Recovery callbacks set the one-hour recovery cookie and `/recover` switches to the new-password form; a successful update returns 204 and clears the session.

`/app` now renders a signed-in shell with sign-out and a session keeper that refreshes an expired access cookie. Sign-out revokes the provider session and clears all five cookies, including the remember marker. Remember-me is an optional `remember` boolean on sign-in/sign-up: true sets a 30-day refresh cookie, false keeps 14 days; `/auth/refresh` preserves the choice.

F13 remains a browser-tab draft at `/projects/new`. It is not an account. F11 remains pending. Keep supplied credentials private and rotate credentials exposed in chat.

Checks: `npm test` 28/28 and `npm run build` pass. A same-origin API probe returned 403 for sign-out without CSRF, 204 with CSRF and five clearing cookies, 422 for invalid sign-in/sign-up/recovery input, and 401 for password update without a recovery session. `/app` returned 307 to `/sign-in` when unauthenticated; `/recover` returned 200. Desktop and mobile auth screens were captured for local review. Full accessibility audit not performed.

Dependency audit reports eight high-severity findings in the existing Remotion toolchain/transitive packages (extract-zip, postcss, ws). No automatic broad dependency upgrade was performed. Resolve and rerun rendering regression checks before public deployment. The Next.js landing is noindex and has no connected backend. Canonical/sitemap and public SEO release checks wait for a confirmed production domain.

## Do not build yet

Live generation and public release still require F11 and the remaining footage gates. Billing, Instagram activation, second provider and automatic planning calls remain out of this milestone. User authorization permits frontend work; it does not authorize paid services or deployment.
