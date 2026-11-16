# Vydrivo — API Design

Version: 1.1
Date: 26 October 2026
Status: Target contract plus implemented slices; see section 16 for the Idea API
References: [PRD v1.4](PRD-V1.md), [Dashboard system design](DASHBOARD-SYSTEM-DESIGN.md), [Pipeline design](PIPELINE-TECHNICAL-DESIGN.md), [Database design](DATABASE-DESIGN.md)

## 1. Scope and decisions

This document defines the Next.js application's HTTP boundary, not an API supplied
by the configured planning provider, ElevenLabs or Meta. Their adapters remain
server/worker-only. It refines
the system design's endpoint sketch. No accounts, migrations, paid services or
application implementation are authorized by writing this contract.

V1: private projects; planning/brainstorming; reviewed storyboards; actual generated
footage; measured narration/captions; selective revisions; preview/export; history;
manual posting calendar; conditional official Instagram. Product videos are
60–90 seconds, vertical 1080×1920, 30 fps, H.264/AAC. Graphics diagnostics are
internal-only and cannot appear as accepted product renders or be published.
One video provider, saved male/female voice preferences, no user API keys, branding,
customer wallet or billing endpoints. V2 billing is separate from internal costs.

Resolved design choices:

- Approval and generation use separate endpoints. Approval is durable; enqueue is
  idempotent. The UI saves → approves → enqueues and can recover between steps.
- Conversation produces a proposal, never changes the draft automatically. Applying
  a proposal uses the same optimistic concurrency rules as autosave.
- Scene revisions produce a new draft. Source assets are immutable; accepted render
  manifests bind the exact selections. Regeneration never overwrites an old render.
- Drafts may be incomplete while editing; approval has stronger validation.
- Initial footage-share enforcement follows the prototype's provisional 50% rule,
  plus the PRD's substantive-motion and every-footage-scene requirements. It is
  policy, not a user-adjustable setting or proof of visual quality.
- Unknown external outcomes are persisted waiting reasons, not permission to retry.

## 2. Transport, naming and common types

Base path `/api/v1`; HTTPS outside loopback development. JSON UTF-8 for requests
and responses except media, redirects and empty responses. All examples use short
symbolic IDs (`p1`, `r1`) for readability; real IDs are UUID strings. Scene IDs are
stable UUIDs across revisions, scoped to one project. Prototype IDs such as
`scene-0` require an explicit import mapping; do not silently change asset hashes.

Conventions: camelCase JSON, snake_case database; UTC RFC3339 timestamps ending Z;
IANA timezone alongside scheduling; integers for versions, milliseconds, sample
positions and frame counts. JSON money uses integer micro-unit **decimal strings**
with explicit currency on internal endpoints. Never use floating-point currency.
Unknown request keys rejected. Omitted PATCH fields stay unchanged; null clears
only documented nullable fields. Strings are plain text, not HTML. Normalize line
endings to LF, preserve content, count Unicode code points for limits. No generated
code, arbitrary fetch URLs, local paths or provider model selection in user input.

Every JSON success: `{ "data": RESOURCE, "meta": { "requestId": "req_…" } }`.
Lists add `meta.page`. HTTP 204/304 have no JSON. Responses include `X-Request-Id`;
server generates it rather than trusting arbitrary incoming log identifiers.
Create uses 201 + Location; durable async operations use 202 + job Location.
Responses never expose storage keys, tokens, raw provider errors or source secrets.
Private responses use `Cache-Control: private, no-store` and never shared caching,
including authenticated redirects and responses setting cookies.

### Limits (initial configurable defaults)

| Input | Limit / rule |
|---|---|
| JSON body | 256 KiB; larger → 413 before parsing |
| Project title / display name | 1–120 / 1–80 code points |
| Idea topic + notes combined | 1–10,000; preserve original input separately from subsequent drafts |
| Revision instruction | 1–2,000; bounded conversation context, never unlimited provider history |
| Draft scenes | 0–24 while editing; 1–24 for approval |
| Scene narration / prompt / visual intent | 700 / 2,000 / 2,000 per scene; provider text limits additionally checked |
| Caption cue text | 1–100; readability/reflow checks before render |
| Posting caption | 0–2,000 initial application limit; revalidate current platform rules before live publication |
| Upload reference | JPEG/PNG/WebP only, ≤10 MiB, ≤4096×4096 and ≤16 megapixels, no animated/SVG files |
| Upload entitlement | image-reference flag + rights declaration required |
| Per project retained data | 250 MiB soft warning; 500 MiB hard admission cap initially, includes reservations |
| Page size | 20 default, 1–50 accepted; invalid → 422 |

These are pilot safeguards, not commercial plan limits. Word estimates cannot
prove a script fits 60–90 seconds; measured audio is authoritative.

## 3. Authentication and authorization

Use Supabase Auth for password storage, verification, email delivery and recovery.
Implement a same-origin backend-for-frontend session: application endpoints below
wrap supported Supabase server SDK flows; no parallel password database. Server
cookies Secure in HTTPS, HttpOnly, SameSite=Lax, host-only and Path=/; never expose
refresh/access tokens in JSON or localStorage. If SSR requires multiple cookies,
apply these settings consistently and test the selected SDK integration. The
browser does not call privileged database/provider APIs directly.

Validate signed identity and expiry on every protected request. Consult Auth for
current user/session on sensitive mutations (generation, publication, access grants,
deletion) and require verified email for the external pilot. Do not authorize from
`getSession()`'s unverified user object. Cryptographic claims verification and an
online user check have different revocation behavior; test logout/recovery flows.
[Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

All unsafe same-origin requests require an allowlisted Origin plus a server-bound
CSRF token in `X-CSRF-Token`; auth forms use a pre-session CSRF token. The Origin
must match `request.url`, or this app's public Amplify `Host`
(`*.d35b51hio740im.amplifyapp.com`) when Amplify rewrites that URL to an
internal compute address. `x-forwarded-host` counts only for `https` and that
same app host, and only when `Host` itself is internal. Another Amplify app,
or any other spoofed forwarded host, does not pass. Missing or mismatched token → 403. OAuth callback
GET uses one-time state instead. Email, recovery and Google callback URLs use
that same public origin, never the internal compute URL. Internal compute origins are never accepted or returned, even when a forwarded public host is present, so callback redirects always resolve to a browser-reachable origin. Reject
cross-origin credentialed API access; no wildcard CORS. Refresh serializes per
session to avoid competing token rotation. Failed refresh → 401, preserve UI
unsaved buffer. Sign-out revokes the session and clears cookies; stolen already
issued access tokens can have a remaining validity window, so do not promise
instant revocation everywhere.

Owner comes only from verified session. Return 404 for missing **and other-owner**
resources, including nested references. Never accept ownerId, roles, pricing,
status, approval identity or provider secrets in user mutations. Verify active
project lifecycle before operations. Application checks plus child-table RLS;
internal worker/operator credentials are distinct, scoped and audited. Operator
privileges cannot be edited through profile endpoints.

### Authentication endpoints

| Method / path | Request | Response / behavior |
|---|---|---|
| GET `/auth/csrf` | none | 200 `{csrfToken, expiresAt}`; binds pre-session/session cookie, no cache |
| POST `/auth/sign-up` | `{email,password,remember?}` | 202 `{message:"Check your email to continue."}` for new/existing accounts; provider policy failures sanitized |
| POST `/auth/sign-in` | `{email,password,remember?}` | 200 `{user:{id,emailVerified},csrfToken}` + cookies; 401 generic invalid credentials; 403 verification required only after valid credentials |
| GET `/auth/callback` | provider code + bound PKCE/state | exchange once; 303 to fixed `/app` or recovery page; expired/replayed link → safe error page |
| POST `/auth/refresh` | empty object | 200 `{expiresAt,csrfToken}` + rotated cookies, 401 if invalid |
| POST `/auth/sign-out` | empty object | 204 even if already logged out; clear cookies |
| POST `/auth/recovery` | `{email}` | 202 generic message, identical for unknown account |
| POST `/auth/password` | `{newPassword}` | 204 with valid recovery-scoped session; reject ordinary unauthenticated calls |

Email max 254; password 12–128 characters, no silent trimming, provider policy
may impose additional constraints. Never log bodies for these routes. Redirects
are fixed/allowlisted paths, never user-supplied external URLs. Pilot signup is
invite-restricted server-side; disabled signup returns 403 FEATURE_UNAVAILABLE.
Recovery links do not auto-sign in to an attacker-selected destination.

`remember` is an optional boolean (default false) on sign-in/sign-up. When a
session is issued, true sets a 30-day refresh cookie and a host-only
`vydrivo_remember` marker lets `/auth/refresh` preserve that lifetime; otherwise
the refresh cookie lasts 14 days. Access cookies keep the provider's
`expires_in`.

## 4. Errors, throttling and retry semantics

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This draft changed in another tab.",
    "retryable": false,
    "details": {"currentVersion": 9},
    "fields": [{"path": "expectedVersion", "code": "STALE_VERSION"}]
  },
  "meta": {"requestId": "req_example"}
}
```

| HTTP | Codes and meaning |
|---|---|
| 400 | MALFORMED_JSON, INVALID_CURSOR, UNKNOWN_QUERY_PARAMETER |
| 401 | AUTH_REQUIRED, SESSION_EXPIRED, INVALID_CREDENTIALS |
| 403 | CSRF_FAILED, EMAIL_VERIFICATION_REQUIRED, FEATURE_UNAVAILABLE |
| 404 | NOT_FOUND; no tenant existence disclosure |
| 409 | VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, INVALID_STATE, STALE_APPROVAL, OUTCOME_UNCERTAIN, JOB_LIMIT, RESOURCE_IN_USE |
| 413 / 415 | PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE |
| 422 | VALIDATION_FAILED, DURATION_OUT_OF_RANGE, UNSUPPORTED_VISUAL, CAPABILITY_MISMATCH, AMBIGUOUS_LOCAL_TIME |
| 429 | RATE_LIMITED; integer Retry-After seconds |
| 503 | CAPABILITY_UNAVAILABLE, FREE_ALLOWANCE_UNAVAILABLE, WORKER_UNAVAILABLE, BUDGET_BLOCKED; safe retry guidance |
| 500 | INTERNAL_ERROR; request ID, no stack or provider body |

Do not use 402 for internal budgets: V1 has no checkout. `retryable:true` means
retry under the same logical request/key after the indicated delay, not a new
billable submission. Provider asynchronous failures appear in job state, not as
a late change to the already returned 202. UI never automatically retries mutations
with a fresh key. Database deadlock/serialization retries happen internally only
before external calls and with a bounded retry count.

Initial account limits: read 120/minute; autosave 60/minute/project; planning
5/minute/account; generation create 3/minute/account; access grants 30/minute;
auth attempts 5/minute/IP plus account-specific protection; recovery 3/hour/account
and 10/hour/IP. Store limiter state consistently across web instances; in-memory
per-instance limiting is insufficient. Do not trust arbitrary forwarded IP headers.
One running generation and three queued generation jobs per owner, global queue
cap 20; one heavy local worker. Caps enforced transactionally. Quota/provider
exhaustion is distinct from request-rate throttling.

## 5. Pagination, filters and idempotency

List example: `GET /projects?limit=20&status=ready&q=water&cursor=OPAQUE`.
Project sort `(updatedAt DESC,id DESC)`; other lists `(createdAt DESC,id DESC)`
unless stated. Cursor is versioned, signed, opaque and bound to actor, endpoint,
filters, sort, last sort key and expiry (24h). Reject tampering, expiry or reuse
with changed filters; never accept a client SQL offset/expression. Fetch limit+1.

```json
{"data":[{"id":"p1","title":"Water cycle","updatedAt":"2026-10-19T10:00:00Z"}],
 "meta":{"requestId":"req_list","page":{"limit":20,"nextCursor":null,"hasMore":false}}}
