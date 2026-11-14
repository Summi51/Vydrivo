# Vydrivo V1 — Pipeline Technical Design & Prototype Plan

Version: 1.2
Date: 26 October 2026
Status: Local prototype and Idea planner partially implemented; automated full workflow unverified
Source of truth: [PRD-V1.md](PRD-V1.md), version 1.4
Initial incremental service-spend ceiling: **₹0**

## 1. Purpose and fixed decisions

Translate the PRD into an implementable pipeline and a sequence of evidence-producing experiments. This document does not replace the PRD or authorize installs, accounts, paid requests, cloud resources, deployment or publication. Prototype evidence and remaining gaps are recorded in the implementation reconciliation below.

- V1 generates actual moving footage through one video provider, combines it with narration and captions, supports scene revisions, and exports MP4. Images, pan/zoom effects and template animations cannot satisfy footage acceptance.
- User videos are 60–90 seconds with AI-selected length and conversational revisions; no duration selector. Five-second and 30-second outputs are internal fixtures only.
- Default scene planning uses generated footage. Supplementary graphics must be explicit in the approved storyboard. The full-duration feasibility fixture must demonstrate footage coverage across the video, not a token clip embedded in an otherwise template-only demo.
- English narration first. Image-to-video is conditional on provider support and upload tests. Perfect subject continuity is not promised.
- Local development, narration, composition and media storage first. Approved hosting later: Amplify web app, private R2 media, Supabase auth/Postgres, supervised local worker. EC2 only when continuous operation is justified.
- Free Wan/ZeroGPU access is a candidate experiment, not a confirmed working integration. If unavailable, preserve the ₹0 ceiling. Luma is a paid fallback candidate only after explicit numeric budget approval; never switch automatically.
- No customer billing in V1. Official Instagram access and successful tests gate live publishing; manual export remains available.

## 2. Architecture and trust boundaries

```mermaid
flowchart TD
    U[Browser: idea, storyboard, preview, edits] --> A[Next.js API: authenticate and validate]
    A --> D[(Postgres: revisions, jobs, attempts, budget)]
    W[Separate local worker] -->|lease and heartbeat| D
    W --> P[Planning adapter: DeepSeek / OpenAI-compatible]
    W --> T[ElevenLabs narration and measured timestamps]
    W --> V[One video provider adapter]
    V -->|generated clips| W
    W --> M[Media validation and normalization]
    M --> R[Remotion composition and FFmpeg validation]
    R --> S[(Local media initially; private R2 later)]
    A -->|authorized media access| S
    U -->|preview or download| S
    A --> J[Conditional publication jobs]
    J --> I[Official Instagram API]
```

The diagram shows logical responsibilities. During a local experiment the worker may access a local database directly. In a hosted pilot, the laptop uses outbound authenticated worker endpoints with short-lived/scoped job access; it does not expose inbound ports or receive a shared unrestricted database service key. Browser code receives neither provider keys nor worker privileges. Browser media access is through an ownership-checking local handler initially and short-lived signed URLs later, not direct filesystem access.

| Component | Responsibility | Must not do |
|---|---|---|
| Web app | Review, edit, approve, enqueue, show status, preview/download | Run long renders in a request or trust client budget/ownership claims |
| Planning adapter | Produce validated structured scene proposals | Execute model-produced code or change approved narration silently |
| Worker/orchestrator | Resolve dependencies, lease tasks, reconcile attempts, write manifests | Submit an uncertain provider request again blindly |
| Video adapter | Capabilities, estimate, submit, status, cancel if supported, retrieve result | Hide provider restrictions or silently route to another model |
| Narration adapter | Synthesize approved phrases, record voice/version, measure audio | Claim word alignment from character counts |
| Media layer | Verify/decode/normalize permitted media with resource limits | Fetch arbitrary URLs or execute embedded instructions |
| Renderer | Compose validated local assets into output | Contact external services from unrestricted scene code |
| Storage adapter | Put, read, checksum, authorize access, delete | Treat S3 and R2 as identical for every operation |
| Publication worker | Publish an approved immutable snapshot | Publish automatically after generation or rewrite a scheduled revision |

Suggested future module boundaries: web, orchestration, contracts, planning, video-provider, narration, media, renderer, storage, publishing. These are design boundaries, not a request to create a monorepo or microservices. Start with one repository and one worker process.

## 3. Prototype persistence versus product persistence

M0a is a single-owner local experiment, without accounts or a dashboard. Save a versioned manifest and evidence locally; use atomic file replacement and checksums. It cannot claim multi-user durability or production recovery.

M0b exercises provider submission and reconciliation with a local durable attempt journal. Before M2 concurrency/recovery acceptance, move orchestration records into Postgres and test transactional claims/reservations. Prefer an existing compatible local Postgres if available; selecting/installing a runtime is part of future authorized setup. Do not run a large multi-container stack on the 8 GB Mac merely to render one scene. The local journal is never a substitute for the V1 transactional queue.

