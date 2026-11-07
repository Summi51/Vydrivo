# Vydrivo V1 — Product Requirements Document

Version: 1.4
Date: 26 October 2026
Status: Product requirements; local prototype and authenticated dashboard implementation underway
Product owner: Founder
Budget: ₹0 total incremental service spend initially; paid APIs, hosting, storage, and upgrades require explicit numeric budget approval

## 1. Product decision and scope

Vydrivo turns an idea into an editable video containing actual AI-generated moving footage, narration, and synchronized captions. Users review a script/storyboard, generate clips, compose a video, revise individual scenes, and export or conditionally publish it.

Actual text-to-video footage is mandatory in V1. This decision supersedes the previous motion-graphics-only scope. Animated text, diagrams, and illustrations may supplement approved scenes; they cannot silently substitute for generated footage or satisfy the footage release gate. Vydrivo is for creators, educators, brands, and businesses; education is an initial test use case, not the product's exclusive identity.

Value proposition: **Turn an idea into an AI-generated video—with a reviewed storyboard, narration, captions, and control over individual scenes.**

Capability definitions:

- Generated footage: a video model synthesizes moving frames from text or supported image references.
- Generated images: still assets, not footage; image generation itself is outside V1.
- Motion graphics: programmed animation of text, shapes, and illustrations; supplementary only.
- Composition/rendering: assemble footage, audio, captions, and graphics into an MP4; this is not footage generation.

### 1.1 Current flow update — 26 October 2026

The user-facing V1 flow now follows the reviewed NamasteVideo.ai reference flow, adapted to Vydrivo's stack and AI-footage requirement:

**Idea → Storyboard → Video → Publish**

1. **Idea:** the user enters a topic, optional audience and notes, and chooses a voice preset. The configured planning model suggests 3–5 distinct directions. The user can use one, ask for a refinement, or keep their own topic.
2. **Storyboard:** the user generates a storyboard candidate from the saved idea, reviews it scene-by-scene or as a full script, and can generate another candidate. Saved candidates are versioned.
3. **Video:** the user generates footage for approved scenes, reviews each clip, and approves, rejects, trims or regenerates individual scenes before composition.
4. **Publish:** export and publishing remain later features. No fake publish state is shown.

Stack decisions for this flow:

