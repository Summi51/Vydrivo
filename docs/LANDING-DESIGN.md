# Vydrivo — Landing Design Foundation

Date: 3 November 2026
Status: Implemented landing page and dark studio foundation; dashboard ambient polish added
Related: [PRD](PRD-V1.md) · [Dashboard design](DASHBOARD-SYSTEM-DESIGN.md) · [Project status](PROJECT-STATUS.md)

## 1. Direction

Vydrivo uses a **dark, cinematic marketing surface** and a calm, task-focused app. The landing page is inspired by the clarity of modern AI video tools such as LTX Studio, Runway, InVideo AI, Gamma and OpenArt, but uses Vydrivo's own logo, copy, layout and visual identity.

The landing page has one job: make a first-time creator understand the promise in five seconds and start with one idea.

**Promise:** turn an idea into a reviewed 60–90 second vertical video with AI footage, narration and captions.

**Flow:** Idea → Storyboard → Video → Publish.

## 2. Design tokens

| Token | Value | Use |
|---|---|---|
| `--vydrivo-bg` | `#0B0B0F` | Page background |
| `--vydrivo-surface` | `#141419` | Cards and panels |
| `--vydrivo-raised` | `#1B1B22` | Icon wells and controls |
| `--vydrivo-border` | `#26262E` | 1px borders |
| `--vydrivo-text` | `#F5F5F7` | Primary text |
| `--vydrivo-muted` | `#9A9AA5` | Secondary text |
| `--vydrivo-accent` | `#8B5CF6` | Primary CTA and active state |
| `--vydrivo-accent-strong` | `#7C3AED` | Hover |
| `--vydrivo-success` | `#34D399` | Success |
| `--vydrivo-warning` | `#FBBF24` | Warning |
| `--vydrivo-error` | `#F87171` | Error |

Use the accent for the primary action and active state only. Do not put gradients on every card.

## 3. Typography

- Primary UI and display: **Inter**.
- Metadata only: **JetBrains Mono**, small caps, reduced letter spacing.
- Headlines: tight tracking, bold/semibold.
- Body: 14–16px with 1.5–1.7 line height.
- Minimum readable sizes in the studio: body and form text 13–14px, UI
  labels 11–12px. Do not use 8–9px text for content; reserve it for decorative
  micro-badges only. The first studio pass used 9–11px text and was rejected as
  too small.
- Avoid using multiple display families on one page.
- The authenticated studio applies Inter at the shell root (`.vydrivo-studio`)
  so form text, cards and headings stay on one family; `.font-landing` also
  resolves to Inter.
- The studio backdrop keeps the `#0B0B0F` base and adds only low-opacity violet
  and teal radial light near the top. `.studio-surface` adds a subtle white
  top-left highlight to existing cards; no new palette, imagery or gradients on
  every card. The current/recent cards use restrained depth and hover lift.

## 4. Hero rules

The hero is a full-bleed video cover, not a small card.

1. Full-width background video or a cinematic poster.
2. Dark left-to-right and top-to-bottom overlays for text contrast.
3. Left column: eyebrow, headline, subhead, one input, one primary CTA, microcopy.
4. Right column: floating storyboard card, secondary to the CTA.
5. The input and CTA must be visible above the fold.
6. The left column must never be empty.
7. Use a real `<video autoplay muted loop playsinline>` in code, with a poster fallback and reduced-motion support.
8. Stitch designs are static; the video must be implemented in code.

Hero copy:

- Eyebrow: `IDEA → STORYBOARD → VIDEO`
- Headline: `Turn an idea into a video.`
- Subhead: `Review the storyboard, generate AI footage, and export a 60–90 second vertical video with narration and captions.`
- Input: `What do you want to explain?`
- CTA: `Create project & continue`
- Microcopy: `Start with an idea. Review before you generate.`

## 5. Landing sections

1. **Nav** — Vydrivo logo on the left, How it works / Demo / Examples in the centre, Sign in and Start creating grouped on the right. Sign in sits immediately before the primary button, outside the centre link group, and moves into the mobile menu below `md`.
2. **Hero** — auto-playing background playlist, input/CTA, storyboard preview, and a “Watch how it works” anchor.
3. **How it works** — three steps: describe, review, generate/export.
4. **Demo** — visible 30-second product video with a heading, description and poster. This is the SEO-friendly video surface.
5. **Examples** — six sample concept cards (two rows of three) with muted looping AI video previews. Cards are clearly labelled samples; clicking opens the clip in a modal.
6. **Features** — six items: AI idea suggestions, voice selection, scene-by-scene review, AI footage, captions, MP4 export.
7. **Final CTA** — same input and CTA in a dark panel.
8. **Footer** — logo, How it works, Demo, Examples, Sign in, © 2026 Vydrivo.

