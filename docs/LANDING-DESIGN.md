# Vydrivo — Landing Design Foundation

Date: 27 October 2026
Status: Implemented landing page; app reskin is the next slice
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
- Avoid using multiple display families on one page.

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

1. **Nav** — Vydrivo logo and Sign in on the left, How it works / Demo / Examples in the centre, Start creating on the right. Sign in sits beside the logo instead of inside the centre link group.
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
- The app screens are still light; the next slice applies the design foundation to the app shell, app home and Idea step.
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