| Entity/record | Required fields and invariants |
|---|---|
| Project | ID, owner, original input, title, current draft, latest successful render, deletion state |
| Revision | Immutable ID, parent, versioned scene specification, input hash, approval timestamp, approver; draft saves use optimistic version checks |
| Scene | Stable ID, order, narration, visual intent, asset kind, prompts, optional reference, expected duration and selected clip versions |
| Asset | Owner/project, kind, storage key, checksum, bytes, source duration/resolution/fps, provenance, validation state, retention deadline |
| Narration segment | Scene/revision, approved text, voice/version, checksum, sample count/rate, measured start/end |
| Generation attempt | Logical request ID, provider/model/version, canonical request hash, idempotency key, remote ID if known, state, sanitized error, estimate/actual cost |
| Job/task | Revision, stage, dependencies, lease owner/token/expiry, attempts, next retry, cancellation flag, outputs |
| Budget/reservation | Authorization ID, currency, expiry, total/per-job cap, reserved/settled amounts, attempt linkage, price snapshot |
| Render | Immutable manifest hash, source revisions/assets, technical properties, validation report and output key |
| Publication | Approved render/caption hash, timezone/schedule, connection, remote ID and reconciliation state |

Never use mutable signed URLs as asset identities. Store provider URLs only as restricted temporary retrieval metadata. Every job belongs to an immutable revision; a later edit cannot change an in-flight job's inputs.

## 4. Internal contracts

These are data/API design requirements, not implementation code or provider endpoint claims.

### Scene and render manifest

A validated scene specification includes schema version, stable scene ID, narration text, caption text, visual intent, asset kind, prompt, optional image asset ID, target duration and framing. A generated clip request adds model capability version, native resolution, supported duration/frame count and optional seed. Seeds are provenance, not a guarantee of reproducibility.

A render manifest resolves every scene to validated local asset paths/keys, source trims, timeline frame ranges, narration sample ranges, caption cues, overlays and output settings. It includes renderer/template version and source hashes. No arbitrary JavaScript, shell commands, network URLs or filesystem paths may originate from model output.

### Video provider adapter

| Operation | Input | Required result |
|---|---|---|
| Capabilities | Selected model/version | Allowed inputs, duration/frame options, aspect/resolution, native audio, rate/concurrency limits, idempotency/cancel/status support |
| Estimate | Valid clip request + price snapshot | Maximum billable amount or explicit unknown; unknown pricing blocks paid submit |
| Submit | Valid request + logical idempotency key | Remote ID, or definite rejection, or uncertain outcome |
| Status/reconcile | Remote ID or supported lookup key | Pending/succeeded/failed/canceled/unknown with authoritative evidence |
| Retrieve | Confirmed result | Controlled download descriptor, expiry and source metadata |
| Cancel | Remote ID | Confirmed cancellation or unsupported/unknown; never imply cost reversal |

M0a can use a permitted manual demo to prove motion quality. M0b must validate programmatic access that is allowed by the service, persists request identity, and survives interruption. If a free endpoint cannot support these semantics, report the limitation and block integration acceptance; do not automate a website by bypassing access restrictions.

### Application operations

| Operation | Contract |
|---|---|
| Save draft | Owner-scoped project + expected draft version; reject stale writes with a recoverable conflict |
| Propose storyboard/revision | Input or current revision + request; return structured proposal for review |
| Approve and generate | Approved immutable revision + client idempotency key; return durable job ID promptly |
| Read job | Owner-scoped state, stage counts, retry/block reason; no secret/provider payload leakage |
| Revise/regenerate scene | Scene ID + selected revision + requested changes; create a new revision and show affected dependencies |
| Cancel job | Set durable cancellation intent; report any already submitted external work separately |
| Get media | Verify ownership and asset readiness, then issue bounded access |
| Delete project | Tombstone, cancel scheduled jobs, revoke new access, then clean up asynchronously |
| Publish/schedule | Separate approval of exact render and caption; never triggered by export alone |

Prototype authentication bypass, if used for a loopback-only single-user harness, must be absent from hosted builds. All product endpoints require authentication and tenant isolation before M3 passes.

## 5. Generation pipeline

| Stage | Input → output | Validation/checkpoint |
|---|---|---|
| 1. Plan | Topic/notes → scene proposal | Structured schema, supported visuals, narration structure, estimated 60–90 seconds |
| 2. Approve | Edited proposal → immutable approved revision | Preserve exact narration/visual decisions; no generation before approval |
| 3. Measure narration | Approved text → audio segments and measured timeline | Intelligibility, complete speech, timing; ask for a reviewed adjustment if duration cannot fit |
| 4. Allocate shots | Measured scene lengths → supported clip requests | Cover each footage scene; account for trim waste and transitions; reserve budget before external work |
| 5. Generate footage | Requests → provider jobs → source clips | Actual synthesized motion, status reconciliation, provenance, bounded concurrency |
| 6. Validate media | Sources → normalized working clips | MIME/signature, decode, duration, dimensions, fps, safety and resource limits |
| 7. Build timeline | Audio + clips + captions → immutable render manifest | No gaps/overlaps beyond intended transitions; visual/audio alignment; approved source identities |
| 8. Render | Manifest → temporary MP4 | Single local render, bounded resources, no external network assets |
| 9. Verify and commit | MP4 → accepted render | Probe/playback, duration, 1080 × 1920, H.264/AAC, complete audio/captions; atomic asset commit |
| 10. Preview/revise/export | Accepted render → selected revision/download | Preserve old successful render until replacement passes |

Narration is measured before spending on footage even though users experience a single Generate action. Planning words-per-minute is only an estimate, never the export timing authority.

### Timing decisions