```

No exact total count by default. Title-only case-insensitive literal search, q≤120;
escape wildcard characters, parameterize SQL. Status is a documented derived
projection, not an arbitrary SQL condition. Lists are live, not snapshot-isolated
across requests: edits may move projects between pages. UI deduplicates by ID and
refreshes the first page; do not promise complete snapshot traversal. Library
expiration/deletion may similarly remove results mid-pagination.

`Idempotency-Key` (UUID) is required for every POST mutation except auth and
worker heartbeat/claim; DELETE also requires it. Scope `(owner,operation,key)`;
operation includes route template and resolved resource ID. Store canonical body
hash, referenced versions, durable result IDs/status in the same transaction as
the mutation. Same key/same payload replays original result; different payload
409. Recheck current ownership/deletion before replay; never replay signed URLs
or secrets. Access-grant repeats issue a fresh short-lived URL after authorization.
Accepted keys for provider work/publication remain until parent retention cleanup;
other keys minimum 30 days. Do not evict active/uncertain-operation keys. Local
client reuses the original key after network timeout, even across page refresh.
PUT/PATCH use expectedVersion and are naturally compare-and-swap; repeating an
already committed save with an old version returns 409, prompting a GET/compare.

## 6. Shared resource contracts

### Draft storyboard (schemaVersion 1)

```json
{
 "schemaVersion":1,"title":"The water cycle",
 "scenes":[{
   "sceneId":"s1","title":"Evaporation","narration":"The sun warms the water.",
   "estimatedDurationMs":10000,
   "visual":{"kind":"ai-generated-footage","intent":"Show vapor above a lake",
     "prompt":"Morning sunlight above a lake; gentle mist moving upward",
     "referenceAssetId":null,"layout":null,"labels":[],"events":[]},
   "voicePreference":"female","captionOverrides":[],"clipSelections":[]
 }]
}
```

The single-scene JSON above is a shape excerpt, not an approvable 60–90-second board.
Order is array order; no separate contradictory order input. Allowed visual kinds
`ai-generated-footage|motion-graphics`. Graphics layout allowlist initially
`title|process|comparison`; advertise only layouts actually implemented in
bootstrap. Comparison remains unavailable until its reusable component is built. Labels≤8×50 characters; events≤32, each `{id,phrase,occurrence,action,
targetLabelIndex}`; occurrence positive, action `reveal|highlight`. Exact phrase
must exist in narration; ambiguous repeated phrases require occurrence. No JS,
SVG source, CSS, model names or provider request IDs supplied by AI/user.

`captionOverrides`: `{cueId,text,sourceNarrationHash}`; cues reference validated
narration timing. Text correction doesn't change speech or timing. New narration
invalidates overrides; reject stale cue IDs. `clipSelections`: `{assetId,inMs,outMs}`;
ordered sources within a scene, end>start, source duration/ownership checked.
Explicit regeneration is a separate generation plan, not a mutated asset ID.
VoicePreference is male/female only; actual usable voice/model is resolved and
recorded by the server. Changes invalidate affected speech. referenceAssetId
requires a validated owned image and active capability.

Draft validation permits zero scenes and temporarily empty narration/prompt.
Approval requires nonempty fields, 1–24 unique stable scenes, 60–90 seconds total
estimate, supported layout/cues, footage policy, complete references and no unsafe
fields. Estimated seconds do not become caption timings. Prototype schema is
narrower: import/export needs an explicit mapping and separate canonical hash.

### Projections

Project: `{id,title,lifecycle,version,draftVersion,displayStatus,latestRenderId,
hasUnrenderedChanges,createdAt,updatedAt}`. `displayStatus` is derived: draft,
needs_review, generating, ready, failed; add hasUnrenderedChanges rather than
losing an older ready output. Draft: `{projectId,version,baseRevisionId,selectedConcept,storyboard,
validationIssues,updatedAt}`. Revision: `{id,projectId,parentRevisionId,contentHash,
schemaVersion,approvedAt,approvedBy,storyboard}`. Render: `{id,revisionId,status,
assetId,durationMs,width,height,fps,videoCodec,audioCodec,nativeQualitySummary,
createdAt}`. No media URL until an access-grant request.

Job example:

```json
{"data":{"id":"j1","projectId":"p1","revisionId":"r1","kind":"generation",
 "state":"running","waitingReason":"provider_pending","progressVersion":8,
 "stages":[{"name":"narration","completed":4,"total":4},{"name":"footage","completed":1,"total":6}],
 "canCancel":true,"canRetry":false,"nextPollAfterMs":5000,"lastHeartbeatAt":"2026-10-19T10:10:00Z",
 "result":null,"failure":null},"meta":{"requestId":"req_job"}}
