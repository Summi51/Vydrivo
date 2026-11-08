# Media hosting (Cloudflare R2)

Public runtime video lives in Cloudflare R2 and is delivered through a public
media domain. Generated video is never committed to Git.

## Why R2

- The PRD already recommends R2 Standard for the hosted pilot: video egress is
  the main cost, and R2 has no egress fee. Public sample media and private user
  media use separate buckets because R2 public access is bucket-level.
- S3 plus CloudFront is the AWS-native alternative. It was not chosen because it
  adds a second paid transfer path for the same assets.
- R2 is S3-compatible, so the upload tooling is the same for either provider.

## Configuration

Server-only values live in the ignored `.env.local`. The tracked `.env.example`
documents the names.

```env
# Public CDN origin. Inlined at build time; only NEXT_PUBLIC_* values reach the browser.
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.vydrivo.com/videos

# Server-only R2 credentials.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=vydrivo-media-prod
R2_PUBLIC_BASE_URL=https://media.vydrivo.com
R2_PRIVATE_BUCKET_NAME=vydrivo-user-media-private
```

`lib/media.js` exposes `mediaUrl(path)`. When `NEXT_PUBLIC_MEDIA_BASE_URL` is
empty it returns `/videos/<file>` so local development keeps working with the
local files. When it is set, the landing page, example cards, demo section and
auth reel wall load from the media domain. The base URL includes the `/videos`
prefix that matches the bucket layout used by the upload command.

The base URL is a public origin. It must never be a private bucket endpoint and
must never contain a credential.

## Bucket setup

1. Create a public sample-media bucket, for example `vydrivo-media-prod`. Keep
   it private at rest; expose it only through a custom domain, or temporarily
   through the R2 public development URL while testing. Never put user-uploaded
   media in this bucket.
2. Attach a custom domain, for example `media.vydrivo.com`, through the R2
   bucket settings. Cloudflare serves and caches it. If you do not have a domain
   yet, see “No custom domain yet” below.
3. CORS policy on the bucket:

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://dev.d35b51hio740im.amplifyapp.com"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Create an R2 API token with **Object Read & Write** scoped to that one
   bucket. Configure it locally, never in chat or in the repository.

```bash
aws configure --profile r2-vydrivo
aws configure set region auto --profile r2-vydrivo
```

## No custom domain yet (temporary)

For a test deployment without a domain, enable the bucket’s **Public Development
URL** in R2 → bucket → Settings → Public access. Cloudflare gives a URL like:

```text
https://pub-<hash>.r2.dev
```

Set:

```env
NEXT_PUBLIC_MEDIA_BASE_URL=https://pub-<hash>.r2.dev/videos
R2_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
```

This is a temporary testing path. The `r2.dev` URL is rate-limited and is not
recommended for production traffic. Attach a custom domain before launch. Do not
use the `r2.dev` URL for the private user-media bucket.

The public development URL exposes the **whole bucket**. Only put public
landing/auth sample media there. Do not put user-uploaded video in a bucket with
public access enabled.

## Upload

```bash
aws s3 sync public/videos/ s3://vydrivo-media-prod/videos/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --region auto \
  --profile r2-vydrivo \
  --exclude "*" \
  --include "*.mp4" \
  --include "*-poster.jpg" \
  --exclude "demo1.mp4" \
  --exclude "demo2.mp4" \
  --exclude "demo3.mp4" \
  --cache-control "public,max-age=31536000,immutable"
```

`hero-card-frame.jpg` is not uploaded: it is a Remotion render input, not a
runtime asset. The old `demo1/2/3` clips are unused by the current landing.

Long immutable cache headers mean a replaced file needs a new name or key
prefix. Version the prefix, for example `videos/v2/`, when assets change.

## Files stored

- Landing: `hero-ai-lab.mp4`, `hero-education-desk.mp4`, `hero-lyrical.mp4`,
  `hero-space.mp4` (parked), `hero-load-balancing.mp4`, `landing-hero-mobile.mp4`
  (legacy), `vydrivo-demo.mp4`.
- Examples: `example-education.mp4`, `example-product.mp4`, `example-social.mp4`,
  `example-data-pipeline.mp4`, `example-ai-map.mp4`, `example-future-city.mp4`.
- Auth reel wall: `auth-reel-sun.mp4`, `auth-reel-art.mp4`, `auth-reel-copy.mp4`,
  `auth-reel-brand.mp4`, `auth-reel-orb.mp4`, `auth-reel-space.mp4`,
  `auth-reel-robot.mp4`, `auth-reel-face.mp4`.