- Use integer audio sample positions and a fixed 30 fps output timeline as the initial design. Keep native footage fps in provenance; normalize without claiming interpolation creates higher-quality generated motion.
- Synthesize phrase-level narration segments with explicit measured pauses. Compute cumulative boundaries from samples, then map absolute times to frames to avoid accumulating per-phrase rounding errors.
- Phrase captions are the first version; do not market karaoke/word-level alignment. Text-only corrections keep timing unless the phrase becomes unreadable; split/reflow within the measured segment or request reviewed narration changes.
- Use hard cuts first. Later crossfades must include overlap in timing and clip coverage. No frozen frames, unapproved loops or severe slowdowns to manufacture duration.
- A 7-second narration scene may need two supported 5-second clips, trimmed to 7 seconds. Do not assume one scene equals one provider request. If total footage cannot fit the authorized budget, block before submission and offer an explicit scope change; do not silently degrade to templates.
- Output target is 1080 × 1920 with one caption style. Early 720p renders benchmark the Mac but do not pass the final export gate. Low-resolution footage must be disclosed even inside a 1080p file.
- Controlled overlays/captions can align within 500 ms to phrases. Exact events inside stochastic generated footage cannot be assumed frame-controllable; inspect, trim or regenerate when a scene misses its approved semantic cue.

## 6. Revision dependency rules

| Change | Reuse | Recompute |
|---|---|---|
| Caption spelling/style | Clips and narration | Caption layout and render |
| Scene prompt/reference | Other scenes and unchanged narration | Selected clip request(s), normalization, composition |
| Narration text | Unchanged scenes; affected footage if it still fits and remains relevant | Affected audio, captions/timing, dependent render; request more footage only if necessary |
| Scene order | Source audio/clips | Global offsets, transitions, captions and render |
| Trim point | Source clip | Scene timing/coverage validation and render |
| Shorten/expand | Compatible assets | Reviewed plan, then only invalidated dependencies |

Cache/reuse keys include approved input hashes, model/voice versions, settings, reference hashes and normalization/render versions. Regenerate intentionally creates a new attempt; it must not accidentally return the previous cached clip. Source assets remain immutable. Tenant-specific assets are never deduplicated into publicly accessible shared media.

## 7. Job states, leases and failure recovery

Product job lifecycle remains queued, running, retrying, succeeded, failed or canceled. Waiting is a persisted reason alongside queued/running, not fake progress: provider pending, quota exhausted, worker offline, approval needed or uncertain submission. Store next eligible time and last heartbeat. Show completed tasks/stages rather than invented percentage estimates when provider progress is unknown.

Provider attempt states: prepared → submitting → accepted → pending → succeeded/failed/canceled. A submitting attempt interrupted before remote identity is saved becomes **uncertain**, not retryable by default.

- Claim ready tasks transactionally with a lease and fencing token. A stale worker cannot commit outputs after lease replacement. Initial design targets: heartbeat every 15 seconds, lease 90 seconds, configurable after testing; provider generation waiting uses durable polls rather than holding a process lock.
- Write submission intent and budget reservation before a remote call. Save the remote ID immediately. On timeout, reconcile by remote ID/idempotency key if supported; if impossible, pause for operator resolution. Exactly-once external generation is not assumed.
- Use at most two automatic retries for definitively transient failures, with backoff/jitter and provider retry hints. Polling an existing job is not a new generation attempt. Quota exhaustion pauses; moderation or invalid inputs return actionable errors without blind retries.
- Stage timeout values are selected from provider behavior and measured local render times during M0. HTTP timeout never proves the provider did not accept work; generation timeout does not release uncertain cost reservations.
- On restart, inspect expired leases, in-flight remote jobs and temporary files. Reuse only verified outputs. Do not replay every stage from the beginning.
- Cancellation stops new submissions. Reconcile already accepted work, settle any charges, and delete orphan results according to retention. Late callbacks cannot revive a deleted project or canceled publication.
- Output publication is atomic: stage temporary file, verify, commit asset record/checksum, then update latest successful render. A crash before commit leaves a reclaimable temporary object, not a successful video.

## 8. Cost and quota enforcement

The operational default is paid generation disabled and total incremental service budget ₹0. Validate free entitlement and no automatic overage before using even a purported free endpoint. Retry limits and free-quota limits still apply. No payment/hosting account is created by this plan.

For any later authorized paid experiment, persist service, currency, total/per-job ceilings, expiry, tax/FX reserve, attempt cap and authorization reference. Use integer monetary units at adequate provider precision, not floating-point rupees. Quote using a recorded rate and conservative rounding; keep actual provider-currency charges separately.

Within one transaction, verify settled spend + outstanding reservations + new maximum cost stays within both job and global authorized limits, then reserve and create submission intent. Unknown outcomes retain their reservations. Release only on authoritative evidence of no charge; refunds are separate ledger entries. If a provider cannot offer a bounded maximum charge, paid execution stays blocked.

Budget tests must include simultaneous enqueue requests, duplicate clicks, uncertain submissions, refunds, cancellation and authorization expiry. Infrastructure alerts are not a strict invoice cap; metered cloud activation still needs its own budget approval. V1 logs internal costs only, never customer wallet/payment balances.

## 9. Security, storage and operations