```

Provider progress unknown means no percentage/ETA. Results discriminate
`{proposalId}`, `{renderId}`, or `{cleanupCompleted:true}` by kind. Failure is
`{stage,code,message,retryable}`; no raw provider error text.

## 7. Profile, bootstrap and projects

All routes below require authenticated, verified owner unless stated. `V` means
expectedVersion required; `K` means Idempotency-Key required. Successes are wrapped
as section 2; resource names refer to section 6.

| Method / path | Request/query | Success | Specific behavior |
|---|---|---|---|
| GET `/bootstrap` | none | 200 `{profile,capabilities,worker,activeJobs,recentProjects}` | Aggregate; recentProjects max 5, activeJobs max 4; no provider secrets/cost balances |
| GET `/profile` | none | 200 `{id,displayName,timezone,version}` | Auth email shown separately, not editable here |
| PATCH `/profile` | V, optional displayName/timezone | 200 profile | IANA zone validation; no arbitrary role fields |
| GET `/projects` | q,status,limit,cursor | 200 list<Project> | Exclude tombstones |
| POST `/projects` | K `{title,input:{topic,notes}}` | 201 `{project,draft}` | Atomically creates project + empty draft v1; no AI call |
| GET `/projects/:id` | none | 200 `{project,draft,activeJobs,latestRender}` | Bound jobs; no full unbounded asset history |
| PATCH `/projects/:id` | V `{title}` | 200 Project | Metadata version independent of draft version |
| DELETE `/projects/:id` | K `{expectedVersion,confirmDelete:true}` | 202 `{cleanupJobId,lifecycle:"deleting"}` | Tombstone/cancel unsent work atomically; no promise to unpublish external posts |
| GET `/projects/:id/draft` | none | 200 Draft | Restore editor state |
| PUT `/projects/:id/draft` | `{expectedVersion,baseRevisionId,storyboard}` | 200 Draft | Full replacement, CAS; same-owner base revision required |
| GET `/projects/:id/revisions` | limit,cursor | 200 list<RevisionSummary> | Snapshot metadata, no large storyboards per row |
| GET `/projects/:id/revisions/:revisionId` | none | 200 Revision | Require both project/revision ownership |
| POST `/projects/:id/revisions` | K `{expectedDraftVersion,approve:true}` | 201 Revision | Strong approval validation, hash exact saved content; duplicate content can return existing revision |

Bootstrap capabilities: object keyed by feature, each `{available,reasonCode}`;
include planning, generation, voice, imageReference, instagramConnect,
instagramPublish, automaticScheduling; `supportedLayouts` and voice availability
are explicit. Worker `{available,lastSeenAt}` does not expose laptop identity.
Missing worker may accept a bounded queued job with waitingReason worker_offline;
unconfigured capabilities/budget fail admission before creating remote work.

Autosave example: PUT draft with expectedVersion 7 → 200 version 8. Concurrent
save using 7 → 409 currentVersion 8. No last-write-wins. UI serializes saves,
debounces ~1 second, flushes before approval and preserves unsaved text on 401/409.
Draft writes do not reset queued revision jobs; their immutable input stays stable.

## 8. Planning, conversation and scene edits

| Method / path | Request | Success |
|---|---|---|
| POST `/projects/:id/proposals` | K `{expectedDraftVersion,mode,instruction}`; mode `brainstorm\|storyboard\|revise\|posting-caption` | 202 `{jobId,proposalId}` |
| GET `/projects/:id/proposals` | limit,cursor | 200 proposal summaries |
| GET `/projects/:id/proposals/:proposalId` | none | 200 Proposal |
| POST `/projects/:id/proposals/:proposalId/apply` | K `{expectedDraftVersion,selectedConceptId?,confirmGlobalChange}` | 200 Draft or posting-caption candidate |
| POST `/projects/:id/proposals/:proposalId/dismiss` | K `{expectedVersion}` | 200 Proposal status dismissed |
| GET `/projects/:id/conversation` | limit,cursor | 200 messages with role, text, proposalId, createdAt |
| POST `/projects/:id/scene-revisions` | K `{baseRevisionId,expectedDraftVersion,edit}` | 200 `{draft,affectedDependencies}` |

Proposal: `{id,version,status,mode,baseDraftVersion,jobId,concepts,proposedStoryboard,
postingCaption,changeSummary,requiresGlobalConfirmation,createdAt}`. Nullable result
fields depend on mode. Pending/failed proposals never apply. Brainstorm returns
at most 3 concepts `{id,title,summary}`; applying a concept sets draft.selectedConcept (`{id,title,summary}`)
and requires a follow-up storyboard proposal, not silent video generation.
Posting-caption output is a candidate for the post composer, not approval to publish.
Conversation pagination uses immutable sequence descending, not createdAt; the
cursor binds that order. Persist user requests and visible summaries, never chain-of-thought.

`edit` is a discriminated union:

- `{type:"narration",sceneId,text}` → invalidate selected speech/cues and dependent timing.
- `{type:"visual",sceneId,prompt,referenceAssetId}` → invalidate affected footage only.
- `{type:"caption",sceneId,cueId,text,sourceNarrationHash}` → preserve speech/footage.
- `{type:"trim",sceneId,clipSelections:[{assetId,inMs,outMs}]}` → validate coverage.
- `{type:"reorder",sceneIds:[...]}` → exact permutation; no missing/duplicate IDs.
- `{type:"voice",sceneId,voicePreference}` → speech/timing invalidation.

Add/remove scenes through draft PUT or reviewed proposal. Regenerate unchanged
prompt uses generation `regenerateSceneIds`, not a meaningless narration edit.
Scene edits require baseRevisionId to match draft.baseRevisionId (or an explicit
initial fork into an unedited draft); otherwise 409, never discard intervening edits.
Proposal apply checks exact base version, merges nothing implicitly, increments
draft version once, and marks proposal applied in the same transaction.

## 9. Generation, jobs and rendering

| Method / path | Request | Success / rules |
|---|---|---|
| POST `/projects/:id/generations` | K `{revisionId,regenerateSceneIds:[]}` | 202 `{jobId,revisionId}`; revision must be approved, live, and owned |
| GET `/jobs` | projectId?,state?,limit,cursor | 200 list<JobSummary>; only owner jobs |
| GET `/jobs/:id` | none | 200 Job; ETag from progressVersion, If-None-Match → 304 |
| POST `/jobs/:id/cancel` | K `{expectedVersion}` | 202 Job with cancellationRequestedAt; may already be terminal |
| POST `/jobs/:id/retry` | K `{expectedVersion}` | 202 new Job with retryOfJobId; old failed job immutable |
| GET `/projects/:id/renders` | limit,cursor | 200 list<Render> |
| GET `/projects/:id/renders/:renderId` | none | 200 Render + source-quality summary |

Generation uses one revision and a server-built dependency plan. Reuse compatible
assets across revisions using owned hashes; regenerateSceneIds force fresh footage
attempts for those footage scenes. Arrays unique, known scene IDs only. Every
new attempt rechecks current capabilities and free/budget eligibility. Approval
alone authorizes neither payment nor publication. If footage cannot fit audio,
job waits approval_needed with a proposal; never rewrites approved narration.

Queue acceptance is durable in one transaction. Job waitingReason enum:
worker_offline, provider_pending, quota_exhausted, approval_needed,
uncertain_submission, budget_blocked, reconnect_required, null. Only
failed definitive outcomes can retry; uncertain → 409 OUTCOME_UNCERTAIN. Explicit
cancel stops new submissions, while already accepted work is reconciled. A
canceled job cannot become succeeded because a late callback arrived.

Poll every 5 seconds while active, back off 15–30 seconds unchanged, pause when
hidden/offline, refresh on focus. Export uses existing accepted render asset;
download never generates another video. ETag revalidation is private and
application-managed, not shared HTTP caching.

## 10. Media and references

| Method / path | Request | Success |
|---|---|---|
| GET `/assets` | projectId?,kind?,status?,limit,cursor | 200 metadata list |
| GET `/assets/:id` | none | 200 `{id,projectId,kind,status,bytes,mime,checksum,nativeProperties,expiresAt}` |
| POST `/assets/upload-intents` | K `{projectId,mime,bytes,sha256,rightsConfirmed:true}` | 201 `{assetId,uploadUrl,method,headers,expiresAt}` |
| POST `/assets/:id/finalize` | K `{uploadReceipt}` | 202 `{validationJobId,assetId,status:"pending"}` |
| POST `/assets/:id/access` | K `{purpose:"preview"\|"download"}` | 200 `{url,expiresAt,mime,filename}` |
| DELETE `/assets/:id` | K `{confirmDelete:true}` | 202 cleanup job; 409 if retained revision/job/post still references it |

Only references are user-uploadable in V1; generated outputs use worker grants.
Upload grant expires in 5 minutes, exact generated quarantine key, fixed method
and allowed headers. No credentials or arbitrary object keys. Admission reserves
bytes; expired intents release only after object reconciliation. Finalize verifies
stored bytes/hash/signature/dimensions and bounded decoding, strips image metadata,
and marks a normalized safe derivative validated. Client receipt is not proof.
Oversized/unsafe uploads rejected and cleaned. Admission and finalize both enforce
quota because signed uploads may not enforce all application limits.

Access links last 5 minutes, only for validated retained assets in active projects;
allow Range requests for video. Local handler checks ownership and range bounds;
hosted links use private R2. Responses downloadable only for accepted export assets
or permitted own source assets. Refresh by obtaining a new link. Delete/revoke
cannot promise immediate invalidation of already-issued links; backing object
removal and short expiry bound exposure. No public-sharing route in V1.

## 11. Connections, manual posting and conditional publication

Instagram fields below describe our internal contract, not an assumed Meta version.
No API calls enabled until eligibility, scopes, media rules and integration tests
pass. Automatic scheduling also requires a persistent worker. Keep manual fallback.

| Method / path | Request | Success |
|---|---|---|
| GET `/connections/instagram` | none | 200 `{status,accountLabel,expiresAt,availableScopes}`; no tokens |
| POST `/connections/instagram/start` | K `{returnTo:"settings"}` | 200 `{authorizationUrl,expiresAt}`; state single-use, 10-minute TTL, session-bound |
| GET `/connections/instagram/callback` | code,state or provider error | 303 allowlisted settings; token exchange server-only |
| DELETE `/connections/instagram` | K `{confirm:true}` | 202 `{status:"disconnected"}`; prevent queued posts, reconcile in-flight |
| GET `/publications` | from,to,mode?,state?,limit,cursor | 200 list<Publication>; half-open UTC interval ≤93 days; sort `(scheduledFor,id)` ascending, nulls excluded for calendar |
| GET `/publications/:id` | none | 200 Publication |
| POST `/publications` | K body below | 201 draft Publication; does not publish |
| PATCH `/publications/:id` | V caption?,schedule?,renderId? | 200 draft Publication only; frozen approved snapshots cannot be edited |
| POST `/publications/:id/approve` | K `{expectedVersion,approve:true}` | 200 planned manual / 202 scheduled API; freeze snapshot |
| POST `/publications/:id/mark-published` | K `{expectedVersion,confirmedManualUpload:true,publishedAt}` | 200 published with confirmationSource manual; manual mode only |
| POST `/publications/:id/cancel` | K `{expectedVersion}` | 202 cancellation intent or 200 canceled before submission |

Create body: `{projectId,renderId,mode:"manual"|"instagram",caption,
schedule:{kind:"now"|"at",instant:null|"2026-10-20T04:30:00Z",timezone:"Asia/Kolkata"}}`.
`at` requires future instant, up to 30 days, and retention coverage for processing;
`now` uses server time on approval. Store original zone; never reinterpret time
when profile timezone changes. UI must ask for offset choice at repeated DST times
and reject nonexistent local times before conversion; API verifies IANA zone and
instant, and validates any supplied local wall-clock representation against them.

Publication: `{id,version,projectId,renderId,mode,state,caption,scheduledFor,timezone,
confirmationSource,remoteMediaId,publishedAt,waitingReason,cancellationRequestedAt}`.
An approved render/caption/time is frozen. Replacement means cancel unsent record
and create/approve a new one. Once submission may have occurred, reconcile before
replacement; otherwise a duplicate external post could result. Known failed API
posts require a fresh explicit approval after reconciliation, no blind retry route.

Late scheduling >15 minutes requires renewed user approval; do not auto-post old
content when a laptop wakes. Manual overdue items stay planned with overdue flag.
No automatic publication on generation success. Manual confirmations are visibly
self-reported; API published requires verified remote ID. Public provider media
fetch, if required, uses a narrow single-purpose token/URL with a tested processing
TTL, never a public bucket or reusable user preview URL. Store/log only token hash.

## 12. Internal worker and callback API

Prefix `/internal/v1`; unreachable with a user's session cookie. Revocable worker
credential with allowlisted scopes + active worker registration, TLS, no arbitrary
SQL, secrets or cross-project list endpoints. Job-scoped grants and lease tokens
expire; heartbeat must not resurrect a revoked lease. Worker outputs are untrusted
until the API verifies their identifiers/metadata. Operator tools use a separate
credential, not the worker secret. No operator console required.

| Method / path | Input | Output / checks |
|---|---|---|
| POST `/tasks/claim` | `{workerId,capabilities,maxTasks:1}` | 200 `{task:null}` or task + fencingToken,leaseExpiresAt,scoped input grants |
| POST `/tasks/:id/heartbeat` | `{fencingToken,progressVersion}` | 200 new lease expiry; stale token →409 |
| POST `/tasks/:id/attempts` | K `{fencingToken,requestHash,capabilityVersion,submissionKind}` | 201 `{attemptId,submissionPermit,expiresAt}` after server quote/reservation |
| POST `/attempts/:id/submission-start` | K `{fencingToken,submissionPermit}` | 200 persisted submitting intent; one use, final expiry/kill-switch check |
| POST `/attempts/:id/observations` | K `{remoteId?,observedState,evidenceDigest}` | 200 observation; cannot declare no-charge without authoritative evidence |
| POST `/tasks/:id/complete` | K `{fencingToken,outputAssetIds,manifestHash}` | 200 task; all output validation, revision and lease fences enforced |
| POST `/tasks/:id/fail` | K `{fencingToken,category,submissionMayHaveOccurred}` | 200 classified failure/uncertain state; no raw provider body |
| POST `/tasks/:id/release` | `{fencingToken,nextEligibleAt,waitingReason}` | 200; only safe polling/wait tasks, not unknown submit replay |
| POST `/assets/intents` | K `{taskId,fencingToken,kind,bytes,sha256,mime}` | 201 scoped upload grant; no arbitrary object path |
| POST `/assets/:id/finalize` | K `{taskId,fencingToken,receipt}` | 202 validation; MIME/hash/limits checked before use |

Provider callback `/api/v1/webhooks/:provider` accepts authenticated provider events
only: verify signature over raw bytes and timestamp/replay protection, bound body,
map existing remote attempt, deduplicate event ID, queue reconciliation, return 204.
Unknown identity rejected safely. If signatures unavailable, callback never proves
success; use authenticated server-to-server polling. A callback cannot revive a
canceled/deleted job. Stale workers may record remote identity through observation
for reconciliation, but cannot commit task outputs with an old fence.

## 13. State and transaction linkage

Database design is authoritative for transitions/locks. Every transition has
expected current state/version and an audit event in its transaction. No SQL
transaction stays open across planning/TTS/video/Meta/storage network calls.

| API action | Atomic database boundary |
|---|---|
| Create project | project + empty draft + idempotency result |
| Save / apply proposal | CAS draft + proposed/applied state + audit |
| Approve | strong validation + immutable revision/scenes + approval actor/hash |
| Enqueue generation | ownership/approval + queue capacity lock + job/tasks + replay result |
| Submit provider work | authorization/budget locks + reservation + attempt intent; later separate external call |
| Complete render | validated assets + immutable manifest + accepted render + latest pointer under revision ordering |
| Delete project | tombstone + cancel unsent work/publications + cleanup job |
| Approve post | freeze render/caption/time + publication state + worker task if enabled |

## 14. Verification and Stitch handoff

Contract tests must cover all routes for authentication, owner mismatch, limits,
unknown keys, CSRF, replay, version conflicts and safe error bodies. Include
concurrent autosave/enqueue/budget, cross-tenant child IDs, expired grants, upload
oversize, worker death after submission, stale fences, repeated callbacks, expired
OAuth state, DST and late schedules. Deterministic mocks never satisfy live footage
gates. Generate an OpenAPI specification from these contracts during implementation;
this Markdown is the design source, not a claim of generated/validated OpenAPI.

Stitch should design these visible states: initial/empty lists, saving/unsaved/
conflict, review-required, proposal diff, missing capability, queued worker-offline,
active stages, checking uncertain outcome, failed/retryable, cancel pending, older
render with new edits, expired playback refreshing, manual-only publishing,
reconnect-required, overdue scheduling and deletion confirmation. Do not show
billing, provider keys, a model marketplace or diagnostic modes as V1 features.

PRD mapping: FR-01 sections 3/7; FR-02–06 sections 6–8; FR-07–13 sections 6/9/10;
FR-14–17 sections 5/7/9/10; FR-18–21 and 29 section 11; FR-22 sections 7/10/13;
FR-23–27 sections 6/9/10/12/13; FR-28 sections 4/14.


## 15. Concrete happy-path and recovery examples

The IDs below stand for UUIDs. Envelope examples omit unrelated optional fields.

Create project:

```http
POST /api/v1/projects
Content-Type: application/json
Idempotency-Key: 00ccdb03-1471-4e73-9464-b61c4c64bac1
X-CSRF-Token: <session-bound-token>