- The matching `*-poster.jpg` files for every clip.

## Private upload intents — 5 November 2026

R2 public access is bucket-level. User media must not go in the public
sample-media bucket. The server now issues short-lived presigned URLs for the
separate private bucket:

1. `POST /api/v1/media/upload-intents` verifies the signed-in owner and project,
   validates kind/MIME/size, generates the object key server-side, and returns a
   15-minute presigned PUT URL plus the required `Content-Type`.
2. The browser uploads directly to R2 with that URL.
3. `POST /api/v1/media/access` accepts only a key under the caller's
   `users/<ownerId>/` prefix and returns a 5-minute presigned GET URL.
4. Only `reference` and `thumbnail` uploads are allowed. Generated footage and
   exports remain worker-only; they are not user-uploadable in V1.

Object keys are generated as
`users/<ownerId>/projects/<projectId>/<kind>/<uuid>.<ext>`. The browser never
receives R2 credentials, and a presigned URL is scoped to one key, one method and
a short expiry.

Allowed uploads: MP4/WebM references up to 100 MB; JPEG/PNG references and
thumbnails up to 20 MB. Upload intents now create a `pending` `media_assets` row,
finalize checks HEAD size/type plus the first 16 bytes for a PNG/JPEG/MP4/WebM
signature, then downloads the object, runs `ffprobe` and a full `ffmpeg` decode,
and stores `native_properties`. The Idea step exposes a project-level reference
panel and storyboard scenes can bind a validated reference. The per-owner quota
is 500 MB; pending intents expire after one hour. Rejected objects are deleted and
their quota released. `scene_assets`, retention sweep, the `/app/library` page
and generation use remain pending.

### Durable render keys

Completed graphics renders use a separate private prefix:

```text
users/<ownerId>/projects/<projectId>/renders/<runId>/video.mp4
users/<ownerId>/projects/<projectId>/renders/<runId>/thumbnail.jpg
users/<ownerId>/projects/<projectId>/renders/<runId>/script.json
users/<ownerId>/projects/<projectId>/renders/<runId>/metadata.json
```

Only the server uploads these objects. `video_renders` stores the keys and
metadata; the file/thumbnail routes return short-lived signed GET URLs.
`POST /api/v1/videos/backfill` copies existing local runs into this prefix, and
the Videos page exposes **Save to cloud**. The bucket must stay private; never
put these keys in the public sample bucket. If the bucket or migration `0008` is
unavailable, the API falls back to local files and reports
`storageAvailable:false`.

The private bucket has no public development URL and no public custom domain.
Configure the server-only values in the ignored `.env.local`:

```env
# Private S3-compatible media. AWS S3 or R2.
MEDIA_S3_REGION=us-east-1
MEDIA_S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
MEDIA_S3_BUCKET=vydrivo-user-media-private-051495878127
MEDIA_S3_ACCESS_KEY_ID=
MEDIA_S3_SECRET_ACCESS_KEY=
```

The older `R2_*` names are still accepted as aliases. For AWS S3, the bucket
region must match `MEDIA_S3_REGION`; the endpoint can be the regional S3
endpoint. The bucket must remain private.

Until those values exist, storage routes return `503 MEDIA_STORAGE_UNAVAILABLE`
and the media library returns `503 MEDIA_LIBRARY_UNAVAILABLE`; invalid
kind/MIME/size returns `422`. No object is stored by this app in the public
sample bucket.

Live verification, 6 November 2026: the private bucket
`vydrivo-user-media-private-051495878127` is configured in the ignored
`.env.local`, CORS allows `http://localhost:3000`, `http://127.0.0.1:3000` and
`https://dev.d35b51hio740im.amplifyapp.com`, and the live path passed. A
signed-in browser requested an intent (`201`), PUT a 1×1 PNG with the returned
`Content-Type` (`200`), requested a signed access URL (`200`), and downloaded the
same 70 bytes (`image/png`, exact match). The test object was deleted and a HEAD
check returned `404`. Keys were never printed or committed.

The F39 media-asset slice then passed in Chrome after migration `0005` was
applied: PNG intent `201`/finalize `200` with a signed 1×1 thumbnail and preview;
MP4 intent `201`/finalize `200`, 1.7 MB quota and a 5.04 s preview; fake PNG
`422 MEDIA_CONTENT_MISMATCH` with cleanup; delete `200`, quota back to 0 and an
S3 prefix listing of 0 objects.

