# Vydrivo

## Frontend milestone

Run `npm ci` then `npm run dev` for the Next.js landing page. The terminal prints
the local URL. `npm run build` verifies the production build. Existing prototype
commands remain available.

The landing page follows the selected Stitch screen's plum visual direction.
Illustrations are concepts, not generated videos. The idea form validates input
in page memory only: no authentication, persistence, generation or posting is
connected. It stays noindex until public-release SEO gates pass. Do not deploy
the repository root or `remotion/public` as public web assets.

Work is on `dev`; commit and push each verified milestone (see AGENTS.md).
MongoDB configuration is server-only. Existing persistence contracts assume
Postgres/Supabase and need reconciliation before database implementation.
See `docs/PROJECT-STATUS.md` for dependency-audit findings and validation limits.

Local AI-video prototype: reviewed storyboard → actual generated clips → narration
and measured captions → composition → MP4. V1 targets 60–90-second videos; graphics
are supplementary. Separate graphics diagnostics do not satisfy footage acceptance.

## Project documents

- [Product requirements](docs/PRD-V1.md)
- [Pipeline design and prototype milestones](docs/PIPELINE-TECHNICAL-DESIGN.md)
- [Dashboard system design](docs/DASHBOARD-SYSTEM-DESIGN.md)
- [API contracts](docs/API-DESIGN.md)
- [Database schema and transactions](docs/DATABASE-DESIGN.md)
- [Local commands, evidence and limitations](prototype/README.md)

## Current local workflow

`npm test` runs offline regression checks. `npm run preflight` checks installed
media tools. `npm run graphics:test` renders a labeled educational graphics test
using existing saved speech, without API calls. See the prototype guide for its
required cached inputs and installed browser. Do not install anything implicitly.

`npm run plan -- --validate board.json` validates a storyboard offline. Live
planning is explicitly gated on verified free-only Gemini access; narration uses
ElevenLabs access/allowance checks. The generic renderer consumes compiled scene
data. Historical topic-specific compositions remain demos, not a planner fallback.

No production-readiness claim: automated video-provider orchestration, the dashboard
and a full live 60–90-second generation run are not complete. Initial incremental
service spending remains ₹0; no paid provider or cloud resource may activate
without numeric budget approval. Keep `.env.local`, output media and private
render inputs out of Git and public hosting.