{"title":"Water cycle","input":{"topic":"Explain the water cycle","notes":"For beginners"}}
```

```json
{"data":{"project":{"id":"p1","title":"Water cycle","lifecycle":"active","version":1,"draftVersion":1,"latestRenderId":null},"draft":{"projectId":"p1","version":1,"baseRevisionId":null,"selectedConcept":null,"storyboard":{"schemaVersion":1,"title":"Water cycle","scenes":[]}}},"meta":{"requestId":"req_create"}}
```

Plan, poll and apply (each POST uses its own stable idempotency key):

```text
POST /projects/p1/proposals
{"expectedDraftVersion":1,"mode":"storyboard","instruction":"Explain the process clearly for beginners."}
→ 202 data: {"jobId":"j1","proposalId":"pr1"}
GET /jobs/j1
→ 200 data: {"id":"j1","state":"succeeded","result":{"proposalId":"pr1"}, ...}
GET /projects/p1/proposals/pr1
→ 200 data: {"id":"pr1","status":"ready","baseDraftVersion":1,"proposedStoryboard":{...}, ...}
POST /projects/p1/proposals/pr1/apply
{"expectedDraftVersion":1,"confirmGlobalChange":true}
→ 200 Draft with version 2 and the proposed storyboard
```

After edits have been saved and reviewed:

```text
POST /projects/p1/revisions
{"expectedDraftVersion":2,"approve":true}
→ 201 Revision r1 with contentHash and approvedAt
POST /projects/p1/generations
{"revisionId":"r1","regenerateSceneIds":[]}
→ 202 {"jobId":"j2","revisionId":"r1"}
```

If the second response is lost, resend the same body and same key: get j2, not a
second generation. If free eligibility is unavailable instead, return 503
FREE_ALLOWANCE_UNAVAILABLE and create no provider submission. If accepted but the
worker goes offline, j2 remains queued with worker_offline, not an HTTP timeout.

Caption-only revision:

```json
{"baseRevisionId":"r1","expectedDraftVersion":2,"edit":{"type":"caption","sceneId":"s1","cueId":"cue-2","text":"Water vapor rises.","sourceNarrationHash":"<sha256>"}}
```

POST scene-revisions returns a new Draft and
`affectedDependencies:{narration:[],footage:[],composition:["s1"],render:true}`.
Approve that draft and enqueue: the task graph reuses source audio/footage. Every
edit type returns the same dependency shape, with affected stable scene IDs.

Download:

```text
GET /projects/p1/renders/render1 → accepted Render with assetId a1
POST /assets/a1/access  {"purpose":"download"}
→ 200 {"url":"<short-lived-authorized-url>","expiresAt":"2026-10-19T10:35:00Z","mime":"video/mp4","filename":"water-cycle.mp4"}
```

Posting without Instagram access:

```text
POST /publications
{"projectId":"p1","renderId":"render1","mode":"manual","caption":"How the water cycle works.","schedule":{"kind":"at","instant":"2026-10-20T04:30:00Z","timezone":"Asia/Kolkata"}}
→ 201 draft Publication post1, version 1
POST /publications/post1/approve {"expectedVersion":1,"approve":true}
→ 200 planned Publication, version 2
POST /publications/post1/mark-published
{"expectedVersion":2,"confirmedManualUpload":true,"publishedAt":"2026-10-20T04:31:00Z"}
→ 200 published Publication, confirmationSource manual
```

Do not automatically mark a manual item published at scheduled time. Provider
identifiers are absent from the manual response. PublishedAt cannot be in the
future; allow historical manual confirmation with explicit user action.

Operational liveness: unauthenticated GET `/health/live` returns only 200
`{status:"ok"}` without dependency checks or environment details. Restricted
`/internal/v1/health/ready` reports database/worker/storage readiness using bounded
read-only checks, never generation or paid resource creation. These probes do not
promise the model is available or the full user journey succeeds.

## 16. Implemented Idea & Prompt API — Feature 1 (26 October 2026)

This section records the implemented slice; earlier sections remain target contracts.
All routes require a verified Supabase session, same-origin CSRF for mutations, and
owner-scoped project access. Responses use the existing `{data,meta}` envelope.

### Project idea fields

`GET /api/v1/projects/:id` and the list route now return:

```json
{
  "id": "uuid",
  "title": "Project title",
  "topic": "Explain RAM versus storage",
  "audience": "Beginner computer users",
  "notes": "Use a desk analogy.",
  "voicePreset": "daniel-test",
  "storyboard": null,
  "review": { "approved": false, "storyboardHash": "" },
  "status": "draft",
  "updatedAt": "2026-10-26T10:00:00.000Z"
}
```

`PATCH /api/v1/projects/:id` accepts `title`, `topic`, `audience`, `notes`,
`voicePreset`, `format`, `formatId`, `targetSeconds`, `targetLabel`, `aspect` and
`storyboard`, plus the required `baseUpdatedAt` version token described below.
`audience` is at most 500 characters; `notes` is at most 20,000 and
may contain line breaks; `voicePreset` must be one of the supported presets. Unknown
fields are rejected. Ownership, status, approval and hashes remain server-controlled.

### Optimistic project versions

`PATCH /api/v1/projects/:id` and `PUT /api/v1/projects/:id/storyboard` are
conditional writes. Both require `baseUpdatedAt`: the exact `updatedAt` string the
client last loaded. The server applies the write only when the stored `updated_at`
still equals that token.

- Missing or malformed token: `428 PROJECT_VERSION_REQUIRED`; nothing is written.
- Stale token: `409 PROJECT_CONFLICT`. The body carries the current server project at
  `error.details.project`, so the client can show the difference and let the user
  reload or deliberately overwrite.
- The project was deleted: `404 PROJECT_NOT_FOUND`.
- A successful write returns the new project, including the advanced `updatedAt` that
  the next write must send.

The version token is the existing `updated_at` column; the database trigger advances
it on every write. Clients never send `updatedAt`, `ownerId`, `status` or approval as
writable fields. The Idea and Storyboard editors keep the token in a ref so queued
autosaves use the newest returned version instead of conflicting with their own
previous write. A conflict pauses autosave until the user chooses **Reload latest**
or **Save mine over it**.

### Storyboard scene references

`PUT /api/v1/projects/:id/storyboard` accepts an optional `referenceAssetId` on
each scene. It must be a UUID for a `validated` `reference` asset in the same
project; a missing, foreign or deleted asset returns
`422 MEDIA_REFERENCE_NOT_FOUND` and writes nothing. Draft saves with a reference
are validated too, not only approval. A present reference is included in the
review hash, so adding, changing or clearing it invalidates approval. Boards with
no references keep the previous hash shape. The asset list used by the picker is
the project-scoped `GET /api/v1/media/assets` response filtered to `validated`
references.

### Client session recovery

Project, storyboard and idea requests use `lib/session-fetch.js`. A `401`
triggers one `POST /api/v1/auth/refresh` and a single retry. The retry reuses the
`csrfToken` returned by the refresh response, so concurrent retried mutations
share a valid token instead of rotating the CSRF cookie against each other.
Concurrent `401`s share one in-flight refresh. A failed refresh returns the
original `401`; the client does not loop and does not treat a background fetch as
a sign-out. `SessionKeeper` uses the same helper on pages that need a page-load
refresh.

### Suggest or refine ideas

`POST /api/v1/projects/:id/ideas`

Request:

```json
{
  "topic": "Explain RAM versus storage",
  "audience": "Beginner computer users",
  "notes": "Use a desk and filing cabinet analogy.",
  "feedback": "Make it more beginner-friendly",
  "previousSuggestions": [
    {
      "title": "The desk and the filing cabinet",
      "hook": "Your computer forgets everything when the power goes off.",
      "angle": "Use a desk for active work and a filing cabinet for storage.",
      "outline": ["Open with a messy desk", "Show active work", "Move finished work"],
      "visualDirection": "Warm overhead desk scene.",
      "sampleScenePrompt": "Slow top-down push-in on a wooden desk, warm light, 9:16, 5 seconds, no text."
    }
  ]
}
```

`topic` is required (1–2,000 characters). `audience` (≤500), `notes` (≤20,000),
`feedback` (≤1,000) and `previousSuggestions` (≤5) are optional. Feedback requests a
refinement; previous suggestions are context, not trusted instructions.

The provider is asked for a concise 1,200-character `sampleScenePrompt`, but the
validator accepts up to 2,000 characters and clamps longer prompts at a word
boundary. One overlong scene prompt therefore no longer rejects the whole
suggestion batch. Other suggestion fields keep their stricter bounds.

Success `200`:

```json
{
  "data": {
    "suggestions": [
      {
        "title": "The desk and the filing cabinet",
        "hook": "Your computer forgets everything when the power goes off.",
        "angle": "Use a desk for active work and a filing cabinet for storage.",
        "outline": ["Open with a messy desk", "Show active work", "Move finished work"],
        "visualDirection": "Warm overhead desk scene.",
        "sampleScenePrompt": "Slow top-down push-in on a wooden desk, warm light, 9:16, 5 seconds, no text."
      }
    ],
    "model": "ocg/deepseek-v4.1-flash",
    "provider": "openai-compatible"
  },
  "meta": { "requestId": "req_..." }
}
```

Rules:

- 3–5 suggestions; bounded plain-text fields; 3–5 outline beats; no links, code,
  HTML, control characters or duplicate titles. A 2-beat outline is padded from
  the hook and a 6-beat outline is trimmed; an empty outline is still rejected.
- After a successful generation, the route upserts the latest set into
  `project_idea_suggestions` (migration `0003`). This table is separate from
  `projects`, so saving directions does not advance `updated_at` or invalidate an
  open editor's version token. The client still saves the chosen idea through PATCH.
- `GET /api/v1/projects/:id/ideas` returns the saved set. A missing migration makes
  the optional table unavailable; the client falls back to its seven-day browser
  cache and generation continues to work.
- The planner is the configured OpenAI-compatible gateway. Gemini is not assumed.
- Provider unavailability returns `503 PLANNER_UNAVAILABLE`; invalid provider output
  returns `422 PLANNER_REJECTED`. There is no canned fallback or automatic retry.
- The project must exist and belong to the caller; foreign IDs return `404`.
- In-flight requests for the same owner, project and complete request body are
  deduplicated in memory. Durable rate limiting is a later feature.

### Saved directions

`GET /api/v1/projects/:id/ideas`

Returns the latest suggestion set saved for the project. The route verifies the
project owner before reading. Success `200`:

```json
{
  "data": {
    "available": true,
    "suggestions": [],
    "sourceTopic": "Explain RAM versus storage",
    "savedAt": "2026-11-05T10:00:00.000Z"
  }
}
```

If migration `0003_project_idea_suggestions.sql` is not applied, the optional table
is unavailable: the route still returns `200` with `available: false` and empty
suggestions, and the Idea page uses its browser cache. Saving directions never
changes the project row or its optimistic version token.

## Request safety — 5 November 2026

`POST /api/v1/projects`, `POST /api/v1/projects/:id/ideas` and
`POST /api/v1/storyboards` accept an optional `Idempotency-Key` header. The value
must be 16–128 characters from `A-Za-z0-9_-`; the browser sends a UUID. The server
derives `sha256(ownerId:scope:clientKey)` and stores the request hash, status and
completed response for 24 hours in `request_idempotency`.

- A completed request with the same key and payload replays the stored status and
  response body.
- A different payload with the same key returns `422 IDEMPOTENCY_KEY_REUSED`.
- A duplicate while the first request is still running returns `409
  REQUEST_IN_PROGRESS`.
- A previous failed attempt returns `409 PREVIOUS_ATTEMPT_FAILED`; use a new key.
- If the optional table is missing, the API proceeds without durable idempotency.

The same routes consume a per-user fixed-hour limit through
`consume_request_rate_limit`: 60 project creates, 20 idea requests and 20 storyboard
drafts per hour. Over-limit returns `429 RATE_LIMITED` with a `Retry-After` header
and a retry time in the message. The in-memory same-payload dedupe remains as a
fast path. If the optional function/table is missing, the API fails open and
generation continues.

## Private media assets — 6 November 2026

All routes are authenticated. Mutations also require the CSRF header. The API
uses the signed-in user's access token and owner-scoped RLS; storage credentials
never reach the browser.

### `POST /api/v1/media/upload-intents`

Request:

```json
{
  "projectId": "uuid",
  "kind": "reference",
  "mime": "image/jpeg",
  "bytes": 204800,
  "filename": "product-frame.jpg"
}
```

Allowed kinds are `reference` and `thumbnail`. References accept `video/mp4`,
`video/webm`, `image/jpeg` and `image/png`; thumbnails accept JPEG/PNG only.
Limits: video 100 MB, images 20 MB. The route validates the project owner,
reserves quota atomically and creates a `pending` `media_assets` row. Success
`201`:

```json
{
  "assetId": "uuid",
  "key": "users/<owner>/projects/<project>/reference/<uuid>.jpg",
  "method": "PUT",
  "uploadUrl": "https://<s3-endpoint>/...",
  "headers": { "Content-Type": "image/jpeg" },
  "maxBytes": 20971520,
  "expiresAt": "2026-11-06T10:15:00.000Z",
  "asset": {
    "id": "uuid",
    "status": "pending",
    "filename": "product-frame.jpg",
    "declaredBytes": 204800,
    "mime": "image/jpeg"
  },
  "quota": { "usedBytes": 204800, "limitBytes": 524288000, "remainingBytes": 524083200 }
}
```

The URL expires after 15 minutes. The browser must send the returned
`Content-Type` and the exact byte length. Over-quota returns
`413 MEDIA_QUOTA_EXCEEDED` with `{usedBytes, limitBytes, remainingBytes}`. A
missing media table/function returns `503 MEDIA_LIBRARY_UNAVAILABLE`; invalid
kind/MIME/size returns `422`.

### `GET /api/v1/media/assets?projectId=uuid`

Returns active assets for the caller's project, newest first, plus current quota:

```json
{
  "assets": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "kind": "reference",
      "status": "validated",
      "key": "users/<owner>/projects/<project>/reference/<uuid>.jpg",
      "filename": "product-frame.jpg",
      "declaredBytes": 204800,
      "bytes": 204800,
      "mime": "image/jpeg",
      "nativeProperties": {
        "kind": "image",
        "width": 1280,
        "height": 720,
        "durationMs": null,
        "videoCodec": "mjpeg",
        "audioCodec": "",
        "hasAudio": false,
        "frameRate": 25,
        "format": "jpeg_pipe",
        "fullDecode": true,
        "probedAt": "2026-11-07T09:00:04.000Z"
      },
      "createdAt": "2026-11-06T10:00:00.000Z",
      "validatedAt": "2026-11-06T10:00:04.000Z",
      "expiresAt": "2026-11-06T11:00:00.000Z"
    }
  ],
  "quota": { "usedBytes": 204800, "limitBytes": 524288000, "remainingBytes": 524083200 }
}
```

Only `pending` (unexpired) and `validated` assets are returned, up to 500 newest
rows. `rejected`, `deleted` and expired rows are omitted.

### `POST /api/v1/media/assets/:id/finalize`

Empty JSON body. The server loads the owned pending asset, HEADs the private
object, verifies exact size and content type, reads the first 16 bytes and checks
the PNG/JPEG/MP4/WebM signature. It then copies the object to a fresh committed
key using `CopySourceIfMatch` with the HEAD `ETag`, downloads the committed copy
using the copy `ETag` as `If-Match`, re-checks
the downloaded size, runs `ffprobe` for dimensions/duration/codecs/frame rate and
a full `ffmpeg` decode, updates `media_assets.object_key` to the committed key and
deletes the original upload key. The committed copy is deleted on a
probe/download/finalize failure so a rejected attempt leaves no orphan. The validated asset therefore never points at
the presigned PUT key, which remains usable until expiry. Success `200` returns
`{asset, quota}`; `quota` may be `null` if the usage lookup fails, and the
validated asset is still returned and is not deleted. Re-running finalize for the
same validated details is idempotent. Errors:

- `422 MEDIA_OBJECT_NOT_FOUND` — object missing; row rejected and quota freed.
- `422 MEDIA_SIZE_MISMATCH` — HEAD size differs from the declared size.
- `422 MEDIA_TYPE_MISMATCH` — stored content type differs from the declared MIME.
- `422 MEDIA_CONTENT_MISMATCH` — magic bytes do not match the declared MIME.
- `422 MEDIA_PROBE_FAILED` — ffprobe could not read an image/video stream.
- `422 MEDIA_PROBE_REJECTED` — dimensions, duration or codec outside the limits.
- `422 MEDIA_DECODE_FAILED` — full ffmpeg decode failed.
- `409 MEDIA_OBJECT_CHANGED` — source or committed object ETag changed during validation.
- `503 MEDIA_PROBE_UNAVAILABLE` — server media binaries are not available; the
  pending row is kept retryable, not rejected.
- `410 MEDIA_INTENT_EXPIRED` — pending intent is older than one hour.
- `409 MEDIA_ASSET_NOT_PENDING` — row is rejected, deleted or already different.

Rejected objects are deleted from storage before the row is marked `rejected`.
Images must be 1–8192 px per side. Videos must be 0.1–60 seconds with an
accepted codec (H.264, VP8, VP9, AV1 or HEVC).

### `DELETE /api/v1/media/assets/:id`

Deletes the private object, then marks the row `deleted` and returns
`{deleted: true, asset, quota}`. Deleting an already deleted asset is idempotent;
a rejected or otherwise inactive asset returns `409 MEDIA_ASSET_NOT_ACTIVE`.
The status transition is executed by the owner-checked security-definer
`delete_media_asset` RPC.

All media mutations are RPC-backed: `reserve_media_asset`,
`finalize_media_asset`, `reject_media_asset` and `delete_media_asset`. Migration
`0007_media_rpc.sql` revokes direct insert/update/delete on `media_assets` from
`authenticated`; only owner-scoped SELECT remains. The RPCs still require the API
to perform S3 HEAD/probe validation; a server-only capability is future
hardening.
Deleting a project cascades its metadata and the project route best-effort deletes
its active private objects.

### `POST /api/v1/media/access`

Request `{ "key": "users/<owner>/..." }`. The key must be under the caller's own
`users/<ownerId>/projects/<projectId>/<kind>/` prefix; otherwise
`404 MEDIA_NOT_FOUND`. Success `200` returns `{url, expiresAt}`. Access URLs
expire after 5 minutes.

### Live verification — 6 November 2026

Migration `0005_media_assets.sql` was applied (`Success. No rows returned`). In
Chrome on `localhost:3000`, a 1×1 PNG returned intent `201`, finalize `200`, a
signed 1×1 thumbnail/preview and 1 KB quota; a 1.8 MB MP4 returned `201`/`200`,
showed 1.7 MB quota and played a 5.04 s preview. A fake `.png` with non-PNG bytes
returned `422 MEDIA_CONTENT_MISMATCH`, freed quota and left no object. Delete
returned `200`, quota returned to 0 and an S3 prefix listing returned 0 objects.
The `uploadUrl` example uses an S3-shaped hostname; the configured endpoint is
`https://s3.us-east-1.amazonaws.com`.

