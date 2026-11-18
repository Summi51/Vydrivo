import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { getProjectScript } from '../../../../../../lib/video-renders-repository.js';
import { validateGraphicsScript } from '../../../../../../lib/graphics-script.js';
import { isGraphicsVoice } from '../../../../../../lib/voice-options.js';
import { GeminiSpeechError, geminiSpeechWav } from '../../../../../../lib/gemini-speech.js';
import { validateStoryboard } from '../../../../../../prototype/storyboard.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof ProjectRepositoryError || error instanceof GeminiSpeechError) {
    return errorResult(error.status, error.code, error.message);
  }
  if (error?.status && error?.code) return errorResult(error.status, error.code, error.message);
  if (error instanceof Error) return errorResult(422, 'GRAPHICS_VOICE_INVALID', error.message);
  return errorResult(503, 'VOICE_UNAVAILABLE', 'Voice is temporarily unavailable.');
}

export async function POST(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['sceneId', 'voice']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const voice = parsed.body.voice === undefined ? 'Kore' : parsed.body.voice;
  if (!isGraphicsVoice(voice)) return errorResult(422, 'INVALID_VOICE', 'Choose a supported voice.');
  const sceneId = typeof parsed.body.sceneId === 'string' ? parsed.body.sceneId : '';
  if (!sceneId) return errorResult(422, 'GRAPHICS_VOICE_INVALID', 'Choose one approved scene.');

  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    if (project.review?.approved !== true) {
      return errorResult(409, 'APPROVAL_REQUIRED', 'Approve the storyboard before rendering.');
    }
    validateStoryboard(project.storyboard);
    const durable = await getProjectScript(session.access, id);
    if (!durable?.script) return errorResult(422, 'GRAPHICS_SCRIPT_INVALID', 'Prepare scene text before rendering.');
    const script = validateGraphicsScript(project, durable.script);
    const scene = script.scenes.find((item) => item.id === sceneId);
    if (!scene) return errorResult(422, 'GRAPHICS_VOICE_INVALID', 'That scene is not in the approved storyboard.');

    const spoken = await geminiSpeechWav(scene.narration, voice);
    // One scene stays under the response limit. The browser renders from this
    // WAV; it is not stored, so a cancelled render leaves no orphan audio.
    return jsonResult(200, {
      sceneId,
      audio: {
        wavBase64: spoken.wav.toString('base64'),
        seconds: Math.round(spoken.seconds * 1000) / 1000,
        contentType: 'audio/wav',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
