# Project working agreements

- Work on `dev` unless the user requests another branch. Do not merge to main automatically.
- Release gate: never push to GitHub until the user explicitly approves the push. Keep changes local/unpushed while the gate is in progress.
- Before asking for push approval: complete manual and regression testing on `localhost:3000` in Chrome, review all uncommitted changes plus relevant already-pushed code, fix major and minor bugs found, update `docs/PROJECT-STATUS.md` with evidence, and discuss the results with the user.
- Do not call a milestone synchronized before the approved push. Report any push blocker.
- Never commit environment secrets, private inputs, generated audio/video, node_modules, or build output. Review staged changes and scan for secrets before every push.
- Keep incremental provider/service spending at ₹0 unless the user approves a numeric budget. No automatic paid fallback.
- Use the PRD and design contracts. Actual AI footage is required for V1; graphics demos are not footage. Finished user videos target 60–90 seconds.
- Selected landing design: Stitch project 17165629018061734091, screen 4955dde556584d4587a141ff79a2f7b6.
- MongoDB configuration is server-only. Existing DB design assumes Postgres/Supabase; resolve that architectural difference before implementing persistence rather than claiming existing SQL/RLS contracts work in MongoDB.

## Current product flow and stack (5 November 2026)

- Keep Google sign-in and Supabase Auth/Postgres. Do not replace them with Better Auth or MongoDB.
- Client project, storyboard and idea requests refresh an expired access cookie once and retry with the refresh-issued CSRF token; concurrent retries share one refresh. Do not add a second refresh path in page code.
- User-facing copy does not name infrastructure or model vendors (no Supabase, Postgres, DeepSeek or ElevenLabs); say Saved, Studio ready, AI and voice service. The last idea directions are cached in this browser for 7 days; cross-device persistence is pending.
- Use the configured DeepSeek gateway through the existing OpenAI-compatible `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` adapter. Gemini is not the default vendor.
- The user-facing flow is **Idea → Storyboard → Video → Publish**, matching the reviewed NamasteVideo.ai reference flow:
  1. Idea: topic, optional audience and notes, voice preset, AI idea suggestions, refine suggestions.
  2. Storyboard: generate a candidate, review scene-by-scene or full script, generate another, keep saved candidates.
  3. Video: generate and review footage, approve/reject/regenerate individual scenes.
  4. Publish: later feature; do not fake it.
- Actual AI footage remains mandatory for a V1 product export. Motion graphics are supplementary, never a footage substitute.
- Build one feature at a time. At the start of each feature, compare the current Vydrivo behavior with the reference flow, state the exact gap, and implement only that slice.
- After each feature: run tests/build, manual-test in Chrome on `localhost:3000`, show the diff and evidence, then wait for the user's code review before starting the next feature.
- Update `docs/PRD-V1.md`, `docs/DASHBOARD-SYSTEM-DESIGN.md`, `docs/PIPELINE-TECHNICAL-DESIGN.md`, `docs/API-DESIGN.md`, `docs/DATABASE-DESIGN.md`, `docs/PROJECT-STATUS.md` and this file with every feature change. Keep requirements and evidence separate.
- The landing page uses the dark premium design in `docs/LANDING-DESIGN.md`. The app screens are migrated to it one at a time; do not build new features on the old app UI.
- The auth screens (sign-in, sign-up, recovery, new password), the shared brand mark (`components/BrandLockup.jsx`), the authenticated studio shell + app home, the Idea step, the Storyboard workspace and the Projects library use the dark landing foundation. The Video step is built as a gated route; actual footage still requires a text-to-video provider and budget. The Projects library keeps real Supabase data with search/sort/grid/list, honest status counts, storyboard/brief thumbnails, menu actions and delete confirmation; do not add fake playback, projects or percentages. The app home uses Inter at the studio root, a small violet `01/02/03` section index, sample-prompt chips with shuffle/clear, a live topic counter, Cmd/Ctrl+Enter, a Resume project action, and clickable current-project and recent-project cards; keep those interaction and readability baselines when editing it. Its visual backdrop stays `#0B0B0F` with subtle violet/teal radial light, and `.studio-surface` adds restrained panel highlights; do not introduce a new palette or heavy card gradients.
- Studio type minimums: body and form text 13–14px, labels 11–12px. Do not reintroduce 8–9px content text.
- Public sample media resolves through `lib/media.js` and `NEXT_PUBLIC_MEDIA_BASE_URL`; private user media uses a separate R2 bucket and signed URLs. The bucket/CORS/token/file list and the Amplify build-time env requirement live in `docs/MEDIA-HOSTING.md`. Never commit generated media, never expose storage credentials, and never paste them into chat.
- The landing CTA stores the pending topic in session storage and pre-fills the dashboard create form after sign-in.
- `.env.local` is ignored. Never commit or paste provider keys, MongoDB URLs, generated media or private inputs.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