F40 live verification, 7 November 2026: migration `0006` applied. A 1×1 PNG
finalized `200` with `nativeProperties` `{kind:"image",width:1,height:1,
videoCodec:"png",fullDecode:true}`; a 1.8 MB MP4 finalized `200` with
`{kind:"video",width:620,height:1200,durationMs:5042,videoCodec:"h264",
fullDecode:true}`. Scene 1 bound the PNG, autosaved and survived reload; approval
hash `05e9…` changed to `5ef3…` after the reference was cleared; a random valid
UUID returned `422 MEDIA_REFERENCE_NOT_FOUND`; deleting the asset showed the
missing-reference warning and Clear saved `null`; deleting a project with an
active object left 0 S3 objects. A signature-valid but invalid PNG returned
`422 MEDIA_PROBE_REJECTED`, left no active asset and its S3 prefix returned 0
objects.

F41 live verification: finalize `200`, the asset key changed to a committed key,
the original upload key HEAD returned `404`, the committed key HEAD/GET returned
`200` with 70 PNG bytes, the UI showed `READY` at `1 × 1` with a signed preview,
and asset/project delete left 0 objects under the prefix. Retention sweep,
`scene_assets`, `/app/library`, orphan-key lifecycle cleanup and generation
consumption remain pending.

## Free graphics render — 7 November 2026