- Strict schema validation and size limits for notes, prompts, uploads and provider outputs; AI content is data, never executable code.
- Stage media under controlled directories with generated names; reject traversal and unsafe symlinks. Restrict decoder/renderer CPU, memory, wall time, filesystem and network access.
- Controlled provider downloads must validate host, DNS/IP destination and every redirect; block private network destinations and limit bytes. Verify image/video signatures and decoding, not extensions alone.
- Encrypt credentials through the selected platform's supported secret mechanism; narrow worker permissions and redact secrets, signed URLs, scripts and private prompts from routine logs.
- Local prototype media is outside the public web directory. Hosted pilot uses private R2 objects; browsers receive authorized short-lived access. Public demo copies are explicitly licensed and separate.
- Record transient files, retained clips, finals and failed attempts. Proposed cleanup: temporary files within 24 hours when no active lease references them; pilot exports and dependent clips retained 30 days with user notice. Finalize backup retention and restore objectives before external users; deletion must be coordinated with active jobs and scheduled publication.
- Logs/metrics include correlation IDs, stages, attempts, queue delay, generation/render time, bytes, output properties, quota/budget rejection and cost per successful export. Use sanitized error categories; avoid logging raw media URLs.
- Readiness for an external pilot requires ownership policies, auth delivery, restore drill, worker offline handling, storage limits and consent/disclosure. A local demo does not pass these gates.

## 10. Mac M1 test envelope

The PRD records an M1 MacBook Air with 8 GB unified memory and 7 GPU cores. Available disk was approximately 99 GiB at inspection, not a permanent guarantee. No narration/render benchmark has run.

Keep one memory-heavy stage active at a time. Stop/release TTS resources before launching a render where feasible. Prefer remote video generation; no local diffusion checkpoint download is required. Record installed tools before proposing additions, and avoid assuming Docker or a specific Python/Node runtime is already available.

Safe progression: five-second 720p composition → narration separately → combined scene → 30-second fixture → 60–90-second fixture → final 1080p validation. Measure elapsed time, peak memory, Activity Monitor pressure, swap growth, disk/output size and responsiveness. Run a few repeats to observe sustained behavior; do not report a credible p95 from three runs. Stop on persistent red memory pressure, rapid swap growth, unresponsiveness or less than a 20 GB disk reserve. Do not bypass thermal protection. A failed local benchmark blocks the affected gate, not the original product requirement.

## 11. Prototype plan and deliverables

All steps below are future work after explicit implementation approval. Account creation, cloud activation and any paid budget remain separately gated. No fixed delivery-date promise is made before access and hardware measurements.

| Step / PRD milestone | Work | Evidence and pass condition | Stop condition |
|---|---|---|---|
| P0 / M0 preparation | Inventory installed tools; check permitted free video access and exact model/voice licenses; identify smallest setup | Written environment/provider capability record; verified no-charge path or explicit unavailable result | Paid activation needed, missing permission or incompatible runtime |
| P1 / M0a footage | Generate one short clip with clear visible motion using permitted free access; save provenance | Downloadable genuine generated clip, source dimensions/duration, prompt relevance and actual cost recorded | No usable free endpoint; do not substitute stock footage or animation |
| P2 / M0a complete scene | Narrate approved short text, measure phrases, add synchronized captions and compose one 5–10-second scene locally | Playable vertical MP4, complete narration, readable captions, timing review, resource measurements | Memory/render failure or quota exhaustion; preserve outputs |
| P3 / M0b automation | Implement one provider adapter and durable attempt journal; repeat with authorized requests | Submit/status/download works programmatically; interrupted accepted job resumes without duplicate generation | Manual-only access or unreconcilable uncertainty blocks automated acceptance |
| P4 / M0b duration | Build 30-second internal fixture, then a reviewed 60–90-second video with generated footage across its scenes | Measured coverage/timing, 1080 × 1920 MP4, cost/latency and source-resolution disclosure | Insufficient quota/budget or failed quality/format gate |
| P5 / M1–M2 revisions and recovery | Add structured planning/review; migrate queue and budgets to Postgres; selected-scene revision | Caption-only edit spends no generation; clip edit preserves unrelated checksums; restart/cap tests pass | Duplicate submissions, budget violations, stale overwrite or changed approved script |
| P6 / M3 private product | Auth, dashboard, storage history, deletion, onboarding and accessibility | Multi-user isolation, retained revisions, autosave conflicts and restore tests pass | Any critical privacy/security defect |
| P7 / M4–M5 pilot | Manual publishing package/calendar; conditional Meta; approved hosted pilot and public-site gates if requested | PRD quality/usability targets and operational readiness; live publication only with actual confirmation | Missing Meta access blocks live publishing only; missing cloud authorization blocks hosting |

Do not build the dashboard, billing or marketing pages before P1/P2 establish that actual footage can be produced and composed on the proposed setup. P0 can identify a blocker without pretending the prototype exists. Free GPU quota may require spreading tests over multiple days; never rotate accounts or evade quotas.

### Concrete first fixture

Use a simple neutral visual topic: a paper boat moving gently across a shallow pond, without people, logos or generated text. Approve a one-scene visual plan and a short narration explaining the observed motion. Request a supported short clip length, then fit reviewed narration naturally to the available duration. This makes motion, timing, framing and media validity easy to judge; complex anatomy, text rendering and character continuity are unnecessary for the first proof.

Capture: approved prompt/script, provider/model/settings, permitted access/license notes, request ID if available, source clip, narration audio, timing manifest, final MP4, probe results, human quality review, elapsed time, memory observations and cash/credit usage. Store evidence locally without committing secrets, signed URLs or large media to Git. These artifacts will be created only during the authorized experiment, not by this plan.

### Go/no-go interpretation

- P1 pass proves a usable generated clip; it does not prove an API integration or finished product.
- P2 pass proves one end-to-end scene; it does not waive 60–90-second product requirements.
- P3/P4 pass proves automated generation and complete duration/export feasibility.
- Mock responses may test orchestration, but cannot satisfy any real-footage gate.
- If the free route fails, report the exact access/quality/quota limitation and the smallest capped alternative. No paid calls until numeric approval; do not redesign V1 into an animation-only product.