No fake metrics, testimonials, credit claims, or competitor model names.

## 6. Responsive rules

- Mobile 390px: single column, 16px page padding, 24px section gaps.
- No absolute positioning for text or tags.
- Cards auto-height; no fixed heights that clip copy.
- Hero CTA above the fold.
- Storyboard preview below the CTA on mobile.
- Example cards: one per row or equal-height horizontal row; no clipped titles.
- Feature grid: two columns.
- Final CTA: input and button stacked.
- No horizontal scroll.

## 7. Accessibility

- Text contrast at least 4.5:1.
- Visible focus rings on inputs, buttons and links.
- Video is muted, looping, decorative and `aria-hidden`.
- Provide a pause control for the background video.
- Respect `prefers-reduced-motion`; show the gradient/poster fallback.
- Modal closes on Escape and backdrop click.
- All interactive controls are real buttons/links with labels.

## 8. Implementation

- `app/page.jsx` — landing page.
- `components/landing/IdeaStartForm.jsx` — hero/final CTA form.
- `components/landing/BackgroundPlaylist.jsx` — auto-playing, crossfading hero background playlist.
- `app/globals.css` — design tokens and landing typography.
- `app/layout.jsx` — Inter font and Tailwind theme extension.
- `next.config.mjs` — dev indicator disabled.
- `lib/project-draft.js` — `PENDING_TOPIC_KEY`.
- `components/dashboard/CreateVideoHero.jsx` — pre-fills the pending topic after sign-in.
- `remotion/LandingHero.jsx` — 8-second storyboard card loop.
- `public/videos/hero-ai-lab.mp4` — local user-provided AI lab clip, cropped to remove watermark/prompt.
- `public/videos/hero-education-desk.mp4` — local user-provided education desk clip, cropped to remove watermark.
- `public/videos/hero-space.mp4` — local user-provided space/science clip; parked and not in the active playlist.
- `public/videos/hero-lyrical.mp4` — local user-provided lyrical AI lab clip, cropped to remove watermark.
- `public/videos/landing-hero-mobile.mp4` — local 9:16 storyboard-card render.
- `public/videos/hero-card-frame.jpg` — tracked real AI-footage frame used inside the storyboard card.
- `public/videos/hero-playlist-poster.jpg` — tracked hero playlist poster from the AI lab clip.
- `public/videos/vydrivo-demo.mp4` — local 30-second product demo used by the visible demo section.
- `public/videos/vydrivo-demo-poster.jpg` — tracked demo poster.
- `public/videos/example-education.mp4` — local user-provided neural-network/brain clip, cropped to remove the watermark.
- `public/videos/example-product.mp4` — local user-provided neural-network clip, cropped to remove the watermark.
- `public/videos/example-social.mp4` — local user-provided binary-code clip, cropped to remove the watermark.
- `public/videos/example-education-poster.jpg`, `example-product-poster.jpg`, `example-social-poster.jpg` — tracked example-card posters.
- `public/videos/example-data-pipeline.mp4` — local user-provided AI data-stream clip, cropped to remove the watermark.
- `public/videos/example-ai-map.mp4` — local user-provided AI geometry clip, cropped to remove the watermark.
- `public/videos/example-future-city.mp4` — local user-provided future-city/AI clip, cropped to remove the watermark.
- `public/videos/example-data-pipeline-poster.jpg`, `example-ai-map-poster.jpg`, `example-future-city-poster.jpg` — tracked example-card posters.

The landing CTA stores the topic in `sessionStorage`, checks the session, routes to `/app` when signed in or `/sign-in?next=/app` otherwise, and the dashboard pre-fills the create form.

## 9. Assets and limitations