`POST /api/v1/projects/:id/graphics-render` requires an authenticated owner and
CSRF. Body: `{language:"hindi"|"english", voice:<saved preset>, testMode?:boolean}`.
The storyboard must be approved and valid. Success returns
`202 {runId,state:"queued",progress:0,testMode}`. A per-project lock returns
`409 GRAPHICS_RENDER_BUSY`; an unapproved board returns `409 APPROVAL_REQUIRED`;
invalid input returns `422`. `testMode:true` skips translation, renders one fixed
test scene with a 3–8s guard, labels the output `UI TEST · NOT A FINAL EXPORT`
and is intended for internal low-credit diagnostics, not a final export. The
production Video UI does not expose this flag.

On this computer the route starts the local renderer. On the hosted site, which
has no headless browser, the same route writes the job to private storage under
`graphics-queue/pending/<runId>.json` and an owner-scoped
`queue-status.json`. `node prototype/graphics-queue-worker.mjs` on the studio
computer claims that job, renders it with the free voice path, and uploads the
MP4. The hosted `GET` reads that status. After the video is indexed in
`video_renders`, the claimed job is removed; later polls still return `done`
from the owner-scoped status plus the saved render row. No paid video provider
is called.

`GET /api/v1/projects/:id/graphics-render` returns the latest run. Add
`?runId=<uuid>` for a specific run. Response:
`{runId,state,progress,updatedAt,message?,testMode,durable,outputUrl?,downloadUrl?}`
where state is `queued`, `translating`, `generating-narration`, `rendering`, `done`
or `error`, and `outputUrl`/`downloadUrl` are the authenticated file routes only
when `done`. `durable` becomes true when the completed render has been copied to
private object storage and indexed in `video_renders`. A project with no run
returns `200 {runId:null,state:"idle",progress:0,testMode:false,durable:false,outputUrl:null}`.

