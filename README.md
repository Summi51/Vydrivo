# Vydrivo

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
