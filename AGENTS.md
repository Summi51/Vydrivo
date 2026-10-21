# Project working agreements

- Work on `dev` unless the user requests another branch. Do not merge to main automatically.
- At each completed, verified milestone, commit the relevant changes and push to origin/dev. Report any push blocker; do not call an unpushed milestone synchronized.
- Never commit environment secrets, private inputs, generated audio/video, node_modules, or build output. Review staged changes and scan for secrets before every push.
- Keep incremental provider/service spending at ₹0 unless the user approves a numeric budget. No automatic paid fallback.
- Use the PRD and design contracts. Actual AI footage is required for V1; graphics demos are not footage. Finished user videos target 60–90 seconds.
- Selected landing design: Stitch project 17165629018061734091, screen 4955dde556584d4587a141ff79a2f7b6.
- MongoDB configuration is server-only. Existing DB design assumes Postgres/Supabase; resolve that architectural difference before implementing persistence rather than claiming existing SQL/RLS contracts work in MongoDB.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