`GET /api/v1/projects/:id/graphics-render/:runId/file` serves the finished MP4.
When a `video_renders` row has a `video_key`, the route returns a `307` redirect
to a 5-minute private signed URL; `?download=1` adds an attachment filename.
Otherwise it falls back to the local `output.mp4` with
`Content-Type: video/mp4` and `Cache-Control: private, no-store`. The route
re-checks the run's project and owner. The thumbnail route follows the same
durable-then-local order and uses `Cache-Control: private, max-age=300`.

## Videos library — 7 November 2026

`GET /api/v1/videos` requires an authenticated owner. It reads owner-scoped rows
from `video_renders` and merges any local completed jobs that are not yet
durable. Only `status.state === "done"`, `testMode !== true`, a matching
`job.ownerId`, valid UUID project/run IDs and a positive report duration are
included. Response:
`{videos:[{runId,projectId,title,language,voice,createdAt,seconds,width,height,storage,thumbnailUrl,outputUrl,downloadUrl}],count,durableCount,localCount,storageAvailable}`,
newest first, capped at 60. `storage` is `cloud` for `video_renders` rows and
`local` for filesystem-only jobs. Failed, test and other-owner jobs are omitted.
If the table is missing or the repository is unavailable, the route falls back to
local jobs with `storageAvailable:false`.

`POST /api/v1/videos/backfill` requires an authenticated owner and CSRF. It
copies local completed non-test renders owned by the caller into private object
storage and upserts `video_renders`. It processes a small batch (default one,
maximum three) per request so slow uploads do not hold one long request open.
Response:
`{saved,skipped,failed,total,processed,remaining,bytes}`. The Videos page loops
until `remaining` is zero and shows progress. It is idempotent; already-durable
runs are excluded from the pending set. A missing table or storage configuration
returns `503 VIDEO_STORAGE_UNAVAILABLE`. No AI or voice credits are used.

`GET /api/v1/projects/:id/graphics-render/:runId/thumbnail` serves the generated
thumbnail from private storage when durable, otherwise from the local
`thumbnail.jpg`, after the same project/owner check. The existing file route
serves the MP4. Retention/cleanup for local files remains pending.

## Scene text editor — 7 November 2026

`GET /api/v1/projects/:id/graphics-script` requires an authenticated owner and an
approved storyboard. It returns the saved script, or seeds one from the latest
completed non-test render for that project:
`{script:{schemaVersion,projectId,sourceRunId,updatedAt,scenes[]},sourceRunId,durable}`.
Each scene carries `{id,headline,diagram,labels,displayNarration,narration}`.
`durable` is true when the script was read from or written to
`project_graphics_scripts`; when the table is unavailable the route falls back to
the local script and returns `durable:false`.

