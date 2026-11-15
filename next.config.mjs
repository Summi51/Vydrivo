/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Amplify's SSR bundle is capped at 220 MB. These folders are runtime output
  // or local media, never imported by a route. The tracer still follows a
  // statically scoped path.join even when turbopackIgnore silences the warning,
  // so exclude them from every server trace.
  // ffprobe-static ships every platform binary (~335 MB). The probe resolves
  // only the current platform at runtime, so the other binaries must not ship.
  // ffmpeg-static downloads one platform binary in its install script.
  // The probe path is built from process.platform, which the tracer cannot
  // follow. Amplify is linux/x64, so that one binary is included explicitly
  // and the other platform binaries stay excluded.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/ffprobe-static/bin/linux/x64/**/*'],
  },
  outputFileTracingExcludes: {
    '/*': [
      './prototype/output/**/*',
      './prototype/private/**/*',
      './public/videos/**/*',
      './remotion/public/media/**/*',
      './node_modules/ffprobe-static/bin/darwin/**/*',
      './node_modules/ffprobe-static/bin/win32/**/*',
      './node_modules/ffprobe-static/bin/linux/ia32/**/*',
      './.env',
      './.env.*',
    ],
  },
};

export default nextConfig;
