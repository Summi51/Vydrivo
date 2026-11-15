export const GRAPHICS_DIAGRAMS = [
  'statement', 'steps', 'compare', 'checklist', 'timeline', 'recap',
  'problem-fix', 'cause-effect', 'big-number', 'cycle',
];

const DIAGRAM_SET = new Set(GRAPHICS_DIAGRAMS);

function cleanText(value, max, label) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const text = value.trim();
  if (!text || text.length > max) throw new Error(`${label} must be 1–${max} characters.`);
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(text) || /(https?:\/\/|www\.)/i.test(text)) {
    throw new Error(`${label} contains unsupported content.`);
  }
  return text;
}

function cleanLabels(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  const labels = [];
  for (const item of value.slice(0, 4)) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const text = item.trim();
    if (text.length > 32) throw new Error(`${label} must be 32 characters or fewer.`);
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(text) || /(https?:\/\/|www\.)/i.test(text)) {
      throw new Error(`${label} contains unsupported content.`);
    }
    labels.push(text);
  }
  if (labels.length < 2) throw new Error(`${label} needs at least two entries.`);
  return labels;
}

export function validateGraphicsScript(project, script) {
  const sourceScenes = Array.isArray(project?.storyboard?.scenes) ? project.storyboard.scenes : [];
  if (!sourceScenes.length) throw new Error('The project has no approved scenes.');
  if (!script || typeof script !== 'object' || !Array.isArray(script.scenes)) {
    throw new Error('Scene text must contain a scenes list.');
  }
  if (script.scenes.length !== sourceScenes.length) {
    throw new Error('Scene text must match the approved scene count.');
  }
  const byId = new Map();
  for (const scene of script.scenes) {
    if (!scene || typeof scene !== 'object' || typeof scene.id !== 'string') {
      throw new Error('Every scene text entry needs an ID.');
    }
    if (byId.has(scene.id)) throw new Error('Scene text contains duplicate IDs.');
    byId.set(scene.id, scene);
  }

  const scenes = sourceScenes.map((source, index) => {
    const scene = byId.get(source.id);
    if (!scene) throw new Error(`Scene text is missing ${source.id}.`);
    const narration = cleanText(scene.narration, 700, `Scene ${index + 1} voice narration`);
    if (!/[\u0900-\u097F]/.test(narration)) {
      throw new Error(`Scene ${index + 1} voice narration must use Devanagari Hindi.`);
    }
    const diagram = typeof scene.diagram === 'string' && DIAGRAM_SET.has(scene.diagram) ? scene.diagram : null;
    if (!diagram) throw new Error(`Scene ${index + 1} needs a supported diagram.`);
    return {
      id: source.id,
      headline: cleanText(scene.headline, 44, `Scene ${index + 1} on-screen title`),
      diagram,
      labels: cleanLabels(scene.labels, `Scene ${index + 1} labels`),
      displayNarration: cleanText(scene.displayNarration, 700, `Scene ${index + 1} caption text`),
      narration,
    };
  });

  return { scenes };
}

export function scriptFromRenderData(project, data, sourceRunId) {
  const sourceScenes = Array.isArray(project?.storyboard?.scenes) ? project.storyboard.scenes : [];
  const renderedScenes = Array.isArray(data?.scenes) ? data.scenes : [];
  if (!sourceScenes.length || !renderedScenes.length) return null;
  const byId = new Map(renderedScenes.map((scene) => [scene.id, scene]));
  const scenes = sourceScenes.map((source) => {
    const scene = byId.get(source.id);
    if (!scene) return null;
    const labels = Array.isArray(scene.labels) && scene.labels.length >= 2 ? scene.labels.slice(0, 4) : ['Key idea', 'Takeaway'];
    return {
      id: source.id,
      headline: String(scene.headline || source.title || 'Scene').slice(0, 44),
      diagram: DIAGRAM_SET.has(scene.diagram) ? scene.diagram : 'statement',
      labels,
      displayNarration: scene.displayNarration || scene.narration || source.narration,
      narration: scene.narration || source.narration,
    };
  });
  if (scenes.some((scene) => !scene)) return null;
  return {
    schemaVersion: 1,
    projectId: project.id,
    sourceRunId: sourceRunId || null,
    updatedAt: new Date().toISOString(),
    scenes,
  };
}

export function scriptFromTranslation(project, translated) {
  const sourceScenes = Array.isArray(project?.storyboard?.scenes) ? project.storyboard.scenes : [];
  const translatedScenes = Array.isArray(translated?.scenes) ? translated.scenes : [];
  if (!sourceScenes.length || translatedScenes.length !== sourceScenes.length) return null;
  const byId = new Map(translatedScenes.map((scene) => [scene.id, scene]));
  const scenes = sourceScenes.map((source) => {
    const scene = byId.get(source.id);
    if (!scene) return null;
    return {
      id: source.id,
      headline: String(scene.title || source.title || 'Scene').slice(0, 44),
      diagram: DIAGRAM_SET.has(scene.diagram) ? scene.diagram : 'statement',
      labels: Array.isArray(scene.labels) && scene.labels.length >= 2 ? scene.labels.slice(0, 4) : ['Key idea', 'Takeaway'],
      displayNarration: scene.displayNarration || scene.narration,
      narration: scene.narration,
    };
  });
  if (scenes.some((scene) => !scene)) return null;
  return {
    schemaVersion: 1,
    projectId: project.id,
    sourceRunId: null,
    updatedAt: new Date().toISOString(),
    scenes,
  };
}
