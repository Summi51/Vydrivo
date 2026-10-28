# First-scene prototype

Local single-owner feasibility harness, not a production SaaS. The PRD and technical design remain the product requirements.

## Implemented

- Project-local, pinned FFmpeg/FFprobe dependencies (`npm ci` after installation approval).
- `npm run preflight`: local binary checks; does not load secrets or make API calls.
- `npm test`: budget, provenance kind, timing and path-boundary regression tests.
- `npm run smoke`: synthetic 720p render/decode test, conspicuously labeled **NOT AI FOOTAGE**. This cannot pass the AI-generation milestone.
- `npm run compose -- path/to/scene-manifest.json`: compose actual footage with separate narration and measured caption cues; 1080 × 1920 H.264/AAC output, duration/codec validation, source checksums and provenance report.

Use `scene-manifest.example.json` as the input shape, replacing all placeholders and timing with actual source evidence. Media paths must be relative to the manifest's directory; paths outside it and symlinks escaping it are rejected. No file is overwritten. Generated outputs stay under ignored `prototype/output/`.

The composer does not prove footage authenticity from pixels: it validates declared provenance, then requires human motion/prompt and caption review. It refuses paid/unknown-cost inputs, overlapping captions, and footage shorter than narration; there is no freeze-frame or loop fallback. This first-scene harness caps inputs at 15 seconds/100 MB; the eventual product remains 60–90 seconds.

## Actual evidence — 18 October 2026

- Approved installation: `ffmpeg-static@5.3.0` and `ffprobe-static@3.1.0`; npm reported zero known vulnerabilities at installation. Bundled binaries report FFmpeg 6.0 and FFprobe 4.4. This is a local trusted-media experiment; package audit does not establish decoder safety or commercial redistribution compliance. Review/update binaries before public uploads.
- Synthetic five-second 720 × 1280 renderer smoke test passed in approximately 2.4 seconds. This is not a reliable performance forecast or AI footage.
- Official Lightricks `ltx-video-distilled` public ZeroGPU demo accepted one anonymous text-to-video request and returned a **5.1-second, 384 × 640 H.264 clip** from the paper-boat prompt. No credential, paid API or account billing was used. Source and request evidence are in ignored `prototype/output/ltx-attempt-001/`.
- A sampled contact sheet shows the boat changing position over time. The boat is partly cropped and the framing is not polished; this proves a generation route, not production visual quality or perfect prompt adherence.
- Original Wan demo could not be accessed; two 5B community candidates had build/runtime errors; the exact ZeroGPU T2V demo also had a runtime error. A running Wan I2V endpoint was found but requires a reference image. No attempts were made to bypass access restrictions.
- Preferred ElevenLabs voice IDs are retained in `scene.json` and `.env.example`; voice entitlement and synthesis remain unverified. Gemini planning has not been called.

## Credentials and access

Never paste API keys in chat or commit them. The key previously pasted must be revoked/replaced; it is not stored or used here. Enter replacements directly in ignored `.env.local` if/when an API integration is ready. The planner and narration commands load local credentials only for explicitly enabled official provider requests. Offline validation and graphics tests make no provider requests.

ElevenLabs voice links are public IDs, not API credentials. Using those exact voices needs account access and verified free quota; commercial release needs the appropriate rights. No silent voice substitution. A temporary built-in Mac voice may be used only when the user approves it and is labeled diagnostic, not ElevenLabs or Kokoro.

## Remaining gates

1. Synthesize approved narration with permitted access (or an explicitly approved diagnostic voice), measure phrases, and compose the generated clip.
2. Review actual playback, sound, captions and native-versus-export quality; no end-to-end success claim before that.
3. Validate repeatable provider access, terms/checkpoint license and durable request reconciliation. A successful public demo call is not a production entitlement.
4. Benchmark the Mac progressively before longer renders; one heavy worker, 20 GiB disk reserve, no local video-model downloads.

No accounts, deployments or paid services were created. ₹0 incremental service ceiling remains in force. Do not resubmit an uncertain provider request; reconcile its saved event ID first.

