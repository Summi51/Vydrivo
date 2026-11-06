import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { verifiedAccess } from '../../../../../../../../lib/api-session.js';
import { errorResult } from '../../../../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOBS = path.join(process.cwd(), 'prototype/output/graphics-jobs');

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id, runId } = await params;
  if (!UUID.test(id) || !UUID.test(runId)) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  try {
    const job = JSON.parse(readFileSync(path.join(JOBS, runId, 'job.json'), 'utf8'));
    if (job.projectId !== id || job.ownerId !== session.user.id) {
      return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    }
    const status = JSON.parse(readFileSync(path.join(JOBS, runId, 'status.json'), 'utf8'));
    if (status.state !== 'done') return errorResult(404, 'GRAPHICS_RUN_NOT_READY', 'Graphics render is not ready.');
    const file = path.join(JOBS, runId, 'output.mp4');
    if (!existsSync(file)) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    const bytes = readFileSync(file);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(bytes.length),
        'Content-Disposition': `inline; filename="vydrivo-${runId}.mp4"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  }
}