## 12. Verification and PRD traceability

| Requirement group | Tests/evidence | Gate |
|---|---|---|
| FR-03–07, FR-23–24 planning/footage | Valid/invalid schema, approval, supported capabilities, genuine motion, references if enabled, no animation substitution | M0–M1 |
| FR-06, FR-08–10, FR-13 timing/export | 60/75/90-second fixtures, actual measured audio, captions within 500 ms in reviewed cues, dimensions/codecs/mobile playback | M0b–M2 |
| FR-11–12, FR-25 revisions | Caption-only, narration edit, clip regeneration, trim and reorder; unchanged checksums; old render retained | M2 |
| FR-14–16, FR-26–27 reliability/cost | Stale save conflict, crash after submit, expired lease, callback replay, bounded retries, concurrent reservation and cancellation | M2 |
| FR-01–02, FR-17, FR-22, FR-28 private product | Tenant access denial, dashboard restoration, asset deletion/retention, keyboard/mobile access, backup restore | M3 |
| FR-18–21, FR-29 publication | Manual package, caption approval, timezone, connection expiry, unknown remote response and duplicate prevention | M4 |
| PRD sections 8/10/12–16 hosted/public launch | Framework compatibility, storage privacy and cost limits, public SEO privacy audit, operating budget and expiry controls | M5/public launch |

Use five topic types and the PRD's 19/20 fixture reliability target. Report provider outages and quota failures separately and also show total observed completion so exclusions do not hide user impact. Keep regression tests deterministic where possible; live provider tests consume only authorized free quota or an explicitly approved test budget. Five invited users and repeat-use measurements belong after technical feasibility, not before.

## 13. Handoff and remaining gates

Settled design choices: one provider, measured narration before footage allocation, fixed validated manifests, single local heavy worker, durable asynchronous orchestration, selective asset reuse, internal budget ledger and private storage. No further preference questionnaire is needed for these choices.

Still unverified: usable permitted free endpoint, exact pinned tool/model versions and licenses, TTS/render performance, provider request reconciliation, auth/storage account eligibility and Meta permissions. These are implementation experiments, not missing product decisions. Hosting and payments are not prerequisites for the first scene.

Next implementation task after approval: **P0–P2, prove one short actual AI-generated video scene with narration, synchronized captions and local MP4 export at ₹0 incremental service cost.** Stop if permitted free access is unavailable and report the blocker before any paid alternative.

The PRD's official-source register remains the pricing/platform reference. This design adds proposed internal contracts and experiments; it makes no new provider entitlement, performance or current-price guarantee. Recheck the relevant official source at activation and record the exact configuration used.


## 15. Implemented local contracts and diagnostic boundary

As of 22 October 2026, `prototype/planner.mjs` requests an OpenAI-compatible chat
completion (`AI_BASE_URL` + `/chat/completions`) and validates the reply locally;
`storyboard.mjs` validates unique IDs, bounded plain text, duration estimates and
footage coverage. `plan.mjs` journals attempts and emits a draft plus approval hash.
The live adapter stays off until the configured model/provider is explicitly verified
by the operator. An environment flag is an operator attestation, not an enforceable
provider budget. The PRD records the configured OpenAI-compatible provider (currently
the DeepSeek gateway), not Gemini, as the planning vendor. No automatic paid fallback
or silent model substitution is allowed.

`narrate.mjs` accepts an approved board and scene ID, checks free speech allowance,
saves raw alignment and narration hash, and never automatically retries uncertain
requests. `compile.mjs` resolves relative local assets, probes durations and imports
only the expected alignment fields. `timeline.mjs` checks hashes, measured captions,
coverage and final duration. `StoryboardVideo.jsx` consumes timeline props; its
browser-safe validator rejects malformed timelines and arbitrary media URLs.

Reusable `ProcessGraphic.jsx` renders diagram labels/cues from data. Topic-specific
legacy components are retained as demos. `graphics-test.mjs` is an explicit offline
fixture using cached water-cycle audio and measured phrase captions. It does not
invoke the planning provider, generate footage, select a new voice or manufacture word timestamps.
Graphics highlights are phrase-aligned, not word-perfect. Diagnostic output is
visibly labeled and cannot pass product footage acceptance. The user-facing product
remains 60–90 seconds; diagnostic length follows the existing recording.

The local compiler currently uses a provisional 50% minimum footage share in both
estimated and measured timelines. Future multi-user approval/asset provenance must
be server-controlled; local JSON is trusted operator input only. Generated props
and copied media stay ignored, and `remotion/public` must not be deployed publicly.
One local rendering worker is used; no new dependencies, accounts or paid services
are needed for this regression check. Provider integration, resumable orchestration
and the complete 60–90-second footage run remain future milestones.

## Idea & prompt planning adapter — 26 October 2026

Feature 1 adds `lib/idea-planner.js`, a server-only OpenAI-compatible adapter for the
Idea step. It uses the same `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` and operator
verification flag as the storyboard planner. The current configuration is the
operator-provided DeepSeek gateway; Gemini is not the default vendor.