Sources: [official Lightricks demo](https://huggingface.co/spaces/Lightricks/ltx-video-distilled), [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu), [FFmpeg package](https://github.com/eugeneware/ffmpeg-static), [ElevenLabs output rights](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform).

## Narration update — 19 October 2026

The user-supplied credential received HTTP 401 from the official read-only subscription endpoint. No TTS request was submitted, no key was saved, and the precise cause (invalid/revoked key versus insufficient access) is unconfirmed. Replace the exposed credential directly in ignored `.env.local`.

`npm run narrate -- female --check --demo` performs read-only subscription/voice checks. Generation requires a verified free tier, usage extensions explicitly disabled, conservative remaining allowance, a zero-spend fixture and a new output directory. It saves an attempt record before submitting once; unknown outcomes must be reconciled, not automatically retried. `npm run narrate -- female prototype/output/education-voice-001 prototype/education-scene.json --demo` is the explicit generation command after access is verified. Substitute `male` to select the other saved voice; do not generate both automatically.

Speech uses the official timestamp endpoint; measured character timing supplies phrase captions. The short educational fixture explains buoyancy using the already generated boat footage and planned explanatory overlays. This paragraph records the earlier access failure. Later saved speech files and Remotion demos now exist; do not infer current voice access from that historical failure. The reusable storyboard renderer and offline regression path below supersede the earlier FFmpeg-only status.

## Storyboard-driven path (2026-10-19)

The WaterCycle, RamStorage and FootageCaption compositions are legacy,
hand-authored demonstrations. Their fixed narration, captions and timings are not
an automatic planning pipeline. Use `StoryboardVideo` for new data-driven work.
Reusable layout/style constants are intentional; topic content and timings come
from reviewed data. The new path has offline tests, not live end-to-end approval.

1. Write a private input JSON containing `topic` and optional `notes`.
2. In ignored `.env.local`, set `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` only after
   verifying that model's free eligibility and that billing is disabled.
   `AI_FREE_TIER_VERIFIED=false` blocks requests by default. A key cannot prove
   billing status; the operator verification flag is not a provider-side cap.
   The ₹0 policy remains: do not enable billing or paid requests without numeric
   budget approval. No live provider call was made when implementing this path.
3. `npm run plan -- --generate path/to/topic.json` creates a draft and review file.
   The planner calls an OpenAI-compatible chat endpoint, validates the reply locally
   and never falls back to a canned storyboard. Review factual accuracy, pacing,
   visual prompts and rights. Set `approved: true` in its review file only after
   actual review. `npm run plan -- --validate path/to/storyboard.json` is offline.
   Any storyboard edit invalidates the approval hash; validate and review again.
4. Narrate each approved scene with:
   `npm run narrate -- female prototype/output/unique-voice-dir --storyboard path/to/storyboard.json path/to/review.json scene-id`
   Use `male` for the saved alternative. Append `--check` for read-only allowance
   checks. Unchanged legacy commands now require explicit `--demo`.
   The TTS free-account guard remains; exact alignment text is required. If the
   provider normalizes narration, review and regenerate that narration instead
   of silently attaching timings to different words.
5. Generate actual clips through the separately permitted video provider. This
   planner does not generate footage. A production video API adapter is still
   missing; imported clips require truthful provenance and verified free access.
6. Create a private asset JSON array, one entry per scene. Each entry contains
   `sceneId`, `audioFile`, `alignmentFile` (the narrate output), and for footage:
   `kind: "ai-generated-footage"`, `videoFile`, `costINR: 0`,
   `freeAccessConfirmed: true`, `provenance: {provider, model, prompt}`.
   All file paths are relative to the asset JSON directory and must stay inside it.
7. `npm run compile -- board.json review.json assets.json` probes real durations,
   checks narration hashes/timestamps and clip coverage, then writes Remotion
   props under ignored `prototype/output`. Private render inputs are copied to
   ignored `remotion/public/media`; never host or publicly serve that directory.
8. Use the installed CLI (no download):
   `./node_modules/.bin/remotion render remotion/index.jsx StoryboardVideo prototype/output/final.mp4 --props=path/to/props.json --concurrency=1`
   Rendering requires an available local browser; do not automatically install
   one. Inspect the exported MP4 with FFprobe and human review before release.

The compiler enforces measured 60–90-second output, no freeze/loop fallback and
at least 50% actual footage coverage as an explicit initial implementation policy
for the PRD's supplementary-graphics rule. Estimated storyboard durations are
planning aids, never caption timestamps. Graphics currently use a basic title
layout; a reusable educational diagram catalogue is still future work.

Production blockers remain: authenticated dashboard and project isolation,
durable jobs/reconciliation, server-controlled review/audit records, provider
cost reservation, automated footage acquisition, cleanup/retention, full export
validation integration, and live 60–90-second end-to-end testing. Local JSON
approval and provenance are trusted-operator inputs, not multi-user security
boundaries. Do not describe this prototype as production-ready.

Gemini contract reference: https://ai.google.dev/gemini-api/docs/generate-content/structured-output


## Offline graphics regression (19 October 2026)

Run `npm run graphics:test` to reuse the saved water-cycle narration and measured
phrase captions in the generic StoryboardVideo/ProcessGraphic renderer. This test
is explicitly hand-authored fixture data, not a Gemini result. Component content
is supplied as data; diagram cue times are derived from matching saved caption
phrases. The old audio uses historical voice `iP95p4xoKVk53GoZ742B`, not either saved
preferred voice. No new voice is selected and no service is called.

The script requires the already installed browser, checks 20 GiB free disk, uses
one render worker, exports H.264/AAC at 1080×1920, probes the duration, performs a
full decode and writes a contact sheet/report. Outputs are uniquely named under
`prototype/output/water-cycle-check-*`. Private regression only; no publication.
Product exports require footage and 60–90 seconds; this visibly labeled diagnostic
is a separate exception, not a change of V1 scope. See the PRD v1.3 and pipeline /
dashboard design v1.1 for synchronized current-state notes.

Verified output from this correction: `prototype/output/water-cycle-check-1792424218442/water-cycle.mp4`
(42.688 seconds, 1080×1920, H.264/AAC). Full decode and non-silent audio checks
passed; four sampled frames were visually reviewed for layout/captions. The report
and contact sheet sit beside the MP4. All 13 offline tests pass. No live Gemini,
new TTS or footage requests were made. Phrase-based highlights are approximate;
this does not prove word-perfect synchronization or the complete product pipeline.
