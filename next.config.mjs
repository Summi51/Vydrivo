/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Amplify's SSR bundle is capped at 220 MB. On Next 16 it ships the traced
  // files plus the full next package (~173 MB). Deployment 32 failed at
  // 258.6 MB. Do not include ffmpeg or ffprobe: the Linux pair is ~138 MB
  // and is what crosses the cap. Media probing reports unavailable when the
  // binaries are absent. Local renders still use the copies in node_modules.
  // These folders are runtime output or local media. The tracer follows a
  // statically scoped path.join even when turbopackIgnore silences the warning.
  outputFileTracingExcludes: {
    '/*': [
      './prototype/output/**/*',
      './prototype/private/**/*',
      './public/videos/**/*',
      './remotion/public/media/**/*',
      './node_modules/ffprobe-static/**/*',
      './node_modules/ffmpeg-static/**/*',
      './node_modules/@remotion/**/*',
      './node_modules/remotion/**/*',
      './node_modules/.remotion/**/*',
      './.env',
      './.env.*',
    ],
  },
};

export default nextConfig;