The adapter receives topic, optional audience, optional notes, optional refinement
feedback and up to five previous suggestions. It returns 3–5 suggestions, each with
a title, hook, angle, 3–5 outline beats, visual direction and a production-ready
5-second vertical scene prompt. All input is treated as untrusted reference data.
Output is validated locally for bounds, duplicates, links, control characters and
unsafe markup. Invalid or unavailable provider output fails with a bounded error;
there is no canned suggestion fallback.

The latest suggestion set is cached in the browser and saved per project when
migration `0003_project_idea_suggestions.sql` is applied; the selected idea is
saved to Supabase Postgres through the project API; the model cannot write
ownership, approval, status or publication fields. The Idea page is the first step of the four-step shell:
**Idea → Storyboard → Video → Publish**. Storyboard generation, footage generation,
narration, rendering and publishing remain separate features.

The adapter is not evidence that the provider is free or that a full video can be
generated. The operator flag is an attestation, not a provider-side budget cap.

## Export probe — 5 November 2026

`prototype/media.mjs` now exposes `validateExportInfo(info, expected)` and
`assertExport(file, expected)`. The pure validator checks the MP4 container,
duration against the compiled timeline (±0.15 s), 1080×1920, H.264 video and AAC
audio. `assertExport` adds a full FFmpeg decode pass and a `volumedetect` check
that rejects silent or unexpectedly quiet narration.

`prototype/render-timeline.mjs` accepts a compiled `props.json`:
- Without `--mp4`, it bundles Remotion, renders `StoryboardVideo`, probes the
  partial export, and only then renames it to `timeline.mp4`.
- With `--mp4 <file>`, it checks an existing export against the timeline without
  rendering.
- It writes `report.json` with `newProviderCalls: 0`,
  `newServiceSpendINR: 0`, timeline frames, duration, resolution, codecs, full
  decode and mean audio level. Graphics diagnostics are labeled
  `graphics-diagnostic-not-ai-footage`.

The live check used a 3-second graphics diagnostic and the existing 42.7-second
water-cycle MP4; a deliberately mismatched duration failed with exit 1. This is
not evidence of an actual AI-footage product export; footage generation remains
blocked on provider access and budget.

## Reference media storage — 6 November 2026

The Idea step can store optional project-level reference images and clips in the
private media bucket. This is a storage and review slice, not an image-to-video
integration.

- Object keys are server-generated under
  `users/<ownerId>/projects/<projectId>/reference/<uuid>.<ext>`.
- A `media_assets` row starts `pending`; finalize checks the stored object's HEAD
  size/type and the first 16 bytes for a PNG/JPEG/MP4/WebM signature, then marks
  it `validated`.
- Mismatched objects are deleted and marked `rejected`; quota is released.
- The current per-owner quota is 500 MB. Pending intents expire after one hour.
- A project delete cascades metadata and best-effort deletes active objects.

The generation pipeline does not read these references yet. There is no
`scene_assets` binding, no `referenceAssetId` on a scene, no full decode/probe,
and no provider capability check for image-to-video. Image-to-video remains
conditional on the chosen provider, rights review and input-security tests. A
validated reference is therefore not evidence that a footage request can use it.
Generated footage and exports remain worker-only.

## Media probe + scene binding — 7 November 2026

Finalize now runs a native probe before an asset becomes usable:

1. Copy the uploaded object to a fresh committed key.
2. Download the committed copy to a bounded server temp file.
3. `ffprobe` for dimensions, duration, video/audio codec, frame rate and format.
4. Full `ffmpeg` decode; a decode failure rejects the upload.
5. Store normalized `native_properties` with the `validated` row, update the
   asset key to the committed key and delete the original upload key.

Images must be 1–8192 px per side. Videos must be 0.1–60 seconds and use H.264,
VP8, VP9, AV1 or HEVC. The probe does not make image-to-video available; provider
capability, rights and input-security checks remain separate gates.

A storyboard scene may carry an optional `referenceAssetId` for a validated
reference in the same project. The server checks ownership and readiness on every
draft/approval save, and the review hash includes a present reference. This is a
binding only: the generation manifest does not resolve the reference yet, there is
no `scene_assets` table, and the provider does not receive the image/video. A
future slice must add normalized bindings, provider capability validation,
reference hashing and generation-manifest resolution before any footage request
can use it.

## 16. Free project graphics render (7 November 2026)

`POST /api/v1/projects/:id/graphics-render` starts a local background job for an
approved storyboard. The job translates the scenes through the configured
OpenAI-compatible gateway in 4-scene batches. It separates the spoken `narration`
(Devanagari Hindi for the voice) from the on-screen `title`, `displayNarration`
and `labels` (Latin-script Hinglish for captions and diagrams), asks for one
diagram type per scene, checks the ElevenLabs free allowance before every speech
call, writes measured alignment and audio, then renders `ReelExplainer` with
Remotion. The captions use the measured speech timing with the Hinglish display
text, so the voice stays Hindi while the screen stays readable Hinglish.
The job is filesystem-backed under `prototype/output/graphics-jobs/<runId>/` and
is polled by the Video step. The authenticated file route streams the finished
MP4; there is no public URL.

The diagram set is `statement`, `steps`, `compare`, `checklist`, `timeline`,
`recap`, `problem-fix`, `cause-effect`, `big-number` and `cycle`; the renderer
falls back to local content/keyword heuristics when the AI omits a type. The new
layouts use SVG icons and content-specific composition (problem/fix panels,
cause/effect/result chain, oversized metric ring, three-node loop). Captions are
full sentences with the current phrase highlighted; the timing still comes from
the measured speech alignment. The old payment-systems diagrams remain available
for the standalone reel. Every export must pass the MP4 probe (duration,
1080×1920, H.264/AAC, full decode, audible narration) before `status.json` becomes
`done`. The report records `newProviderCalls: 0` and `newServiceSpendINR: 0`; the
voice call is covered by the free ElevenLabs allowance and the translation by the
verified free AI gateway.