- The hero background is an auto-playing playlist of three active user-provided clips: AI lab, education desk and lyrical AI lab. The space/science clip is parked because it looked too generic and busy behind the card.
- The user clips are cropped locally to remove visible KlingAI watermarks and prompt overlays; they are gitignored.
- The playlist crossfades each item and loops; the poster is tracked.
- The background is blurred, darkened and colour-graded so the headline and card stay sharp; a radial vignette and a local dark backdrop behind the card keep the subject readable.
- The storyboard card uses a separate 9:16 loop render in `remotion/LandingHero.jsx`. Its preview is a real frame from the lyrical clip, not a gradient placeholder; the background playlist also uses that clip as its third item, but the card is a distinct crop and render.
- Example cards use user-provided AI video previews with tracked posters. The cards loop muted and open the full clip in a modal; the MP4s are gitignored.
- The visible demo section uses the user-provided 30-second product demo. It is local and gitignored; it is not the hero background.
- A licensed cinematic studio clip or AI-generated hero is an optional future replacement; the current playlist is a zero-cost brand asset.
- The landing, auth and studio screens use the dark foundation. The app home adds an ambient violet/teal backdrop and subtle panel highlights while keeping the same tokens and Inter typography.
- Stitch cannot generate a working video. It is a static design reference only.

## 10. References

- LTX Studio — AI filmmaking and storyboard flow: https://ltx.studio/
- InVideo AI — guided prompt-to-video: https://invideo.io/ai/
- Runway — AI video generation: https://runwayml.com/
- Gamma — progressive disclosure and calm UI: https://gamma.app/
- Boords — storyboard cards and versions: https://boords.com/
- ElevenLabs — voice selection and preview: https://elevenlabs.io/
- OpenArt — model landing page reference: https://openart.ai/

Use these for patterns, not for copied assets or brand identity.

## 11. Render commands

The storyboard card loop is an 8-second, 30 fps Remotion composition.

```bash
./node_modules/.bin/remotion render remotion/index.jsx LandingHeroMobile \
  public/videos/landing-hero-mobile.mp4 --concurrency=1 --codec=h264 --crf=24
```

The hero background is a playlist of three active user-provided clips. They were
cropped locally with FFmpeg to remove visible watermarks and prompt overlays,
then re-encoded without audio. Source clips are not committed.

Poster and card-frame fallbacks:

```bash
node_modules/ffmpeg-static/ffmpeg -y -i public/videos/hero-ai-lab.mp4 \
  -ss 2.5 -frames:v 1 -q:v 3 public/videos/hero-playlist-poster.jpg

node_modules/ffmpeg-static/ffmpeg -y -i public/videos/hero-lyrical.mp4 \
  -ss 5 -frames:v 1 -q:v 2 public/videos/hero-card-frame.jpg

node_modules/ffmpeg-static/ffmpeg -y -i public/videos/vydrivo-demo.mp4 \
  -ss 20 -frames:v 1 -q:v 3 public/videos/vydrivo-demo-poster.jpg
```

The generated MP4 files are gitignored. The posters are tracked design assets.
Do not commit generated video.

## 12. Auth screens

Sign-in, sign-up, recovery and new-password use the same dark foundation. Desktop
is a 50/50 split: the brand panel has the logo, back link, a “A wall of ideas in
motion” pill, a two-tone headline, category tags and a slowly drifting two-column
wall of eight sample AI reels on the left; the auth form is on the right. The
first column uses the latest four clips (sun, art, AI cube, neon brand) and the
second column keeps the existing four (ORB, space, robot, glass face). Mobile is
a single column with a compact brand header.

The reel wall is decorative and muted. It uses tracked posters and four local
sample clips, respects reduced motion, and is labelled “Sample AI footage”. It
does not claim the clips were made by Vydrivo and does not copy Velos assets or
client names. The reference layout is inspiration only.

The right panel uses Sign in / Create account tabs, a Google button, email and
password fields, remember-me, forgot-password, the primary violet action, support
and a small legal line on sign-up. Keep the real Supabase email/password, Google
OAuth, recovery and password-update behavior. Do not add fake “System Online”
status, creator counts, testimonials, extra SSO providers or unverified security
claims.

## 13. Brand mark

Concept A “Ribbon V” from the 28 October logo review is the single mark: two
gradient ribbons (`#C4B5FD` → `#8B5CF6` → `#2DD4BF`) meeting in a V, which reads
as the letter, a play cut and a storyboard beat. It replaced the generic play
glyph on the landing, auth screens and studio shell.

- `components/BrandLockup.jsx` exports `LogoMark` and the `BrandLockup` lockup
  (sizes `sm` 32px, `md` 40px, `lg` 48px, optional mono subtitle).