`POST /api/v1/projects/:id/graphics-script` with `{sceneId}` prepares one approved
scene through the free AI gateway (no voice credits) and returns
`{scene,index,total}`. It does not save. Amplify cuts an SSR request off at about
30 seconds, so the page asks for one scene at a time and saves the full draft with
`PUT`. A missing scene ID returns `422 GRAPHICS_SCRIPT_INVALID`. `PUT` with
`{script}` validates and saves edits: scene count/IDs must match the approved
storyboard, `headline` ≤44 characters, 2–4 labels ≤32 characters, a supported
diagram, captions ≤700 characters and Devanagari voice narration ≤700 characters.
Invalid input returns `422 GRAPHICS_SCRIPT_INVALID`; an unapproved project returns
`409 APPROVAL_REQUIRED`. The validated script is written to
`project_graphics_scripts` when available and mirrored to
`prototype/output/graphics-scripts/<projectId>.json` as a local fallback.

`POST /api/v1/projects/:id/graphics-render` reads the saved script when present,
validates it, includes it in the job and returns `422 GRAPHICS_SCRIPT_INVALID` if
it is stale. The renderer then uses the saved scene text instead of re-translating.

## Video backup action — 7 November 2026

`POST /api/v1/videos/backup` requires an authenticated owner and CSRF. It scans
completed, non-test graphics jobs owned by the caller and copies each
`output.mp4`, `thumbnail.jpg`, `data.json` (as `scene-text.json`), `job.json`,
`status.json` and `report.json` into
`~/Vydrivo-Backups/videos-<timestamp>/<runId>/`, plus a `manifest.json`. Response:
`{directory:"~/Vydrivo-Backups/videos-...",count,bytes}`. The path is server-local;
this is a safety copy, not a public download or production object storage. No
provider/voice credits are used.

## Durable video storage — 8 November 2026

`supabase/migrations/0008_video_renders.sql` adds owner-scoped `video_renders`
and `project_graphics_scripts` tables. Completed graphics renders are copied to
the private S3-compatible bucket under
`users/<owner>/projects/<project>/renders/<runId>/` as `video.mp4`,
`thumbnail.jpg`, `script.json` and `metadata.json`; the table stores the keys,
bytes, duration, dimensions and language/voice metadata. The editable scene text
is stored as JSON in `project_graphics_scripts` with a local mirror.

Persistence runs when the authenticated render-status poll first sees
`state:"done"` and is retried by `POST /api/v1/videos/backfill` for local jobs.
The backfill processes one video per request with progress so slow uploads do
not hold one long request open. The file/thumbnail routes redirect to
short-lived private signed URLs and fall back to local files when the table or
storage is unavailable. The browser never receives storage credentials.
Migration `0008` was applied 8 November 2026 and all 7 existing videos were
saved. Other environments still need the migration and `MEDIA_S3_*`; until then
the API reports `storageAvailable:false` and keeps the local path working.
Existing local videos are not automatically uploaded without the explicit
**Save to cloud** action.

## Instagram connection and Reels publishing — 14 November 2026

The Settings page connects one Instagram professional account through the
Instagram API with Unified Login (Facebook Login for Business), and the Videos
page publishes one cloud-saved render as a public Reel. User-facing copy does not
name the identity, database or hosting vendor.

| Method / path | Auth | Request | Success |
|---|---|---|---|
| `GET /api/v1/instagram/connect` | session | none | `200 {url,expiresAt}`; `503 INSTAGRAM_NOT_CONFIGURED` when server settings are missing |
| `GET /api/v1/instagram/callback` | public, single-use state | `code`, `state`, or provider `error` | `302` to `/app/settings?instagram=connected` or `instagram=error&reason=...` |
| `GET /api/v1/instagram/connection` | session | none | `200 {connected,account}`; `account` has `instagramUserId`, `username`, `businessId`, `connectedAt`; no token |
| `DELETE /api/v1/instagram/connection` | session + CSRF | none | `200 {disconnected:true}` |
| `POST /api/v1/projects/:id/graphics-render/:runId/instagram` | session + CSRF | optional `{caption}` | `202 {publish}` with a `processing` job; `200` when already published; `422 VIDEO_NOT_DURABLE` for local-only videos; `409 INSTAGRAM_NOT_CONNECTED` |
| `GET /api/v1/projects/:id/graphics-render/:runId/instagram` | session | none | `200 {publish}`; `publish.status` is `processing`, `published` or `failed` with `permalink` and `error` |

The project Publish step (`/app/projects/:id/publish`) and the Videos page both
use these two endpoints through the shared `InstagramPublishDialog`; the page
reads the project and `GET /api/v1/videos` to find the latest render and its
`instagram` badge. No additional publish endpoint exists.

## Posts library — 14 November 2026

`GET /api/v1/posts` requires an authenticated owner. It reads the owner's
`instagram_publishes` rows, keeps only `status = "published"` and joins each row
to `video_renders` by `run_id` for the real title, duration and thumbnail.
Response:
`{posts:[{runId,projectId,title,caption,permalink,postedAt,seconds,thumbnailUrl}],count,schedulingAvailable:false}`,
newest first, capped at 60. A published row whose render row is gone still lists
with the caption as title and `null` media fields. No tokens, signed storage URLs
or provider payloads are returned. Scheduling is not offered by this endpoint or
the Posts page; `schedulingAvailable` is always `false` until a durable worker
exists.

`connect` creates a 256-bit random state, stores only its SHA-256 hash with the
browser return origin and a 10-minute expiry, then returns the Facebook Login
dialog URL built from `META_APP_ID`, `INSTAGRAM_CONFIG_ID` and the registered
`INSTAGRAM_REDIRECT_URI`. The callback peeks the state through a security-definer
RPC, exchanges the code server-to-server at
`graph.facebook.com/v27.0/oauth/access_token` with `META_APP_SECRET` and the same
`redirect_uri` used by the dialog (Meta rejects the exchange without it, OAuth
error 100/subcode 36008), reads `/me?fields=client_business_id` and
`/me/assigned_instagram_accounts?fields=id,username`, encrypts the SUAT with
AES-256-GCM, and consumes the state in the same RPC that upserts
`instagram_connections`. A captured callback cannot be replayed.

The redirect URI stays on the deployed HTTPS origin. The state row records
whether the browser started on localhost or the deployed origin, so both return
to the correct `/app/settings` after the callback. The connect route reads the
Settings page `Referer` for that origin because `publicOrigins` treats localhost
as an internal compute host; `instagramReturnOrigin` still allowlists it. Allowed
return origins are the redirect origin, `http://localhost:*`,
`http://127.0.0.1:*` and optional `INSTAGRAM_RETURN_ORIGINS`. The browser never
receives `META_APP_SECRET`, the access token, the encryption key or the raw state
hash. If `INSTAGRAM_TOKEN_KEY` is empty the encryption key is derived from
`META_APP_SECRET`; changing the secret later makes existing connections
unreadable.

`POST` publishes only a durable render (`video_key` present). The route signs that
private MP4 with a 900-second presigned GET URL, creates a Reels container with
`media_type=REELS`, `video_url`, `share_to_feed=true` and the normalized caption,
and stores a `processing` row in `instagram_publishes`. `GET` reads the
container's `status_code`: `FINISHED` publishes with
`POST /<ig_user_id>/media_publish`, stores the media ID and permalink and returns
`published`; `ERROR`/`EXPIRED` mark the row `failed`; `IN_PROGRESS` keeps it
`processing`. `INSTAGRAM_MEDIA_PROCESSING` (409) is treated as still processing so
a poll does not fail the job. One row per `(owner_id, run_id)` makes repeated
clicks idempotent, and the stored container is resumed instead of recreated.
Errors map to `INSTAGRAM_TOKEN_INVALID`, `INSTAGRAM_RATE_LIMIT`,
`INSTAGRAM_MEDIA_REJECTED`, `INSTAGRAM_REQUEST_REJECTED`, `INSTAGRAM_UNAVAILABLE`
and `INSTAGRAM_PUBLISH_FAILED`; Graph payloads and tokens are never returned or
logged. The Videos list adds a published `instagram {permalink}` badge per run and
`instagramAvailable:false` only when the publish table is missing.

Migration `0009` was applied on 14 November 2026 and a live localhost OAuth pass
connected `@vydrivo`. Migration `0010` was applied the same day and the live
publish test posted render `7f0410f2-e158-4f15-baad-93849136c2ba` as
`https://www.instagram.com/reel/DfuOqebAgFw/` (container `17958025812038571`,
media `18473699506191501`); the public page rendered for a signed-out visitor.
The callback is not deployed yet, so the registered `dev` redirect returns 404 and
the code must be replayed on localhost. Amplify still needs `META_APP_ID`,
`META_APP_SECRET`, `INSTAGRAM_CONFIG_ID`, `INSTAGRAM_REDIRECT_URI` and the
`MEDIA_S3_*` values. Publishing for anyone other than the app's own tester
account still needs Meta App Review with Advanced Access and Live mode.