Live evidence: job `9464445f-41af-4c8b-9256-da41c38eeee4` rendered 84.715s,
1080×1920, H.264/AAC, full decode, −26.4 dB, 5.8 MB, ₹0, with Hinglish on-screen
text/captions and Devanagari Hindi voice narration. The clean Video UI showed a
298×531 compact preview, the player reported `readyState 4` and the download
route returned `200`. F46 then rendered `b723ed26-d67e-4b0c-9ea1-b4ce4c90a460`
at 88.363s, 1080×1920, H.264/AAC, full decode, −26.6 dB, 6.5 MB, ₹0, using the
new cause→effect, big-number and compare layouts and full-sentence highlighted
captions; the UI preview and download passed. This is motion graphics, not AI
footage, and does not satisfy the footage gate. The free premade Roger voice has
an English accent; native Hindi voice selection remains a quality follow-up.

The production Video card does **not** expose a test control. The API still
supports `testMode:true` for internal diagnostics: it skips translation, uses one
fixed one-scene test script, applies a 3–8s duration guard instead of the 60–90s
product guard, and labels the data/footer/report `UI TEST · NOT A FINAL EXPORT`.
Internal test: 5.035s, 1080×1920, H.264/AAC, full decode, −27.1 dB, 346 KB, 69
ElevenLabs credits, player `readyState 4`, download `200`. This is a diagnostic,
not a product export.

## 17. Videos library (7 November 2026)

The Videos page (`/app/videos`) reads completed job metadata from the same
`prototype/output/graphics-jobs/` directories used by the renderer. The API
returns only the signed-in owner's `done`, non-test jobs with a positive report
duration, newest first, and the page shows real generated thumbnails, duration,
language/voice, an authenticated Play modal and Download. Thumbnails are produced
at render time with ffmpeg and were backfilled for existing jobs. Failed/test/
other-owner jobs are excluded; there are no dummy videos. The API reads durable
`video_renders` rows first and merges local completed jobs that have not been
backfilled. The page shows a **Saved**/`Local only` state and a **Save to cloud**
action; no AI or voice credits are used. Local job retention/cleanup remains a
follow-up.

## 18. Scene text editor (7 November 2026)

The scene text editor seeds from the latest completed render's `data.json` (or
prepares text through the free AI gateway) and saves a per-project script under
`prototype/output/graphics-scripts/`. The render API validates the script against
the approved storyboard, adds it to the job JSON, and the renderer uses the saved
headline, diagram, labels, Hinglish captions and Devanagari narration instead of
re-translating. Voice generation still happens only when the user starts a render;
editing and saving text consume no voice or video credits. The validated script is
stored in `project_graphics_scripts` with a local mirror; the render API reads the
durable script first and falls back to the local file when the table is
unavailable. The Projects library uses the same completed-render metadata for its
real **Video ready** state. Local files remain a fallback, not the production
source.

## 19. Video backup action (7 November 2026)

`POST /api/v1/videos/backup` copies the owner's completed non-test job artifacts
(video, thumbnail, scene text, job/status/report) into
`~/Vydrivo-Backups/videos-<timestamp>/` with a manifest. It is a local safety copy
only and does not change the render pipeline or use provider/voice credits.
Durable production storage is implemented by the next slice.

## 20. Durable video + scene script storage (8 November 2026)

When the authenticated render-status poll first sees `state:"done"`, the API
uploads `output.mp4`, `thumbnail.jpg`, the exact `data.json` render script and a
metadata JSON to the private S3-compatible bucket under
`users/<owner>/projects/<project>/renders/<runId>/`. It then upserts
`public.video_renders` with owner/project/run IDs, title, language, voice,
duration, dimensions, keys, bytes and metadata. The operation is idempotent;
`POST /api/v1/videos/backfill` retries it for existing local runs and the Videos
page exposes **Save to cloud**.

The file and thumbnail routes check `video_renders` first and redirect to
5-minute private signed URLs; `?download=1` adds an attachment filename. If the
table or storage is unavailable, they fall back to local files and the API
reports `storageAvailable:false`. Editable scene text is stored in
`project_graphics_scripts` with a local mirror. No object bytes, storage
credentials or service-role keys reach the browser. Migration `0008` was applied
8 November 2026 and all 7 existing videos were saved; the authenticated Chrome
pass loaded the durable MP4 (`readyState 3`, 88.36s, 1080×1920), signed download
and 12-scene script with no console errors. Production Amplify still needs
`MEDIA_S3_*` and a new build.

## 21. Instagram connection and Reels publishing (14 November 2026)

The Settings page begins the Instagram API with Unified Login flow. The server
creates a single-use 256-bit state, stores its SHA-256 hash with the
return origin and a 10-minute expiry, and returns the Facebook Login dialog URL
(`client_id`, `config_id`, `redirect_uri`, `response_type=code`, `state`,
`prompt=login`) from `GET /api/v1/instagram/connect`. The app secret is never
sent to the browser.