- Authentication remains **Google + email/password on Supabase Auth**.
- Persistence remains **Supabase Postgres** with owner-scoped RLS.
- Planning uses the configured **DeepSeek gateway** through the existing OpenAI-compatible adapter (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`). Gemini is not the default vendor.
- Actual AI footage remains mandatory. Motion graphics remain supplementary and cannot satisfy the footage gate.

Feature 1 in this update is the **Idea & Prompt Studio**: topic, audience/notes, voice selection, AI suggestions, refinement, autosave to Postgres, and the four-step project shell. Storyboard generation, footage review and publishing are separate later features.

## 2. Objectives and non-goals

### Objectives

- Produce an editable 60–90-second video containing actual AI footage from a topic or pasted notes.
- Integrate one video-generation provider, with text-to-video required and image-to-video enabled only after capability and input-security tests.
- Let AI choose duration based on the explanation; expose no duration selector.
- Combine script and visual planning in one review step before rendering.
- Synchronize visual explanations, narration, and readable captions.
- Preserve projects and support targeted conversational revisions.
- Export vertical 1080 × 1920 MP4 files.
- Support a publishing workflow with manual export and conditional official Instagram integration.
- Validate the complete workflow using free software, available free API quotas, and existing hardware.

### Non-goals

- Guaranteed photorealism, perfect character/product continuity, avatars, voice cloning, or lip synchronization.
- Arbitrary animation from unrestricted AI-generated executable code.
- Full professional timeline editing, 4K export, multiple aspect ratios, or videos outside 60–90 seconds.
- User-facing billing, subscriptions, credit balances, cost controls, or branding controls.
- Teams, collaboration, social analytics, multiple social platforms, or automatic trend discovery.
- PDF/DOCX parsing, arbitrary URL fetching, web research, or long-video clipping.
- Guaranteed factual accuracy, search rankings, audience growth, or revenue.
- A production availability guarantee on free tiers or a sleeping local computer.

## 3. Capability status

All product capabilities are proposed and not implemented at document creation.

| Capability | Release status | Dependency |
|---|---|---|
| Account, dashboard, projects | Required | Auth configuration and database |
| Planning and conversational revisions | Required | Configured OpenAI-compatible provider (DeepSeek gateway) with operator-verified access |
| Script/storyboard review | Required | Validated scene-plan schema |
| Actual text-to-video clips | Required; release blocker | One validated provider and permitted access |
| Image-to-video clips | Conditional V1 | Selected provider support, reference rights, upload validation |
| Motion graphics | Supplementary | Supported components; never a footage fallback |
| AI narration | Required | ElevenLabs voice access, verified free allowance and applicable rights |
| Caption correction and synchronization | Required | Audio timing validation |
| Preview and vertical MP4 | Required | Local Remotion/FFmpeg benchmark |
| Autosave, job status, recovery | Required | Durable job records and worker |
| Manual publishing package and calendar | Required | Completed export |
| Instagram Connect and publishing | Conditional | Eligible account, permissions, platform approval |
| Automatic Instagram scheduling | Conditional | Live integration and continuously running worker |
| User-facing monetization | V2 | Measured unit economics and separate billing scope |

## 4. Users and primary jobs

1. A creator wants generated footage and a finished short video without operating multiple production tools.
2. An educator wants narration and a diagram to unfold together.
3. A brand or business wants a short explanation of a process, idea, or offering.
4. A returning user wants to correct one scene without rebuilding the entire project.

V1 is intended for adult account holders. Before any student-facing or under-18 deployment, reassess provider terms and audience requirements. Generated educational content remains subject to user review.

## 5. Core experience

**Idea → Review storyboard → Generate actual clips → Voiceover → Synchronized captions → Composition → Preview/edit → MP4 export or conditional publishing**

This is the user-facing flow. Internally, narration can be measured before clip generation to avoid buying footage of the wrong duration.

### A. Start a project

The user signs in, creates a project, and enters a topic, pastes notes, or asks AI to brainstorm. The UI may ask a short clarifying question when the intent is ambiguous. It must not force a lengthy setup questionnaire.

### B. Review combined script and storyboard

AI proposes a title, target duration, and ordered scenes. Each scene displays narration, its visual explanation, and approximate timing together. Users can edit text directly or request changes conversationally.

AI selects a duration between 60 and 90 seconds. “Make it shorter” moves toward 60 seconds; “explain this in more detail” moves toward 90. At the boundary, the system explains the limit and proposes simplifying or replacing content. It does not silently exceed the range or pad with empty material.

A 30-second output is an internal feasibility/benchmark fixture only, not a V1 user-facing duration. The earlier 30/60/90 selector requirement is superseded by the confirmed 60–90-second conversational experience. Requests below 60 seconds explain the boundary; they do not silently export a shorter video.

### C. Generate

Generation begins only after an explicit Generate action on the reviewed storyboard. The worker validates provider capabilities and the spending reservation, measures narration, generates required footage clips, validates and normalizes media, synchronizes captions, composes scenes, and renders a preview/export asset. Provider unavailability or exhausted quota pauses the job; it never changes a footage scene into an animation without approval. An animation-only output cannot pass V1 completion.

If measured narration cannot fit naturally within the allowed duration, return the proposed script adjustment for review. Do not silently rewrite approved narration or apply extreme speed changes.

### D. Preview and revise

The user watches the actual rendered result, corrects captions, or requests changes. The system describes which scenes or assets will change, creates a new revision, and preserves the previous completed version until the replacement succeeds.

### E. Export or publish

The user downloads the MP4 or prepares an Instagram post with an editable caption. Manual upload is always available. Live publishing and scheduling appear only when their dependencies are satisfied.

## 6. Functional requirements and acceptance criteria

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-01 | Authentication | A user can sign in, sign out, and recover access through the chosen auth flow. User A cannot access User B's projects or media. |
| FR-02 | Dashboard | Show drafts, generating projects, completed videos, and failed jobs. Reopening restores the latest saved revision. |
| FR-03 | Idea planning | Accept a topic or pasted notes; preserve original input. Proposed initial limit: 10,000 characters, with a clear validation message. |
| FR-04 | Brainstorming | Suggest a small set of relevant concepts; selecting one creates an editable storyboard. Generated suggestions are not presented as verified trends. |
| FR-05 | Combined storyboard | Every scene exposes narration and visual intent together. Users can edit, reorder, add, and remove scenes before generation. |
| FR-06 | Automatic duration | AI proposes 60–90 seconds without a selector. The final validated output remains within 60.0–90.0 seconds. |
| FR-07 | Actual footage | Generate moving footage from approved scene prompts through one provider. Every completed V1 video contains at least one substantive generated-footage scene, and every storyboard scene marked footage is fulfilled by footage. No still-image pan, repeated frame, or template-only render passes this requirement. Supplementary diagrams/text must be represented in the approved storyboard. |
| FR-08 | Narration | Produce complete intelligible speech for the approved script. Audio is measured before final scene timing. No clipped words or unintended missing sentences in launch fixtures. |
| FR-09 | Concept synchronization | Visual events can anchor to narration phrases. In reviewed fixtures, each key reveal occurs within 500 ms of its intended phrase cue. |
| FR-10 | Captions | Captions match narration, remain inside safe bounds, and allow text correction. Correcting caption text does not automatically change speech. |
| FR-11 | Conversational revisions | Resolve requested changes to relevant scenes; clarify ambiguous destructive/global requests. Record the result as a new revision. |
| FR-12 | Selective rebuilding | Caption-only edits do not regenerate footage or narration. Clip regeneration replaces only the selected scene asset; unchanged asset checksums remain stable. Narration changes invalidate affected audio/timing and only footage whose required duration no longer fits; scene order changes update timeline offsets. |
| FR-13 | Preview/export | Export a playable vertical 1080 × 1920 MP4 with H.264 video and AAC audio, subject to selected FFmpeg build/license review. Preview identifies the revision shown. Record native clip resolution separately from export resolution; disclose upscaled footage and never claim native 1080p generation from lower-resolution sources. |
| FR-14 | Autosave | Save valid edits within a target of two seconds after typing stops under normal connectivity. Show Saving, Saved, and Unsaved/error states. Never falsely show Saved. |
| FR-15 | Job lifecycle | Persist queued, running, retrying, succeeded, failed, and canceled states. Closing the browser does not lose a job or its progress. |
| FR-16 | Retry/recovery | Show failed stage and actionable recovery. Retry reuses valid completed assets; retries are bounded and never loop indefinitely. |
| FR-17 | Asset library | Keep generated narration, scene data, render outputs, and relevant versions associated with the owning project. Download links enforce ownership. |
| FR-18 | Manual publishing | Download MP4 and copy an editable post caption. A manually marked published item is distinguishable from API-confirmed publication. |
| FR-19 | Instagram Connect | When enabled, use official OAuth and validate account/permission eligibility. Support disconnect and reconnect-required states. Never request Instagram passwords. |
| FR-20 | Live publication | Require approval of a specific render and caption. Mark Published only after platform confirmation and store its identifier. |
| FR-21 | Scheduling | Store UTC time plus IANA timezone. Test timezones and daylight-saving transitions. Clearly disclose when automatic scheduling is unavailable. |
| FR-22 | Delete project | Request confirmation, remove active project/media within the disclosed window, and document backup expiry. Scheduled publication is canceled before deletion. |
| FR-23 | Provider capability validation | Validate model, supported duration/frame count, aspect ratio, resolution, reference inputs, and price version before submitting. Unsupported requests fail before billing. |
| FR-24 | Reference images | If image-to-video is enabled, accept validated owned/licensed image uploads; retain provenance and consent. Otherwise show the capability as unavailable. |
| FR-25 | Basic clip editing | Preview individual clips, select trim in/out within available footage, reorder scenes, and regenerate a selected clip. Never silently loop, freeze, or severely slow footage to fill narration. |
| FR-26 | Internal budget enforcement | Default paid ceiling is ₹0. Before any paid request, atomically reserve its maximum billable cost against approved per-job and experiment caps. Include outstanding reservations and retries; reject requests that could exceed either cap. |
| FR-27 | Generation reconciliation | Persist submission intent and provider request IDs; use provider idempotency where supported. Unknown outcomes are reconciled before resubmission, with manual recovery if the provider cannot establish status. |
| FR-28 | Accessible onboarding | Provide a short guided example, visible quota/error states, keyboard-accessible controls, readable mobile layouts, and clear saving/generation status. |
| FR-29 | Posting assistance | Generate an editable post caption with optional relevant hashtags; do not present suggestions as verified trends. |

## 7. Scene design and revision rules

AI returns structured scene specifications, not source code. A scene includes:

- Stable identifier and order.
- Narration and editable caption text.
- Visual explanation, asset kind (generated footage, uploaded reference, motion graphics), and supported layout type.
- Clip prompt, model/version, supported settings, optional image reference, provider request ID, and seed when available.
- Source duration, native resolution/frame rate, trim points, output placement, and generation provenance.
- Text, labels, shapes, icons, and diagram relationships.
- Animation events tied to narration segments.
- Duration estimate and measured timing after narration.
- References to assets and their provenance.

The renderer validates layout, text length, bounds, supported components, and timing. If a request cannot be represented, tell the user and propose a supported revision.

Validate temporal motion, prompt relevance, usable clip duration, and obvious visual artifacts before accepting a scene. If footage is too short, propose another clip, a trim, or a reviewed script adjustment. Mute provider-native audio when separate narration is used unless explicitly included in the approved plan. Crossfades consume timeline duration and must be included in duration calculations.

Use one consistent built-in visual style with accessible contrast and typography. There is no branding settings page in V1.

Revision behavior:

- Preserve immutable completed revisions and render manifests.
- Make caption-only edits independently from narration edits.
- Reuse unchanged audio and assets.
- Invalidate downstream timing/render artifacts when narration changes.
- Do not silently update a scheduled post when a project changes. It retains the approved snapshot until the user replaces it.
- Handle stale autosave versions without silently overwriting newer edits from another tab.

## 8. Recommended architecture and provider choice

| Component | Selection | Rationale and caveat |
|---|---|---|
| Frontend/backend | Next.js, React, TypeScript | One application for public pages, dashboard, editor, and ordinary backend operations |
| AI planning | OpenAI-compatible chat model selected by `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`; current configuration is the operator-provided DeepSeek gateway | Gemini is not the default vendor. Model choice and access are configuration, not product guarantees; no automatic paid fallback or silent model upgrade |
| Video generation | One adapter; free Wan experiment first, Luma Ray 3.2 as paid fallback candidate | Access and quality must pass M0; paid fallback remains disabled until a numeric budget is authorized |
| Composition and supplementary graphics | Remotion plus SVG/React components | Compose actual clips with captions/graphics; validate current license eligibility |
| Narration | ElevenLabs timestamped speech | Use saved male/female preferences only when accessible; free allowance for eligible private tests, commercial rights separately gated. No silent voice substitution. |
| Timing | Phrase-level audio segments initially | Explicit timing anchors; word-level alignment is optional future improvement |
| Export/media validation | Remotion and FFmpeg | Local MP4 rendering, duration/properties checks, and media normalization |
| Auth/database | Supabase Auth/Postgres free tier | Accounts, ownership, revisions, and job records; free plan limitations apply |
| Media storage | Local prototype; private Cloudflare R2 Standard for the approved hosted pilot | S3-compatible adapter, signed access, measured quotas; no cloud activation at planning time |
| Web hosting | Local first; AWS Amplify Hosting for an approved hosted pilot | Static public pages and short Next.js server handlers; separate background worker |
| Persistent worker | Local initially; EC2 deferred until needed | No long-running rendering inside frontend requests; numeric hosting budget and measured sizing required |
| Jobs | Durable Postgres records plus separate worker | No long-running browser request; no extra queue-service subscription initially |
| Publishing | Official Meta integration | Conditional on current account and app access |

ElevenLabs Free may be evaluated for permitted noncommercial voice experiments, but is not the commercial V1 narration dependency. A paid voice provider is a later explicit decision.

### Provider selection rule

First attempt a permitted Wan video-generation experiment through available Hugging Face ZeroGPU access. Free quota and a working endpoint are not confirmed for the founder's account. Current documentation lists five daily GPU minutes for free accounts, not five minutes of generated video; eligible accounts older than 30 days can host limited ZeroGPU Spaces. Existing demos may validate footage manually, but manual downloads do not pass the automated integration gate. Do not build an unattended service on someone else's demo without permission or evade quotas.

If free access cannot support the experiment, stop with saved results. Recommended paid fallback is Luma Ray 3.2 at 360p for feasibility, then evaluate a usable higher resolution. Do not enable billing automatically. Select exactly one operational provider after M0; no multi-provider router or silent fallback in V1. The adapter separates submit/status/cancel-if-supported/download and capabilities from product logic. Cancellation may not prevent an already accepted provider charge.

Research shortlist, not multiple implementation dependencies:

| Candidate | Published research baseline | Selection implication |
|---|---|---|
| Luma Ray 3.2 | 5-second SDR: $0.06/360p, $0.15/540p, $0.30/720p; text/image inputs; pricing subject to change | Lowest documented paid draft option in this shortlist; confirm access, terms, quotas, and current price before use |
| fal Wan 2.2 5B | Listed $0.15/video; default 81 frames at 24 fps; configurable frame counts | Useful alternative if chosen provider fails its gate; confirm duration-dependent billing |
| Grok Imagine 1.5 Lite via Runway | Listed $0.03/second at 720p; reference charges can apply | Alternative evaluation only; verify exact model inputs/durations and attribution |
| Veo 3.1 Lite | Listed $0.05/second at 720p; no free video API tier shown | More expensive alternative; Gemini planning free quota does not include Veo |

Price is not a quality ranking. Record usable scenes per attempt, elapsed time, and cost per accepted second. Free consumer credits are not assumed to be API credits. Commercial use, data handling, model/checkpoint licenses, rate limits, and endpoint eligibility are provider-specific release checks.

### Deployment and hosting decision

Recommendation: develop and render locally first. For an authorized hosted pilot, use **AWS Amplify Hosting for Next.js**, retain Supabase for auth/Postgres, and keep one supervised local worker until continuous operation is actually needed. This respects the AWS preference without adding EC2 administration or migrating the database unnecessarily. This is a recommended architecture, not authorization to provision it.

| Option | Fit for this SaaS | Costs and limitations | Decision |
|---|---|---|---|
| AWS Amplify Hosting | Managed builds, TLS/CDN, static pages and short SSR/API handlers; suitable for dashboard and public pages | Metered builds, delivery, storage, SSR, and possible logging/add-ons; not the durable render worker | Preferred hosted frontend after compatibility and budget gates |
| Amazon EC2 | Persistent queue worker, FFmpeg/Remotion and scheduling under our control | Instance runtime, EBS, snapshots, network/IPv4 and optional services; patching, monitoring, recovery and idle costs | Defer; add one measured CPU worker only when local availability is insufficient; no GPU instance assumed |
| Vercel | Convenient Next.js hosting with managed deployment | Hobby is personal/noncommercial; not a free commercial-SaaS entitlement. Pro currently $20/month plus applicable usage/add-ons/taxes | Not the low-budget default for Vydrivo |

Amplify's published pay-as-you-go baseline: standard builds $0.01/minute, CDN storage $0.023/GB-month, delivery $0.15/GB, SSR $0.30/million requests plus $0.20/GB-hour. Illustrative usage of 100 build minutes, 1 GB stored, 1 GB delivered, 10,000 SSR requests and 1 GB-hour totals **$1.376/month before credits, taxes, logs and other services**; this is neither a forecast nor a spending authorization. Avoid paid WAF/add-ons, unnecessary preview branches, and repeated builds initially. See [Amplify pricing](https://aws.amazon.com/amplify/pricing/).

Before deployment, pin a supported, security-patched Next.js/Node combination. The current Hosting compute documentation lists Next.js 12–15 and excludes streaming, Edge API routes and on-demand ISR; Node runtime support is documented separately. Do not assume the latest framework release works. Use short enqueue/status endpoints and bounded polling, not streaming-dependent chat or work continuing after a response. Static public pages can be generated at build time; authenticated requests must never enter shared public caches. [Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [runtime support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-supported-features.html).

The hosted server authenticates users, validates ownership/budget, and writes durable jobs. A local worker polls/leases jobs through an authenticated restricted interface using outbound connections, then uploads results directly to object storage. Do not expose a laptop port or share privileged credentials with browsers. Worker heartbeat and queue status must show offline/paused honestly; no guaranteed unattended scheduling while local. Large MP4 traffic must bypass Amplify handlers/CDN through authorized storage URLs.

EC2 becomes justified by continuous scheduling, measured queue delay, or local resource limits—not merely by launching a landing page. Size and price it in the intended region after benchmarks; calculate monthly runtime plus disk, backups, network and logs. Stopping compute does not remove all storage-related costs. No instance family, commitment, reserved capacity, NAT gateway or load balancer is required yet. [EC2 pricing](https://aws.amazon.com/ec2/pricing/on-demand/). [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby), [Pro pricing](https://vercel.com/docs/plans/pro-plan).

### Generated-media storage decision

Keep all media local for M0. Recommend **private Cloudflare R2 Standard** for the initial hosted pilot because preview/download traffic can exceed stored volume; avoiding R2 internet-egress charges is useful for video. AWS preference remains satisfied for web hosting. R2 adds a second vendor and credentials; S3 remains the alternative if AWS-native policy, regional placement, or later worker economics justify it.

| Criterion | Amazon S3 | Cloudflare R2 Standard |
|---|---|---|
| Cost | Region/storage-class-specific GB-month, request, transfer and optional feature charges; quote the actual region before enabling | $0.015/GB-month, $4.50/million Class A and $0.36/million Class B beyond allowances; billing-unit rounding applies |
| Egress | Transfer charges/allowances vary by destination and configuration; do not assume free repeated internet downloads | No direct R2 internet-egress charge; requests and any separately used Workers services can still cost money |
| Free usage | AWS account vintage, Free plan/credits and eligible service rules apply; not indefinite free production storage | Monthly Standard allowance: 10 GB-month, 1 million Class A and 10 million Class B operations; not applicable to Infrequent Access |
| Integration | Native IAM/AWS SDK, lifecycle and region controls; convenient for future EC2 | S3-compatible API; adapter must test supported operations rather than assume complete S3 parity |
| Privacy | Private buckets, Block Public Access, restricted IAM and signed URLs | Private buckets, restricted tokens and presigned S3 endpoint URLs; no public r2.dev access for customer assets |

Sources: [S3 pricing](https://aws.amazon.com/s3/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 activation](https://developers.cloudflare.com/r2/get-started/), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/). S3's region selector must be checked at provisioning; no unverified Mumbai or US rate is treated as a quote here. R2 free usage is an allowance on a metered subscription, not a guaranteed hard stop; activation goes through checkout and is budget-gated.

Storage acceptance requirements:

- Store object keys, checksums, owner/project/revision, native media metadata and expiry in Postgres; never store video blobs there.
- Issue short-lived signed download/upload URLs only after ownership checks. Use narrowly scoped CORS; signed URLs are bearer capabilities, not user authentication. Never log or index them. Test expiry, range playback, unauthorized access and content disposition.
- Upload/download directly between worker/browser and storage to avoid proxy bandwidth. Configure retry/size limits and abort incomplete multipart uploads. Video previews can issue multiple range requests; measure actual operations.
- Preserve clips required for scene revision as well as final MP4s during the disclosed retention period. Include clips, failed takes, previews, finals, backups and public samples in storage estimates. At an assumed 250 MB retained per project, 20 projects use about 5 GB; this is a capacity illustration, not a measured file size.
- For a zero-charge target, use conservative internal watermarks (initially 5 GB live objects, 100,000 Class A and 1 million Class B monthly operations), bounded issuance of signed URLs, and cleanup of expendable temporary objects. These controls reduce risk but cannot guarantee a metered cloud invoice is zero. If no enforceable no-charge entitlement exists, stay local until a numeric cloud budget is approved.
- Publish retention/deletion rules, test cleanup and restoration, and review data location before private customer uploads. Keep public, explicitly licensed demo copies separate from private project objects; do not make a user's bucket public to enable SEO or Instagram.
- Meta fetching uses a narrowly scoped delivery URL valid for its processing window. Test fetch/expiry without exposing the whole bucket. Long-lived public media access is not the fallback.

## 9. System flow and data model

Request flow:

1. Authenticate user and verify project ownership.
2. Validate and save the approved storyboard revision.
3. Enqueue a generation job and return its identifier promptly.
4. Worker claims a lease, creates narration, measures audio, and builds timing.
5. Validate clip specifications; reserve budget; submit and reconcile provider jobs. Download completed clips through controlled fetches, validate media, settle actual charges, and preserve provenance. Normalize clips and validate the scene manifest before rendering with controlled resource limits.
6. Inspect output duration, resolution, codecs, audio, and file integrity.
7. Persist output and mark the job successful; UI refreshes status.
8. Publication operates on an explicitly approved immutable output.

Suggested entities:

| Entity | Purpose |
|---|---|
| users/profiles | Identity, timezone, preferences |
| projects | Owner, title, input notes, current revision |
| revisions | Script, storyboard, revision request, timestamps |
| scenes | Ordered visual and narration specifications |
| assets | Owner, type, storage key, checksum, provenance, retention |
| narration_segments | Text, audio asset, measured duration, timing anchors |
| jobs/attempts | Stage, lease, progress, retries, errors, provider request identifiers |
| provider_capabilities | Model/version, allowed inputs/settings, quota and price snapshot |
| cost_ledger | Authorized caps, atomic reservations, estimated/actual charges, refunds, currency conversion, job/attempt linkage |
| renders | Revision, manifest, native-versus-export properties, output asset |
| social_connections | Platform account and encrypted token references |
| publications | Render, caption, UTC schedule, timezone, platform state/identifier |

Provider keys and privileged database credentials remain server-side. Worker access must be narrow and audited; client requests never gain privileged database access.

## 10. Free-first budget and operations

The initial prototype must incur no paid provider charges. Use current free quota without paid fallback, local rendering, and open-source narration. Existing hardware, electricity, and internet are assumed available; ₹0 does not mean zero resource consumption.

- Do not activate paid billing, top-ups, subscriptions, or cloud render services without separate approval.
- When quota is exhausted, pause the operation and explain when retry may be possible; preserve progress.
- No credit balance, pricing page, or cost-management UI is required in V1.
- Keep internal request counts, monetary ledger, resource measurements, retry caps, and rate limits.
- Paid usage is disabled at a ₹0 ceiling. Any later authorization must specify provider, total experiment ceiling, per-job ceiling, currency/tax allowance, and maximum attempts. No approved numeric cap means no paid request. Reserve conservatively before submitting, settle confirmed charges/refunds, retain reservations for unknown outcomes, and stop on uncertain pricing.
- Use an operator kill switch and provider-side budget controls where available. Provider controls do not replace application reservations. Start with at most two automatic retries for transient errors; never retry moderation rejections or uncertain submissions blindly.
- Start with one concurrent render; limit queued work and input sizes.
- Free tiers and trials are not interchangeable with permanent production entitlements.

### Planning costs, not spending authorization

Assume fresh footage covers the entire duration, five-second Luma clips, no rejected artistic takes, and ₹90/USD as a planning conversion (not a live rate). These estimates exclude taxes, payment charges, storage, hosting, electricity, and human time. A 30-second figure is for benchmarking only.

| Footage-only case | 30 seconds | 60 seconds | 90 seconds |
|---|---:|---:|---:|
| Luma 360p | $0.36 / ₹32 | $0.72 / ₹65 | $1.08 / ₹97 |
| Luma 540p | $0.90 / ₹81 | $1.80 / ₹162 | $2.70 / ₹243 |
| Veo Lite 720p | $1.50 / ₹135 | $3.00 / ₹270 | $4.50 / ₹405 |

A locally finished Luma 360p prototype with free-quota planning, captions/rendering (excluding narration charges and commercial voice licensing) and 50% extra clip attempts has an illustrative incremental service budget of approximately ₹49/₹97/₹146 for 30/60/90 seconds. This allowance is not a guarantee or an approved cap. More rejected footage increases costs; footage upscaled into a 1080p export remains lower native resolution. Free feasibility may cost ₹0 in provider charges but does not guarantee enough quota for a full video.

Track total generation, failed/discarded attempts, narration, rendering, storage, egress, and allocated infrastructure costs per successful export. V2 pricing must cover these costs plus payment fees and support; no unlimited-generation promise. Billing and user credit UI remain outside V1.

### MacBook Air M1 feasibility constraints

Read-only inspection confirmed an Apple M1 MacBook Air with 8 CPU cores, 7 GPU cores, and **8 GB unified memory**. Approximately 99 GiB storage was available at inspection; recheck before tests. Render speed, memory pressure, and swap behavior are unmeasured. Unified memory is shared with macOS and applications, not equivalent to dedicated VRAM.

Use the Mac for development, audio timing validation, and composition if benchmarks pass. Do not make local video diffusion a V1 dependency: Wan 2.1's documented 8.19 GB VRAM example exceeds a practical budget on this machine, and community Apple Silicon benchmarks on much larger Macs do not establish feasibility here. Open weights are not free compute. No large model downloads or GPU rental without authorization.

After implementation authorization, benchmark safely:

1. Inspect installed runtime/tool versions, free disk, and baseline Activity Monitor memory pressure/swap. Install nothing as part of planning.
2. Run one simple five-second 720p composition and narration separately, then 30-second and 60–90-second fixtures, then 1080p. Use one worker and avoid concurrent heavy applications.
3. Record elapsed time, peak memory, swap growth, output size, and playback quality; repeat a few runs to observe sustained behavior. Do not infer p95 from a tiny sample.
4. Stop on sustained red memory pressure, rapid swap growth, unresponsiveness, or less than a 20 GB disk reserve. Keep normal ventilation and thermal protections.
5. Set worker limits and honest performance expectations from measurements. If 1080p is not feasible, keep the release gate blocked rather than quietly lowering the promised export format.

A sleeping/offline laptop cannot guarantee unattended generation or publication. Before external public launch, resolve always-on worker hosting, storage, backup/restore objectives, authentication email delivery, and their costs. Until then, label the product a controlled local/private pilot and disclose service hours. No production uptime guarantee is made on free tiers.

### Free-tier and release-budget policy

The **₹0 initial incremental service-spend ceiling covers every service**, not just video APIs. Local electricity/internet and existing hardware are excluded from incremental provider charges but still consume resources. Never activate paid hosting, R2 billing, API billing, auto-recharge, a subscription, or a paid upgrade automatically.

Before any charge-capable service is enabled, obtain explicit numeric authorization naming the service, total and monthly ceiling, validity period, tax/FX reserve, shutdown threshold and owner. Generation also needs per-job/attempt caps. Approval to implement code is not approval to spend. Free-tier provisioning itself still requires the user's implementation/deployment authorization. If the service cannot enforce a hard cash limit, disclose residual exposure and do not promise one; at the current strict ₹0 ceiling, remain local unless a genuine no-charge entitlement is verified.

| Service/offer | Expiry or restriction | Required behavior |
|---|---|---|
| AWS Free Tier | New-customer Free plan currently offers $100 initial credits and up to $100 earned; ends at six months or credit exhaustion. Older accounts and Paid plans have different eligibility | Check the actual account; no automatic Paid-plan conversion or paid-only activation. Do not stack legacy 12-month allowances with new-plan credits without eligibility evidence |
| Amplify allowances | Pricing page also lists eligible 12-month allowances (1,000 standard build minutes, 5 GB storage, 15 GB delivery, 500k SSR requests, 100 GB-hours monthly) | These are not perpetual or universally applicable; verify account/plan and schedule shutdown before expiration |
| R2 Standard | Recurring monthly allowance, but overages are billed; no trial expiry stated for this allowance | Keep local until activation/billing authorization and safeguards are resolved; no Infrequent Access initially |
| Vercel | Hobby noncommercial; Pro trial is temporary and Pro has ongoing fees | No commercial pilot on an assumed free Hobby entitlement; do not enable a trial with unapproved conversion |
| Supabase Free | Currently 500 MB database, limited egress/storage, two active projects; inactivity can pause projects after one week | Measure use and backup independently; do not automatically upgrade or treat it as always-on production capacity |
| Planning provider/ZeroGPU | Model/account quotas and availability restrictions; planning access does not include paid video generation | Pause on exhaustion, no paid fallback; reconfirm data terms before private inputs |
| Payment promotions | Gateway introductory waivers have eligibility, time, method and tax restrictions | Do not use them as steady-state V2 economics or call payments permanently free |

AWS budget alerts can arrive after charges accrue and are **not a hard spending cap**. Track service usage/expiry, minimize exposed resources, set operator alerts and stop thresholds, and verify teardown of billable leftovers. Keep actual cash charges distinct from credits consumed so subsidy expiry cannot hide an unsustainable cost. [AWS Free Tier](https://aws.amazon.com/free/), [AWS Budgets limitations](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html), [Supabase plan limits](https://supabase.com/pricing).

### V2 business model and customer billing

V1 has an internal provider-cost ledger only: no checkout, customer wallet, subscription, purchase prompts or automatic charge. Internal usage protection does not require a user-facing credit dashboard.

| Model | Advantage | Tradeoff | Recommendation |
|---|---|---|---|
| Prepaid generation credits | Cash before usage; fits occasional creators and caps liabilities | Users must understand variable model/duration cost and what retries cost | First V2 offer: small one-time packs with a clear pre-generation quote |
| Subscription with bounded credits | Predictable access/revenue for repeat creators | Recurring mandates, cancellation, renewal failures and unused-credit rules add complexity | Add only after repeat-use demand is measured; include a fixed allowance, never unlimited footage |

Credits are non-transferable service units, not money or a stored-value payment product. Start with no auto-top-up and no expiry for purchased packs; account closure/refunds and long-term liabilities must be covered by published terms. Subscriptions, if introduced, need explicit renewal consent, cancellation before renewal, a disclosed monthly allocation/rollover rule, and no unapproved overage debit. Model/resolution/duration determine credit quotes; export/download of an already paid revision does not consume generation credits again. State the included revision allowance and price extra requested regeneration before submission.

Cost calculation requirements:

- Cohort cost per successful export = (all paid generation attempts, including failed/abandoned jobs and artistic rejects, less confirmed provider refunds + planning/TTS + rendering + storage/egress + allocated hosting + support allowance) / number of successfully completed export revisions. Repeated downloads are not new successful exports. If none succeed, report total loss and undefined unit cost rather than zero.
- Maintain both actual cash cost and an unsubsidized estimate at current rates. Count pending provider costs conservatively. Do not double-count retained assets or refunds.
- Illustrative 60-second 360p case: 12 five-second clips × $0.06 × 1.5 attempts × ₹90 = ₹97.20 generation per started project. If only 80% of started projects export, allocate ₹121.50 generation per success. Add an explicitly assumed ₹20 per-success allowance for all other operating costs: **₹141.50 per successful export before payment fees and sales taxes**. The allowance and success rate are hypotheses; 540p under the same assumptions is ₹323.75. Local resource cost is not inherently zero and native 1080p costs are not represented.
- A hypothetical ₹299 pre-sales-tax price with a 2% gateway fee plus 18% tax on that fee incurs ₹7.06 processing cost, leaving about ₹150.44 contribution after the ₹141.50 example cost, before unallocated business expenses. The same price loses money in the 540p example. This is a sensitivity calculation, not a launch price or tax determination.
- For target contribution margin m and effective fee fraction f, a candidate pre-sales-tax price is at least C/(1-m-f), provided the denominator is positive. Validate both cost distribution and willingness to pay before publishing any price; payment tax recovery, taxes on sales and international fees need actual business/account treatment.

Customer protection and refund rules proposed for V2:

- Reserve the quoted maximum credits when a job starts; settle only the disclosed successful deliverable and release unused reservations. Failed jobs with no usable export and duplicate system charges receive automatic credit restoration. Vydrivo absorbs unrecovered provider charges for its own failures; restoring customer credits is separate from receiving a provider refund.
- Cancellation before submission releases the full reservation. After submission, preserve the state and apply the published cancellation policy; show that provider work may be irreversible. Do not debit beyond the accepted quote. Successful outputs rejected for preference are not automatically free: offer the disclosed revision policy and a support review for defects.
- Duplicate payments and undelivered purchases are refunded to the original payment method. Proposed pack policy: refund the unused purchased balance on request within 14 days, revoke those credits atomically, and absorb nonreturned gateway fees; consumed units are handled through the defect/failure policy. Applicable customer rights take precedence; finalize terms before V2 launch.
- Track payment captured/refund requested/refund confirmed separately; do not promise instant bank settlement. Prevent double refund/credit restoration, and handle chargebacks with an auditable ledger.
- Global provider budget, per-user daily allowance, concurrent job limit and per-job ceiling remain enforced even for paying customers; pause purchases if delivery capacity/budget cannot support outstanding credits.

India payment integration recommendation: **Razorpay hosted Checkout for initial prepaid packs**, subject to onboarding/KYC and approval; Cashfree is the alternative if its actual settlement/fee quote is better. Do not implement both initially. Stripe is not a dependable default for a new Indian account because access is invite-only.

| Option | Research baseline and limitations |
|---|---|
| Razorpay | Published standard pricing around 2% plus applicable GST, with method exceptions and temporary introductory offers. Supports common Indian payment methods; verify subscriptions/international activation and pricing separately. Normal refunds do not return original processing fee/GST to the merchant |
| Cashfree | Published standard domestic baseline 1.95% plus applicable taxes; current limited campaign has volume/method exclusions and still charges tax on the standard fee under its terms. Evaluate net settlements, not the headline 0% |
| Stripe India | Invite-only; use only if actually approved and the international business case warrants its pricing/integration |

V2 acceptance: hosted payment UI (no card data stored by Vydrivo), server-created orders and amount verification, signed/replay-safe webhooks, idempotent credit issuance only after verified capture, reconciliation, test-mode failures/refunds/chargebacks, receipts and terms, and validated tax/KYC/settlement arrangements. Sandbox integration can be planned without live transactions; no live billing activation belongs to V1. [Razorpay pricing](https://razorpay.com/pricing/), [refunds](https://razorpay.com/docs/payments/refunds/normal/), [Cashfree pricing and offer terms](https://www.cashfree.com/payment-gateway-charges/), [Stripe India availability](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india).

## 11. Instagram states and behavior

Connection states: unavailable, disconnected, connecting, connected, reconnect required.

Publication states: draft, planned/manual, scheduled/automatic, preparing, publishing, published, failed, canceled.

- Eligibility, scopes, app review, verification, quotas, and media constraints must be checked against current official documentation before implementation.
- OAuth uses state validation and secure token handling.
- The scheduler runs independently of browser sessions.
- Expired/revoked access blocks publishing with a reconnect action.
- Before retrying an uncertain publication, reconcile its platform status to prevent duplicates.
- Demo/test outcomes never appear as live publication success.
- Public production release cannot advertise live publishing until the integration passes its release gate.

## 12. Security, privacy, and content quality

- Enforce ownership checks in API handlers, database policies, and media access.
- Keep projects private by default; never publish user examples without permission.
- Treat notes and model responses as untrusted data; sanitize text and validate structured output.
- Do not execute AI-generated or user-supplied application code.
- Restrict renderer filesystem/network access and enforce time/memory limits.
- Store secrets outside source control and redact credentials/content from routine logs.
- Use scoped signed URLs; validate imported assets and reject unsafe file types.
- Restrict external asset fetching to controlled sources; no arbitrary URL imports in V1.
- Record licenses for fonts, icons, illustrations, voices, dependencies, video models/checkpoints, and API output terms. Check attribution obligations.
- Require rights to reference images; prohibit unauthorized impersonation and misuse of identifiable people. Preserve provider safety refusals; do not route around them.
- Validate upload signatures, dimensions, size, and decoding limits; do not trust filename extensions. Restrict download hosts/redirects, reject private-network destinations, and limit media decoding resources.
- Verify signed provider callbacks where supported; otherwise reconcile server-to-server. Protect callbacks against replay and reject untrusted status changes.
- Include script review; do not label AI-generated explanations as fact-checked without verification.
- Disclose external AI processing and review free-tier data-handling terms before accepting private customer material.
- Define retention before inviting users: proposed temporary-file deletion within 24 hours and pilot export retention of 30 days, with notice before expiry.
- Publish deletion and backup-retention behavior before public use.

## 13. Quality targets and measurements

These are proposed acceptance targets, not claims about an existing system.

| Measure | Target |
|---|---|
| Output duration | Every accepted final output between 60.0 and 90.0 seconds |
| Resolution | 1080 × 1920 export; native footage resolution recorded and disclosed |
| Footage authenticity and relevance | Every accepted video includes substantive model-generated motion; all scenes marked footage use valid generated clips, with prompt relevance and temporal artifacts reviewed |
| Budget integrity | Zero paid submissions at ₹0 cap; concurrent reservations and retries cannot exceed approved caps |
| Readability | No overflow/clipping in the launch fixture set; captions inside approved safe areas |
| Narration alignment | Phrase captions and intended key visual events within 500 ms in manually reviewed fixtures |
| Reliability | At least 19 of 20 valid fixture jobs complete after bounded recovery; external outages tracked separately |
| Revision isolation | Unchanged scene/narration assets remain unchanged in targeted-edit tests |
| Data isolation | Zero successful cross-user access attempts in required tests |
| Duplicate operations | No duplicate jobs/publications from replayed requests in required tests |
| Autosave | Target saved state within two seconds after editing stops under normal connectivity |
| Performance | Record render time and peak memory; report median and p95 only with adequate samples; set an honest release target after benchmark |
| Activation | At least 3 of 5 invited testers export their own video |
| Repeat use | At least 3 of 5 create or substantially revise a second project within 14 days |

Record minimal events: project_created, storyboard_ready, storyboard_approved, generation_started, generation_failed, preview_ready, revision_requested, export_downloaded, publication_confirmed. Do not store private scripts in analytics events.

### Public SEO and acquisition requirements

SEO foundations are required before a **public V1 website** is launched; they do not block local footage feasibility or require a paid marketing tool. Ongoing content expansion and paid conversion reporting belong to V2. No ranking, indexing, rich-result, or growth guarantee is made.

- Build a crawlable, mobile-friendly landing page explaining the actual workflow, current access limits and genuine capabilities. Add a small number of distinct product/use-case pages (creator explainers, education, business/product stories) with real examples rather than duplicate keyword pages. No V1 checkout or speculative price promises.
- Give each public page a unique descriptive title, meta description, clear heading structure and meaningful internal links. Render useful public content in initial HTML using static generation where practical; do not require login or a heavy editor bundle to read marketing content. [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
- Set absolute canonical URLs on the chosen production origin, normalize duplicate host/path variants with redirects, and exclude tracking parameters from canonical URLs. Authenticate/noindex preview deployments; do not let provider preview domains become competing public copies. [Canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- Serve `sitemap.xml` with only canonical, indexable public 200-status pages and truthful last-modified dates. Serve `robots.txt` referencing the sitemap and allowing required public resources. Verify ownership in Google Search Console after authorized deployment, submit the sitemap, inspect representative URLs, and monitor coverage/errors/search clicks. This setup creates no ranking entitlement. [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- Use appropriate truthful structured data: Organization/BreadcrumbList where applicable, SoftwareApplication only with supported factual fields, and VideoObject for genuine public sample watch pages. Do not invent prices, reviews or ratings to qualify for a rich result. Validate eligible markup with Google's tools; omit unsupported claims. [Software application guidance](https://developers.google.com/search/docs/appearance/structured-data/software-app).
- Publish original tutorials using tested Vydrivo workflows, limitations, scene revisions, and before/after examples. Include named authors/update dates and useful transcripts. Begin with two substantive tutorials and two licensed, actually generated sample videos after feasibility passes; expand based on user questions, not bulk AI-generated SEO pages.
- Give public video samples a stable watch page, thumbnail, descriptive title, transcript/captions and accurate duration/native-quality disclosure. Lazy-load media with a poster, avoid heavy autoplay downloads, and use stable public copies authorized specifically for marketing. Private expiring download URLs are never video-sitemap or structured-data content URLs. [Video SEO guidance](https://developers.google.com/search/docs/appearance/video).
- Test narrow mobile screens, semantic landmarks, contrast, alt text, keyboard navigation, visible focus, reduced motion and caption controls. Optimize image/video payloads, fonts and JavaScript; use mobile Lighthouse/PageSpeed measurements as diagnostics and field Core Web Vitals when enough real traffic exists. Accessibility and usable performance are acceptance requirements, not merely SEO tactics.
- Project pages, dashboards, prompts, reference images, private thumbnails, videos, object keys and signed URLs must not appear in public HTML, metadata, sitemaps, logs or structured data. Enforce server-side authorization and private storage; use noindex on relevant app/login responses as defense in depth. `robots.txt` and noindex are not access controls; blocking a public URL from crawling can prevent a crawler seeing its noindex. Test direct unauthenticated access, not just sitemap omission. [Indexing controls](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Public-launch acceptance: all public routes have correct titles/descriptions/canonicals; sitemap and robots are valid; public sample rights are recorded; private fixture projects are absent from every public surface; preview environments are protected; no critical keyboard/mobile defects; Search Console verification is complete when domain access is available. Track landing visit → signup → first export without sending private scripts to analytics. No consent-free reuse of customer work for marketing.

## 14. Test plan

### Content and rendering

- Evaluate at least five topics spanning an educational concept, business process, product explanation, comparison, and visual story.
- Test 60-second, mid-range, and 90-second product plans without a selector; five-second and 30-second fixtures are internal benchmarks, not user export options.
- Generate real clips in the authorized feasibility test; judge prompt adherence, motion, temporal artifacts, and source resolution. Automated mocks do not satisfy the footage integration gate.
- Validate mixed frame rates, codecs, orientation, trims, transitions, native audio muting, corrupted outputs, expired download URLs, and insufficient clip duration.
- Test reference-image validation if enabled; preserve provider moderation errors without repeated requests.
- Test long labels, numerals, punctuation, abbreviations, empty content, and unsupported visual requests.
- Listen for pronunciation, missing words, unnatural pauses, and scene-boundary discontinuities.
- Inspect captions, diagrams, safe areas, transitions, and the final frame.
- Play exported files on target desktop and mobile browsers.

### Conversation and revisions

- Test shorten/expand requests at both duration boundaries.
- Test caption-only correction, narration change, diagram replacement, scene reorder, and ambiguous instructions.
- Verify unchanged asset reuse and preservation of the last successful render.
- Verify stale-tab edits do not silently overwrite saved work.

### Reliability and security

- Close the browser during generation, interrupt the worker, and restart it.
- Simulate exhausted AI quotas, timeouts, invalid model output, storage failure, and full disk.
- Replay submissions and job callbacks; verify idempotency and bounded retries.
- Simulate a provider accepting a request before a local timeout; reconcile without duplicate paid generation. Test atomic budget reservations under concurrency, unknown charges, refund settlement, cancellation, and exhausted quota.
- Test malformed uploads, unsafe redirect destinations, replayed callbacks, and decoding resource limits.
- Exercise cross-user project/media access and malicious structured content.
- Restore a backup before any externally hosted pilot containing valuable user data.

### Hosting, storage, SEO and budget gates

- Test production-build compatibility with the selected supported Next.js/Node versions, auth callbacks, no shared caching of private responses, and bounded enqueue/status handlers.
- Simulate sleeping worker, credit expiry, quota exhaustion and cap rejection; paid resources remain disabled without valid numeric authorization. Cloud budget alerts alone cannot pass a hard-cap test.
- Test signed upload/download expiry, cross-user denial, range playback, CORS, oversized files, multipart cleanup, object retention and backup restore. Reconcile measured storage/operations with estimates.
- Crawl only the test public site and assert private project data/URLs never appear in page source, canonical tags, sitemap, robots entries, structured data or sample assets. Check indexability, broken links, mobile/keyboard behavior and markup validity.
- V2 only: exercise payment capture, duplicate/reordered webhooks, failed payments, partial credit refunds, duplicate refund attempts, cancellation and reconciliation in sandbox before requesting live payment approval.

### Publishing

- Test official connection/disconnect with an authorized account.
- Test revoked tokens, ineligible accounts, expired media URLs, rejected media, and uncertain API responses.
- Test timezone conversion, cancellation, worker downtime, and duplicate prevention.
- Ensure manual/planned states are distinguishable from API-confirmed publication.

## 15. Delivery milestones and gates

| Milestone | Deliverable | Gate |
|---|---|---|
| M0a: one-scene feasibility | One 5–10-second actual generated clip with narration/captions and a local vertical MP4 | Prefer permitted free GPU experiment; record native resolution, motion quality, latency, memory, and actual ₹0 charge; no paid fallback without numeric caps |
| M0b: automated provider and duration proof | One provider integrated; a 30-second internal fixture, followed by a 60–90-second complete footage-based video | Manual demo downloads alone cannot pass; actual provider submission/status/download, narration, timing, composition, and 1080p export pass; no template-only substitute |
| M1: planning workspace | Topic input, combined storyboard, direct edits, conversational revisions | Valid scene/capability schema and 60–90-second user duration behavior |
| M2: resilient pipeline | Durable clip jobs, budget ledger, narration/timing, composition, preview/export | Reconciliation, budget limits, recovery, playback, and selected-clip regeneration tests pass |
| M3: private product | Sign-in, dashboard, autosave, asset library, deletion, onboarding | Ownership, accessibility, persistence, retention, and backup-restore tests pass |
| M4: publishing workflow | Calendar, editable caption/hashtags, manual package; conditional Meta integration | Honest states; live publishing and scheduling gated separately on access, successful tests, and worker availability |
| M5: pilot review | Five-user exercise and measured quality/cost/resource report | Required fixtures and repeat-use targets pass; no critical security/cost defects; public launch additionally requires operational readiness |

Milestones describe dependencies, not authorization to start. Free access failure blocks the footage milestone; it does not justify an animation-only release or automatic spending. Schedule estimates follow M0 measurements.

## 16. Release scope and unresolved verification gates

### V1: required or explicitly conditional

- Actual footage through one provider, approved storyboards, English narration, synchronized editable captions, selective scene regeneration/trimming, composition, preview, and vertical MP4.
- User outputs remain 60–90 seconds; 30 seconds is solely an internal test. No duration selector.
- Accounts, dashboard, asset history, autosave, bounded recovery, internal budget controls, deletion, accessible onboarding, and manual posting/calendar.
- Image-to-video only if the chosen provider and reference-security tests pass; otherwise clearly unavailable.
- Instagram Connect/publishing only after official eligibility/access and live tests; scheduling additionally requires continuous worker availability.
- One built-in caption/graphic style; no brand settings or user-facing billing/credit UI.
- Local hosting/storage first; approved hosted pilot uses Amplify and private R2, with EC2 deferred. Public V1 launch requires SEO foundations and privacy checks in section 13.

### V2: planned expansion, not V1 release blockers

- Prepaid cost-weighted credits first; bounded-credit subscriptions only after repeat-use validation. Follow section 10 unit economics, spending caps, customer refund rules and India payment gates; no unlimited plan.
- Additional video providers/quality tiers, richer voice controls, Hindi/Hinglish after native-speaker evaluation, brand kits, and additional lengths/aspect ratios.
- Creator series/repurposing workflows, campaign organization, and richer settings/help.
- Expand the V1 public SEO foundations with additional original tutorials/comparisons and signup-to-export-to-paid reporting. Public marketing must describe demonstrated capabilities; SEO foundations are not deferred to V2.

### Future: separately scoped

- Teams, multi-social publishing/analytics, advanced character consistency, avatars/lip sync/voice cloning, full timeline editing, 4K, document/URL research ingestion, long-video clipping, thumbnail generation, and trend discovery.

### Verification gates, not requests to repeat product decisions

English-first, one provider, free-first evaluation, 60–90-second user output, and manual publishing fallback are settled recommendations for implementation. Remaining checks are technical or external:

- Confirm permitted free video access; if unavailable, retain ₹0 and request only a specific paid experiment authorization with numeric ceilings.
- Pin the exact configured DeepSeek model and selected video endpoint after availability/terms tests.
- Verify ElevenLabs access/alignment and benchmark local rendering; verify commercial licensing for the exact voice, model, libraries, and assets.
- Validate auth delivery, Amplify framework support and private R2 storage against measured pilot load; verify account entitlements and numeric cloud budgets before enabling metered resources.
- Finalize active/backup deletion windows and restore objectives before external data is accepted.
- Verify Meta account/app permissions and worker availability before enabling automatic publication.
- Public release requires sustainable generation capacity, operating budget, storage, support, and backups; a quota-limited prototype does not establish these.

### Completeness and consistency review

This document is complete as a pre-implementation PRD: core flow, acceptance criteria, V1/V2/future boundaries, architecture, hosting/storage, SEO, billing plan, security, reliability, cost controls, tests and release gates are specified. It does not claim implementation or external account readiness. Actual generated motion remains mandatory; template animation cannot pass FR-07. User-facing output remains 60–90 seconds; 30 seconds is internal validation only. Instagram remains conditional. V1 internal cost tracking is separate from V2 payments. All paid APIs and hosting/storage activation remain disabled at the initial ₹0 ceiling.

Implementation still requires explicit approval. External access, hardware benchmarks, licenses, service entitlements and any numeric spend authorization remain verification gates rather than missing product decisions. None were provisioned or tested by this document update.

## 17. Sources and verification notes

Tool research, including official hosting/storage/payment/SEO documentation, was checked on 18 October 2026. Inline references in sections 8, 10 and 13 are part of this source register. Recommendations and illustrative business calculations are product decisions, not provider guarantees. Limits, terms, and eligibility must be rechecked when configuring accounts; no provider account was provisioned or tested during planning.

- Hugging Face ZeroGPU access/quotas: https://huggingface.co/docs/hub/spaces-zerogpu
- Luma API pricing: https://docs.agents.lumalabs.ai/guides/pricing/
- Luma video generation: https://docs.agents.lumalabs.ai/guides/videos/generation/
- Luma access/limits: https://docs.agents.lumalabs.ai/guides/faq/ and https://docs.agents.lumalabs.ai/guides/rate-limits/
- fal Wan model/schema: https://fal.ai/models/fal-ai/wan/v2.2-5b/text-to-video and https://fal.ai/models/fal-ai/wan/v2.2-5b/text-to-video/api
- Runway API pricing: https://docs.dev.runwayml.com/guides/pricing/
- Veo capabilities: https://ai.google.dev/gemini-api/docs/veo
- Wan local requirements: https://github.com/Wan-Video/Wan2.1 and https://github.com/Wan-Video/Wan2.2
- Community Apple Silicon implementation (not an M1 8 GB benchmark): https://github.com/baisampayans/ltx-mlx
- Gemini pricing/free tier: https://ai.google.dev/gemini-api/docs/pricing
- Gemini terms/data handling: https://ai.google.dev/gemini-api/terms
- Remotion licensing: https://www.remotion.dev/docs/license/pricing
- Kokoro source/license: https://github.com/hexgrad/kokoro
- ElevenLabs pricing: https://elevenlabs.io/pricing
- ElevenLabs commercial-use restrictions: https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform
- Supabase billing/limits: https://supabase.com/docs/guides/platform/billing-on-supabase
- Meta official API collection: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- FFmpeg licensing: https://www.ffmpeg.org/legal.html

## 18. Approval boundary

This PRD records the confirmed actual-footage V1 direction and finalized product requirements. Updating this planning document does not authorize coding, dependency installation, provider signup, deployment, paid usage, or publishing. Implementation begins only after explicit user approval.


## 28. Prototype reconciliation — 19 October 2026

This is an implementation status update, not a production-readiness claim. The
current priority is a correct local pipeline and visual testing, not launching
cloud services or building production infrastructure in this iteration.

- The default contract remains idea → free-model storyboard draft → human review →
  measured narration → actual clips plus approved graphics → captions/composition
  → preview/revision → MP4. The configured planning model drafts; Remotion renders;
  neither generates footage.
- A configurable OpenAI-compatible adapter and strict storyboard validation now exist.
  Live access is unverified; tests use mocked responses and are not generation evidence.
- Topic content belongs in scene data. Fixed styles and reusable diagram components
  are expected. Old WaterCycle/RamStorage components are historical demos;
  they are not the default route for arbitrary topics.
- Approved content hashes invalidate edited storyboards. Narration text hashes and
  measured timestamps prevent reuse of stale speech. Actual durations, not estimated
  scene lengths, determine the output timeline. Revisions need re-review.
- The initial compiler interprets “supplementary graphics” as at least 50% actual
  footage duration. This is a provisional implementation threshold, not a new
  user-selected feature. Human review must still reject token or irrelevant footage.
- A separately labeled graphics diagnostic may be shorter than 60 seconds and
  contain no footage. It cannot satisfy any V1 footage or 60–90-second release gate.
- Existing saved ElevenLabs audio is available for local graphics regression tests.
  The saved water-cycle test uses a historical voice ID different from the requested
  male/female preferences; reusing it does not change those preferences or verify
  their entitlement. No automatic voice fallback is allowed for new generation.
- Internal tests remain private until voice, music, assets and renderer rights are
  established. Customer billing, hosting and production hardening remain staged
  work, as previously specified; no paid activation is authorized.

Acceptance for this correction: offline validation tests, a data-driven graphics
export with existing audio/captions, successful media/decode checks and visual
inspection. Full live planning provider → generated clips → approved-voice export remains a
separate unpassed milestone. See prototype/README.md for commands and evidence.


Implementation contract references (19 October 2026): [API design](API-DESIGN.md)
and [Database design](DATABASE-DESIGN.md) detail this PRD without changing V1 scope.
Review the UI in Google Stitch next; these contracts do not assert deployed APIs,
executed migrations or completed end-to-end generation.

## 29. Idea & Prompt Studio update — 26 October 2026

Feature 1 implements the first step of the reviewed four-step flow: **Idea**. A signed-in user can open a Postgres-backed project, enter a topic, optionally add audience and notes, choose a voice preset, request 3–5 AI idea suggestions, refine them with plain-language feedback, apply a suggestion, and continue to the storyboard step. Edits autosave to Supabase Postgres.

The planning adapter is the existing OpenAI-compatible HTTP adapter, configured to the operator-provided DeepSeek gateway. The model is not given authority over ownership, approval, pricing or publication. Its output is validated locally: 3–5 suggestions, bounded plain-text fields, 3–5 outline beats, and no URLs or unsafe markup. Invalid or unavailable provider output fails clearly; there is no canned storyboard fallback.

This is not evidence that storyboard generation, footage generation, narration, rendering or publishing works end to end. Those remain separate features with their own evidence gates.

## 30. Landing design foundation — 27 October 2026

The public landing page now uses the dark premium design foundation in
`docs/LANDING-DESIGN.md`. It is inspired by the clarity of modern AI video tools
but uses Vydrivo's own logo, copy, layout and visual identity.

The landing page has one primary action: start with an idea. The hero is a
full-bleed video cover with a dark overlay, a headline, a topic input, and
"Create project & continue". A floating storyboard card shows the reviewed-plan
concept. The page also contains a three-step explanation, six sample concept cards
with muted video previews, the production feature set, a final CTA, and the footer.

The landing CTA stores the topic in browser session storage, checks whether the
visitor is signed in, and routes to `/app` or `/sign-in?next=/app`. The dashboard
pre-fills the create form from that pending topic.

Design tokens, typography, hero rules, responsive requirements, accessibility
requirements and reference sites are recorded in `docs/LANDING-DESIGN.md`. The
app screens remain on the previous light UI until the next slice applies the same
foundation to the app shell, app home and Idea step. No fake metrics, credit
claims, competitor model names or copied competitor assets are used.

The hero auto-plays a crossfading playlist of three active user-provided AI
clips; the space/science clip is parked after visual review. The clips are
cropped locally to remove visible KlingAI watermarks and prompt overlays. The
background is blurred, darkened and colour-graded. The storyboard card is a
separate 9:16 render with a real AI-footage frame from the lyrical clip, which is
also the third background item; the card is a distinct crop and format. A visible
demo section uses the user-provided 30-second product video with a poster and
controls; it is not the hero background.
The generated MP4s are gitignored; the playlist/demo/example posters and card
frame are tracked. A licensed cinematic studio clip or AI-generated hero remains an
optional future replacement, not a V1 blocker for the landing page.

## 31. Auth screen design — 27 October 2026

Sign-in, sign-up, recovery and new-password now use the dark design foundation.
Desktop is a 50/50 split: the brand panel carries the Vydrivo logo, a back link,
“A wall of ideas in motion”, the two-tone headline “Turn your idea into a video
you can shape.”, category tags and a slowly drifting two-column wall of eight
sample AI reels (first four new, second four existing). The auth panel carries
Sign in / Create account tabs, Google, email/password,
remember-me, forgot-password, the primary violet action and support. Mobile
collapses to a single column with a compact brand header.

The auth behavior is unchanged: Supabase email/password, Google OAuth, recovery
and password update use the existing API routes and CSRF flow. Sign-in and
sign-up are server-rendered on demand (`force-dynamic`) so the server-only
Supabase environment is read at request time rather than baked into a static
page. The reel wall is
decorative, muted and poster-backed, respects reduced motion and is labelled
“Sample AI footage”. It does not claim the clips were made by Vydrivo or copy
Velos assets or client names. The design does not include fake “System Online”
status, creator counts, testimonials, extra SSO providers or unverified security
claims. The authenticated app shell, app home and Idea step remain on the light
UI and are the next reskin slice.

## 32. Public media hosting — 27 October 2026

Public sample media is stored in a Cloudflare R2 bucket and delivered through a
public media domain. User-uploaded video uses a separate private R2 bucket with
signed access. The app resolves every runtime media path through `lib/media.js`:
when `NEXT_PUBLIC_MEDIA_BASE_URL` is set the site loads from the media domain,
and when it is empty the site falls back to the local `public/videos` files for
development.

Requirements:

- Public sample media is exposed only through a custom domain, or a temporary
  rate-limited `r2.dev` URL while testing. The `r2.dev` URL is not a production
  delivery path.
- User-uploaded video uses a separate private bucket. R2 public access is
  bucket-level, so user media is never placed in the public sample bucket.
- R2 API tokens are scoped to one bucket, stored only in the ignored server
  environment, and never exposed to the browser.
- User-uploaded video is written with short-lived presigned URLs and referenced
  by object key from Postgres.
- Generated video is never committed to Git.
- Public media carries long immutable cache headers; a replaced file uses a new
  key so the CDN cannot serve a stale copy.
- The bucket CORS policy allows only the app origins.

The landing page, example cards, demo section and auth reel wall use the
helper. The public bucket and first upload are complete for the active sample
assets; the temporary r2.dev base is configured locally. The private user
bucket, custom domain and Amplify environment/new build remain pending and are
described in `docs/MEDIA-HOSTING.md`. Amplify must receive
`NEXT_PUBLIC_MEDIA_BASE_URL` in its build environment and redeploy; `.env.local`
and `public/videos` are not part of an Amplify build.

## 31. Studio type + AI storyboard generation update — 29 October 2026

The studio type scale was raised after review: body and form text are 13–14px,
labels are 11–12px, and 8–9px text is no longer used for content. The Idea page
now keeps AI prompt directions in the right rail beside the topic, with
“Use & edit prompt” applying a direction to the editable topic before the user
continues.

The Storyboard page now has a real **Generate storyboard** action. It sends the
saved topic, audience and notes to the configured DeepSeek gateway through the
existing `/api/v1/storyboards` planner, validates the returned storyboard,
saves it to the project, resets approval, and offers “Generate another” with a
replace confirmation. The planner accepts SSE-framed OpenAI-compatible gateway
responses; a real call returned a 7-scene, 73-second candidate. Saved candidate
history and full-script view are not implemented.

The Video step is a real gated route at `/app/projects/[id]/video`. It requires
an approved storyboard, lists approved scenes, and marks footage as not
generated. Actual text-to-video generation remains blocked: DeepSeek is
text-only, no text-to-video provider key or budget is configured, and the
project rules prohibit stock, stills, animation or fake progress as a
substitute. Selecting and validating one provider is the remaining V1 release
blocker.

## 32. Dashboard interaction update — 29 October 2026

The authenticated home now uses Inter at the studio root and a readable
sentence-case section hierarchy (`01/02/03`) instead of all-caps mono headings.
The create composer offers four sample prompts plus shuffle, a Clear action, a
live 2,000-character counter, Cmd/Ctrl+Enter submit, short format labels on
phones, and a CTA that stays disabled until the topic has at least eight
characters. The welcome header exposes a real Resume project action and the
Supabase status. The current-project title and thumbnail link to the active
step; Idea and Storyboard are linked steps, Video opens only after approval, and
Edit brief returns to Idea. Recent cards have hover arrows, honest topic
fallbacks and singular/plural scene counts. No new generated data, footage or
fake progress was introduced.

## 33. Projects library reskin — 29 October 2026

The `/app/projects` library now uses the dark Studio Obsidian foundation while
keeping the real Supabase project collection and all existing behavior: summary
counts, search, sort, grid/list views, real status filters, Open/Edit
idea/Duplicate/Delete actions, delete confirmation, loading, error retry and
honest empty states.

Requirements:

- Summary cards show the real Total, Drafts, In review and Approved counts. Do not
  add percentages, trends, creator counts or implied render activity.
- Search matches title or topic. Sort supports Latest updated, Oldest first and
  Title A–Z. Filters cover All, Drafts, Review, Approved, Generating, Ready and
  Failed with real counts. Generating/Ready/Failed remain intentionally empty
  until the render pipeline exists.
- Project thumbnails are a storyboard/brief motif with a 9:16 chip, real status
  badge, BRIEF/STORYBOARD label and real duration. There is no fake play button,
  preview video or stock thumbnail.
- Each card links to the correct next step (Idea for a brief, Storyboard for a
  storyboard), and the three-dot menu keeps Open project, Edit idea, Duplicate and
  Delete project.
- The delete dialog names the project, states that the Supabase row and current
  storyboard are permanently removed, and offers Cancel. No optimistic fake
  deletion.
- The page distinguishes first-project, search-empty, filter-empty and
  disconnected-pipeline states. Loading is a dark skeleton; a failed list request
  shows a retry alert. No fixture projects or fake activity.
- Typography stays within the studio scale: 13–14px body/form content, 11–12px
  labels, 16px card titles, 30–34px page heading. No 8–10px content text.
- Layout is one column on phones, two at `sm`, three at `xl`; list view uses a
  200px thumbnail; the toolbar stacks search above sort/view on phones; filter
  chips scroll horizontally on narrow screens. No horizontal page overflow.
- The Stitch reference is visual only. The app uses real Supabase data and honest
  states; illustrative project names, fabricated percentages, fake playback and
  simulation bars from the reference are not part of the product.

Evidence for this UI update is recorded in `docs/PROJECT-STATUS.md` (F30) and
`docs/DASHBOARD-SYSTEM-DESIGN.md` section 25. This change does not alter the API,
database schema or render pipeline; actual AI footage, narration, composition,
export and publishing remain future features.

## Private reference uploads — 6 November 2026

The Idea step now lets a signed-in user attach optional project-level reference
media before storyboard generation. This is a private storage and review feature;
it does not make image-to-video available.

Requirements:

- Accepted files are PNG/JPEG images up to 20 MB and MP4/WebM clips up to 100 MB.
  Thumbnails remain JPEG/PNG only. No arbitrary URL, PDF, DOCX or remote fetch.
- Uploads use short-lived presigned PUT URLs. The browser never receives storage
  credentials. Preview and download use short-lived signed GET URLs.
- The server records metadata, verifies the object's size, content type and magic
  bytes before marking it available, and rejects mismatches. A rejected object is
  deleted and its quota is released.
- The current per-owner reference quota is 500 MB. Pending intents expire after
  one hour. Quota and storage states must be shown honestly.
- The panel must say that references are saved for later scene work and that
  footage generation does not use them yet. Do not imply that an upload will be
  included in a generated clip.
- Image-to-video remains conditional V1: it requires provider support, reference
  rights, full decode/probe, scene binding and input-security tests. This slice
  does not satisfy those gates.

Evidence is recorded in `docs/PROJECT-STATUS.md` (F39), `docs/API-DESIGN.md` and
`docs/MEDIA-HOSTING.md`.

## Media probe + scene binding — 7 November 2026

A reference is not usable until the server has probed it. Finalize copies the
uploaded object to a fresh committed key, records native image/video properties
(dimensions, duration, codecs, frame rate) and requires a full decode. Images are
limited to 1–8192 px per side; videos to 0.1–60 seconds with a supported codec.
Probe or decode failure rejects the upload. The validated asset points only at
the committed key; the original upload key is deleted.

Storyboard scenes may bind one validated project reference. The binding is
optional, validated server-side against the same project, and included in the
review hash so a changed reference invalidates approval. A deleted reference
leaves a visible warning and a Clear action rather than silently disappearing.

This is still not image-to-video. Generation does not consume the bound reference,
and the provider capability/rights/input-security gates remain unmet. Evidence is
recorded in `docs/PROJECT-STATUS.md` (F40).

## Free project graphics implementation note — 7 November 2026

The Video step now has a free, explicitly labeled motion-graphics path for an
approved storyboard: Latin-script Hinglish on-screen text/captions, Devanagari
Hindi voice narration, and Remotion diagrams (`statement`, `steps`, `compare`,
`checklist`, `timeline`, `recap`) rendered to an authenticated 60–90-second MP4.
It is a supplementary graphics path, not AI footage, and it does not satisfy the
V1 footage gate. The visual pass adds problem→fix, cause→effect, big-number and
cycle layouts with icons, plus full-sentence highlighted captions. The production
UI keeps a compact preview and hides the AI-footage/provider notices; a backend
5-second `testMode` remains for internal diagnostics only and is labeled
`UI TEST · NOT A FINAL EXPORT`. Actual
text-to-video footage and its provider/budget decision remain open. Evidence is
recorded in `docs/PROJECT-STATUS.md` (F45).

## Videos library note — 7 November 2026

The studio exposes a Videos section that lists only the signed-in user's
completed, non-test renders. Each card uses a real generated thumbnail and the
authenticated MP4 route; failed/test/other-owner jobs are excluded and there are
no dummy videos. This is a library over the local graphics job artifacts, not a
publishing integration. Evidence: F47.

## Scene text editor note — 7 November 2026

The approved storyboard's on-screen Hinglish text, diagram type, labels, captions
and Devanagari Hindi voice narration are editable before rendering. The latest
completed render seeds the editor; saving only persists text and does not generate
video or consume voice credits. The Projects library now shows a real **Video
ready** state from actual completed renders instead of placeholder generation
states. Evidence: F48/F49. Production durability for local script files remains
open.

## Video backup note — 7 November 2026

The Videos page provides a **Backup all** action that copies the signed-in user's
completed non-test videos and metadata to a timestamped local backup folder. It is
a safety copy, not durable production storage, and uses no credits. Production
durability still requires object storage plus database metadata. Evidence: F50.

## Homepage feature alignment — 7 November 2026

The home now reflects the implemented free graphics path: current and recent
projects use real completed-render metadata, approved projects link to the Video
step, and the outdated “footage/video generation not connected” copy is removed.
The visible workflow is idea → storyboard → free graphics video → MP4 download;
publishing remains a later feature. Evidence: F51. Production durability for
local videos and scripts remains open.

## Idea + Storyboard production polish — 8 November 2026

The Idea and Storyboard pages use the production polish: 28/36px page titles
with balanced wrapping, `rounded-3xl` `.studio-surface` panels with soft
shadows, 14–15px inputs with a violet focus ring, sans-serif section labels and
brighter helper text. The Idea-directions empty state is a polished card, and
the Storyboard header keeps all four actions on one row with a `max-w-xl` title
and compact 13px buttons. The scene rail, canvas and inspector share the same
panel surface and spacing. No data, routes, generation or approval behavior
changes. Evidence: F54.

The purple dot backdrop is scoped to the Video, Videos, Projects and Scene text
pages only; Home, Idea, Storyboard and the other studio pages keep the plain
`#0B0B0F` backdrop. Evidence: F53.