- The landing nav/footer use `sm`/`md`; the auth brand panel uses `lg`, the auth
  compact header `sm`; the studio sidebar uses `md` with a “Creator Studio”
  subtitle and the mobile header `sm`.
- `app/icon.svg` is the same ribbon V on a dark rounded tile for the favicon.
- Every SVG instance gets gradient ids from `useId()`; never share fixed SVG ids
  across instances, because a hidden first instance makes the visible mark
  render without paint.

## 14. Studio shell and app home

The authenticated shell and app home now use the dark landing foundation.

- Fixed 264px sidebar: brand lockup, gradient “New project” CTA, Home and
  Projects (with project count), Media and Posts as disabled/locked, a workflow
  stage list (01 Idea notes, 02 Storyboard beats, 03 Video & export) that
  follows the current project stage, and a user card with sign-out.
- Sticky top bar: `Creator Studio / <section>` breadcrumb, a status chip that is
  only shown when a page reports it (Connecting / Supabase / Offline from the
  real project-list request), and the avatar. Mobile swaps the sidebar for a
  compact brand header, New button, avatar, sign-out and pill navigation.
- Home: welcome heading with a "Resume project" action and the real Supabase
  status chip, the "What video are we creating today?" create card (violet
  radial glow, sample-prompt chips with a shuffle action, topic textarea with a
  live character counter and Clear action, short format labels on mobile,
  target/aspect chips, gradient CTA), a current-project card with the Idea →
  Storyboard → Video → Publish rail and a compact thumbnail, up to three real
  recent projects with a "Start another project" tile when there are fewer than
  three, and a methodology strip.
- The studio root uses Inter (`.vydrivo-studio`; `.font-landing` resolves to
  Inter). Section headings use a small violet `01/02/03` index and Inter
  semibold sentence case rather than all-caps mono; mono is reserved for real
  metadata such as time and scene counts.
- The create card is interactive: picking a sample fills the topic and format,
  the shuffle action picks a random sample, Clear empties the topic, the counter
  tracks the 2,000-character limit, Cmd/Ctrl+Enter submits, and the CTA stays
  disabled until there are at least eight characters.
- The current-project title and thumbnail link to the active step, the step rail
  links to the Idea and Storyboard steps when available (Video only after
  approval), and an Edit brief action returns to the Idea step.
- Recent cards expose a hover arrow and status, fall back to "No topic saved
  yet", and use singular/plural scene counts.
- Keep the data honest: no invented projects, percentages, render status,
  testimonials or playable footage. Video and Publish stay visibly gated.
- The Projects list now uses the dark library treatment in section 18; there are
  no light-card app screens left inside the studio shell.

## 15. Idea step

The Idea step follows the Stitch “Creator Studio: Idea Step” screen, adapted to
the landing tokens and real data.

- Header: dark pill step rail (01 Idea active, 02 Storyboard, 03 Video, 04
  Publish gated), the project title, a live save state (“Saving to Supabase…” /
  “Saved to Supabase” / “Save failed”) and the project format. Secondary “Back to
  home” and primary “Continue to storyboard” actions sit on the right.
- Main column, “The idea” card: core topic textarea with a 2,000-character
  counter, target audience, rough notes and key talking points, narration voice
  with its real test/unverified status, a “Save now” action and the autosave
  note. Audience and notes are always visible; there is no fake “Canvas stage”
  or project number.
- Right rail, “Idea directions” card: three real generated suggestions, each
  with an expandable angle, outline, visual direction and sample scene prompt;
  “Suggest ideas” / “Suggest again”; “Use & edit prompt” applies the direction
  to the editable topic field; a feedback field with “Refine suggestions”;
  loading, empty and error states. Nothing is invented before the model returns.
- Side column also holds the project brief (format, target duration, aspect,
  narration, “Supabase Postgres” destination). The “Review before render”
  workflow card sits under “The idea” in the main column. No fabricated
  destination codes, latency figures, plan names or manual sections.
- Desktop is a two-column layout with the suggestions visible beside the topic;
  mobile is a single column with a wrapping step rail and the primary action in
  the header.
## 16. Storyboard workspace

The Storyboard step follows the Stitch “Creator Studio: Storyboard Step” screen,
adapted to the landing tokens and the real editor.

- Header: dark step rail (02 Storyboard active), project title, save state,
  scene count, duration, Draft/Needs approval/Approved chip, project format line,
  and Generate storyboard / Generate another, Edit idea, Save draft and Approve
  storyboard actions.