F40 added native probing and scene binding after migration `0006`. A 1×1 PNG
finalized with `nativeProperties` `{width:1,height:1,videoCodec:"png",
fullDecode:true}`; a real 1.8 MB MP4 finalized with `{width:620,height:1200,
durationMs:5042,videoCodec:"h264",fullDecode:true}`. The Idea card showed `1 × 1`,
the Storyboard picker listed `probe-test.png · 1×1`, binding persisted across
reload, and the approval hash changed when the reference changed. A random
valid-UUID reference returned `422 MEDIA_REFERENCE_NOT_FOUND`; deleting the asset
showed the missing-reference warning and Clear; deleting a project with an active
object left 0 objects under its S3 prefix.

A review pass then added S3 `If-Match`/ETag checks on the range read and full
download, a downloaded-size re-check, `probe_error` persistence on rejected
probes, paginated project-delete cleanup (500 rows per page), and a retryable
`503 MEDIA_PROBE_UNAVAILABLE` that keeps the pending row. Full UI regression
covered landing, sign-in, app home, Projects, Idea upload/probe/preview,
Storyboard bind/approve, the gated Video page and project delete. The temp
project's S3 prefix returned 0 objects and no console errors appeared.

F41 added copy-on-finalize. Finalize copies the validated object to a fresh
committed key, downloads the copy with the copy ETag, updates the asset key,
deletes the original upload key and serves only the committed key. A
probe/download/finalize failure deletes the committed copy. The old key returned
`404`; the committed key returned `200` with the same 70 PNG bytes; the UI showed
`READY` and a signed 1×1 preview; delete/project cleanup returned 0 objects; a
rejected probe also left 0 objects.

Residual limitation: a client can still re-upload to the deleted original key
until the presigned PUT URL expires, creating an orphan object. A lifecycle rule
or one-time upload grant remains pending; the validated asset no longer points at
that key.

Migration `0007_media_rpc.sql` revokes direct insert/update/delete on
`media_assets` from `authenticated` and moves reserve/finalize/reject/delete to
owner-checked security-definer RPCs. The RPCs still cannot prove the S3 object
exists; the API remains the HEAD/probe trust boundary.

## Amplify deployment note

Amplify builds from Git. It does **not** read `.env.local`, and `public/videos`
is gitignored, so neither the local files nor the local environment are present
in an Amplify build.

Add the public media URL to **Amplify → App settings → Environment variables**:

```env
NEXT_PUBLIC_MEDIA_BASE_URL=https://pub-<hash>.r2.dev/videos
```

Then start a new Amplify build. `NEXT_PUBLIC_*` values are inlined at build time,
so changing the value without redeploying has no effect. The auth pages are
`force-dynamic`, and `lib/auth.js` resolves Supabase config from the server-only
`SUPABASE_*` values first, then from `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED`.
Keep the same project URL, publishable (anon) key and Google flag in both pairs.

Amplify does not pass console environment variables into the Next.js server
runtime by itself. `amplify.yml` copies `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_GOOGLE_ENABLED` and every `NEXT_PUBLIC_*`
name into `.env.production` before `npm run build`. That file is generated on
the builder and is not committed. `Redeploy this version` reuses the old build;
env changes need a new build. A live check on 28 October 2026 still returned
the unconfigured sign-in banner, which means the running artifact was built
before those values were written into `.env.production`.
Do not add `MEDIA_S3_*` to Amplify for the current landing/auth app; no shipped
UI calls the private-media routes yet. When the upload UI ships, add the five
server-only `MEDIA_S3_*` values in Amplify and copy the same names into
`.env.production` in `amplify.yml` (never commit the values), then start a new
build. Keep the local `public/videos` copies for development, but never commit
them.

## Status

- App wiring (media base URL helper and call sites) is built.
- The public bucket and first upload are complete for the active landing/auth
  sample assets; the temporary r2.dev URL returned 200 for the tested video and
  poster.
- `.env.local` points the app at the temporary r2.dev `/videos` base. The
  Amplify environment variable and a new Amplify build are still required.
- A custom domain remains pending.
- Until the Amplify build uses the public base, the deploy keeps serving local
  poster fallbacks and cannot load the videos.

Private media is built and live-tested against AWS S3: server-only presigned
PUT/GET routes, owner/project-scoped keys, `media_assets` metadata, finalize with
HEAD size/type and magic-byte checks, native `ffprobe`/full-decode properties, a
500 MB per-owner quota, delete cleanup, the Idea-step reference panel and
storyboard scene reference binding. The private bucket and local server
credentials are configured. `scene_assets`, retention sweep, the `/app/library`
page, generation consumption and production Amplify `MEDIA_S3_*` values remain
pending. Storage routes fail closed with `503` until the private bucket
configuration is present.