The public callback `GET /api/v1/instagram/callback` peeks the state through
`peek_instagram_oauth_state`, exchanges the code at
`graph.facebook.com/v27.0/oauth/access_token` with the configured
`redirect_uri` repeated (Meta requires an exact match), reads the client business ID and
`/me/assigned_instagram_accounts`, encrypts the SUAT with AES-256-GCM, and calls
`complete_instagram_connection` to consume the state and upsert the connection in
one transaction. Failures return to `/app/settings` with a short reason
(`denied`, `state`, `expired`, `no_account`, `token`, `setup`, `failed`); secrets
and provider payloads are not logged or placed in the URL.

The callback redirect URI stays on the deployed HTTPS origin. The state row
records the browser's starting origin (localhost or the deployed app), so the
callback returns the browser to the correct Settings page in both cases.
`INSTAGRAM_TOKEN_KEY` optionally supplies the 32-byte encryption key; otherwise it
is derived from `META_APP_SECRET`. The browser receives only
`{instagramUserId, username, businessId, connectedAt}`.

The Settings page reads `GET /api/v1/instagram/connection`, shows **Connect
Instagram** / **Connected as @username** / **Disconnect**, and keeps the
disconnect confirmation in-page. Tests cover the login URL, state hashing,
return-origin allowlist, encryption round-trip and tamper rejection, account
selection and the Graph identity calls. Migration `0009` is applied and a live
localhost OAuth pass connected `@vydrivo`; the connect route also uses the
Settings `Referer` so a localhost start returns to localhost.

### Reels publishing

`POST /api/v1/projects/:id/graphics-render/:runId/instagram` starts one public
Reel for a cloud-saved render. The route requires the durable render to have a
`video_key`, checks the owner connection, signs the private MP4 with a
900-second presigned GET URL (the Meta fetch window; the app's normal download
signature stays at 300 seconds), and creates a Reels container with
`media_type=REELS`, `video_url`, `share_to_feed=true` and an optional caption
normalized to plain text and capped at 2,200 characters. The container ID and a
`processing` row are written to `instagram_publishes`; the browser receives no
token or storage credentials.

The Videos page polls `GET` on the same path every 5 seconds. Each poll reads
`GET /<container_id>?fields=status_code`; `IN_PROGRESS` keeps the row
`processing`, `ERROR`/`EXPIRED` fail it, and `FINISHED` calls
`POST /<ig_user_id>/media_publish` with `creation_id`. The resulting media ID is
stored with the permalink from `GET /<media_id>?fields=permalink`, and the row
becomes `published`. The poll stops after 3 minutes and the UI tells the user to
reopen the video, which resumes the same container instead of creating a second
post. Error codes are mapped to safe copy (`INSTAGRAM_TOKEN_INVALID`,
`INSTAGRAM_RATE_LIMIT`, `INSTAGRAM_MEDIA_PROCESSING`, `INSTAGRAM_MEDIA_REJECTED`,
`INSTAGRAM_REQUEST_REJECTED`, `INSTAGRAM_UNAVAILABLE`); the raw Graph payload and
token never reach the browser or the logs.

One row per `(owner_id, run_id)` prevents a duplicate post from repeated clicks.
The live verification on 14 November 2026 published the 70.4-second
`7f0410f2-e158-4f15-baad-93849136c2ba` render from project
`8b5ac7d7-1895-45ca-86ce-20a1f52dddd6`: container `17958025812038571`, media
`18473699506191501`, permalink
`https://www.instagram.com/reel/DfuOqebAgFw/`, published at
`2026-11-14T12:42:08Z` (~96 seconds of processing), zero console errors. The
public page rendered the Reel for a signed-out visitor. This slice publishes one
video at a time and does not schedule, bulk-upload or delete posts. Meta limits
an account to 100 API-published posts in 24 hours. Publishing for users outside
the app's tester accounts still needs Meta App Review with Advanced Access and
Live mode, and the `dev` callback is still undeployed.

### Project Publish step

`/app/projects/[id]/publish` reads the project through the existing project API
and the owner's videos through `GET /api/v1/videos`, then selects the first
matching project entry (the API sorts newest first). It reuses the same
`POST`/`GET` Instagram endpoints and the shared publish dialog, so the container,
token and polling logic has one implementation. The page itself adds no server
state: a posted row comes from the `instagram` badge on the video entry, and a
local-only render is blocked with a save-to-cloud link before the publish action
appears. The step rail and sidebar stage list now include Publish, and the Video
step links to it after a render finishes. Chrome verification covered posted,
ready and empty states with no console errors; no second Reel was created during
the pass.

### Posts library

`GET /api/v1/posts` is a read-only projection over `instagram_publishes` for the
signed-in owner. It reads the owner's latest publish rows, keeps only
`status = 'published'`, and joins each `run_id` to `video_renders` for the
render title, duration and thumbnail key. The response is sorted by publish time
newest first. The route returns no token, signed
storage URL or raw Graph payload. Published rows whose render row is missing stay
in the response with the saved caption as the title and `null` media fields, so a
deleted render does not hide the fact that a public post exists.

The Posts page (`/app/posts`, `components/dashboard/StudioPosts.jsx`) consumes
that response and adds no writes. Each card links to the project Publish step and
to the stored permalink; the empty state links to Videos and Settings. The page
explicitly says scheduling is not available, and no calendar, bulk upload or
delete action exists. `schedulingAvailable` stays `false` until a durable worker
and scheduler exist. Date labels use `lib/date-format.js` so the server HTML and
client hydration produce the same UTC string. The home step rail links Publish
once a render exists and marks the project **Posted** when that render has an
Instagram permalink.