- Three panes on desktop (`220px / minmax(0,1fr) / 300px`): scene rail with
  selected state and honest “No script” / “No visual” warnings; scene canvas
  with a dark 9:16 layout guide labelled “Layout guide · not rendered footage”,
  title, narration, visual intent, visual kind and duration; inspector with
  scene health, storyboard status, revision hash, approval action and project
  brief.
- Bottom bar: autosave state, Previous/Next scene, scene counter and a disabled
  “Continue to video” with a “Requires approval” note. Sticky on desktop, static
  after the inspector on mobile.
- States: loading skeleton, empty storyboard, validation warnings, approved and
  disabled approval. No fake rendered footage, latency, cadence metrics,
  revision hashes or creator counts.
- Mobile stacks the panes and scrolls the scene rail horizontally.

## 17. Video step (gated)

The Video step is a real route at `/app/projects/[id]/video`, reachable from
the step rail and the Storyboard “Continue to video” action once the exact
storyboard revision is approved.

- If the storyboard is not approved, the page shows an approval gate and a
  “Review storyboard” action. It does not offer generation.
- If approved, the page lists the approved scenes with narration, visual prompt,
  kind and duration, all marked “Footage not generated”.
- A provider-required banner states that DeepSeek plans text but cannot generate
  video. The checklist marks the storyboard and voice as ready and the
  text-to-video provider and spending budget as missing. “Generate footage” is
  disabled.
- Actual footage requires one text-to-video provider, a server-side key and an
  approved numeric budget. Do not substitute stock footage, stills, animation or
  fake progress. This is the remaining V1 release blocker.

## 18. Projects library

The Projects library at `/app/projects` follows the Stitch “Vydrivo Creator
Studio — Projects (Studio Obsidian)” screen (`projects/17165629018061734091/screens/f712ba5cee9b443eb216b0380ffe9718`,
design system `assets/9174889276387841922`) but renders only real Supabase
projects and honest states.

- Header: violet `01 / Library` index, Inter “Projects” heading, the
  brief/storyboard/render description and a right-aligned gradient New project
  action. On mobile the action is full width and sits below the copy.
- Four summary cards: Total, Drafts, In review and Approved. Values come from the
  real project collection; no percentages, trends, creator counts or render
  claims.
- Toolbar: search by title or topic, sort by Latest updated / Oldest first /
  Title A–Z, grid/list toggle, and filter chips for All / Drafts / Review /
  Approved / Generating / Ready / Failed with real counts. Search and sort/view
  share a row on tablet and desktop; search is full width on phones and the sort
  and view controls share the row below it. Filter chips scroll horizontally on a
  narrow screen rather than crushing the labels.
- Honest data note: “Supabase projects. Owner-scoped in Postgres. Storyboard
  generation uses the configured DeepSeek gateway; footage, playback and downloads
  are not connected yet.” Do not remove this note while those capabilities remain
  unconnected.
- Grid: 1 column on phones, 2 from `sm`, 3 from `xl`. List view uses a 200px
  thumbnail beside the title, real metadata, status, updated time and the next
  action. Cards show a storyboard-frame thumb with a 9:16 chip, real status badge,
  BRIEF/STORYBOARD label and real duration; there is no fake play button or
  preview overlay.
- Grid cards use the real title, scene count or format/target metadata, state
  copy (“Idea step not started”, “Storyboard needs review”, “Approved · footage
  not generated”), updated time and the next action. The current project gets a
  small status dot; the three-dot menu offers Open project, Edit idea, Duplicate
  and Delete project.
- Empty states distinguish no projects, no matches for a search, no projects in a
  real state, and the intentionally disconnected Generating/Ready/Failed pipeline.
  They never show fake activity. Loading uses dark skeletons; load failures show a
  red alert with Try again.
- Delete confirmation is a dark modal that names the project and says it will be
  permanently removed from Supabase, including its storyboard. Cancel is
  autofocused; Escape and the backdrop close it.
- Typography stays on the studio scale: 13–14px body/form content, 11–12px
  labels, 16px card titles, 30–34px page heading, Inter headings and mono only for
  real metadata. Do not reintroduce 8–10px content text.
- Adapted away from the Stitch source: illustrative project names, invented
  summary deltas, fake playback, fabricated pipeline states and fabricated
  percentages. The Stitch screen is a visual reference, not fixture data.
