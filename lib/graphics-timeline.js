// Shared graphics timeline rules. The studio renderer and the browser renderer
// both use these so a 60–90 second cut is decided the same way. No provider calls.

export const TIMELINE_MIN_SECONDS = 60;
export const TIMELINE_MAX_SECONDS = 90;
export const MAX_TIMELINE_TEMPO = 1.35;
export const GRAPHICS_FPS = 30;

export function fitTimeline(speechSeconds, {
  minSeconds = TIMELINE_MIN_SECONDS,
  maxSeconds = TIMELINE_MAX_SECONDS,
  maxTempo = MAX_TIMELINE_TEMPO,
} = {}) {
  const seconds = (Array.isArray(speechSeconds) ? speechSeconds : []).map(Number);
  if (!seconds.length || seconds.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error('Audio duration is invalid.');
  }
  const total = seconds.reduce((sum, value) => sum + value, 0);
  if (total >= minSeconds && total <= maxSeconds) {
    return { seconds, tempo: 1, total, fitted: false };
  }
  const target = total > maxSeconds ? maxSeconds : minSeconds;
  const playback = total / target;
  if (playback < 1 / maxTempo || playback > maxTempo) {
    const direction = total > maxSeconds ? 'shorter' : 'longer';
    throw new Error(`Narration is ${total.toFixed(1)}s, too far from ${minSeconds}–${maxSeconds}s to fit cleanly. Make the storyboard a little ${direction}, then render again.`);
  }
  const fitted = seconds.map((value) => value / playback);
  const drift = target - fitted.reduce((sum, value) => sum + value, 0);
  fitted[fitted.length - 1] += drift;
  return {
    seconds: fitted,
    tempo: playback,
    total: fitted.reduce((sum, value) => sum + value, 0),
    fitted: Math.abs(playback - 1) > 0.0001,
  };
}

export function sceneDurationSeconds(speechSeconds, estimatedSeconds) {
  const speech = Number(speechSeconds);
  if (!Number.isFinite(speech) || speech <= 0) throw new Error('Audio duration is invalid.');
  const estimate = Number(estimatedSeconds);
  return Number.isFinite(estimate) && estimate > speech ? estimate : speech;
}

// Hold each scene to its storyboard estimate, then fit that held cut into
// 60–90 seconds. Tempo changes the spoken audio; the hold is silence after it.
export function planGraphicsTimeline(scenes) {
  const rows = (Array.isArray(scenes) ? scenes : []).map((scene) => {
    const speech = Number(scene?.speechSeconds);
    const held = sceneDurationSeconds(speech, scene?.estimatedSeconds);
    return { speech, held };
  });
  const fit = fitTimeline(rows.map((row) => row.held));
  return rows.map((row, index) => {
    const held = fit.seconds[index];
    const speech = row.speech / fit.tempo;
    return {
      speechSeconds: speech,
      heldSeconds: held,
      durationInFrames: Math.max(1, Math.round(held * GRAPHICS_FPS)),
      tempo: fit.tempo,
      fitted: fit.fitted,
    };
  });
}

// Spread measured audio across narration characters. Gemini has no word times.
export function estimatedAlignment(text, seconds) {
  const characters = Array.from(String(text ?? ''));
  const duration = Number(seconds);
  if (!characters.length) throw new Error('Narration is empty.');
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Audio duration is invalid.');
  const step = duration / characters.length;
  return {
    characters,
    character_start_times_seconds: characters.map((_, index) => Number((index * step).toFixed(4))),
    character_end_times_seconds: characters.map((_, index) => Number(((index + 1) * step).toFixed(4))),
  };
}

export function alignmentCues(alignment) {
  const characters = alignment?.characters;
  const starts = alignment?.character_start_times_seconds;
  const ends = alignment?.character_end_times_seconds;
  if (!Array.isArray(characters) || !characters.length || characters.length !== starts?.length || characters.length !== ends?.length) {
    throw new Error('Missing speech timing.');
  }
  const cues = [];
  let text = '';
  let start = 0;
  let end = 0;
  for (let index = 0; index < characters.length; index += 1) {
    if (!text) start = starts[index];
    text += characters[index];
    end = ends[index];
    if ((text.length >= 35 && /\s/.test(characters[index])) || index === characters.length - 1) {
      if (text.trim()) cues.push({ start, end, text: text.trim() });
      text = '';
    }
  }
  return cues;
}

export function displayCues(cues, displayText) {
  const display = String(displayText || '').trim().replace(/\s+/g, ' ');
  if (!display || !cues.length) return cues;
  const total = cues.reduce((sum, cue) => sum + cue.text.replace(/\s/g, '').length, 0) || cues.length;
  let cursor = 0;
  const out = [];
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const last = index === cues.length - 1;
    const share = total ? cue.text.replace(/\s/g, '').length / total : 1 / cues.length;
    let target = last ? display.length : Math.min(display.length, cursor + Math.max(1, Math.round(display.length * share)));
    if (!last && target < display.length) {
      const nextSpace = display.indexOf(' ', target);
      const prevSpace = display.lastIndexOf(' ', target);
      if (nextSpace !== -1 && (prevSpace === -1 || nextSpace - target <= target - prevSpace)) target = nextSpace;
      else if (prevSpace !== -1) target = prevSpace;
    }
    let text = display.slice(cursor, target).trim();
    if (!text) text = display.slice(cursor).trim().split(/\s+/)[0] || '';
    cursor = Math.max(cursor, target);
    out.push({ ...cue, text });
  }
  if (cursor < display.length && out.length) {
    out[out.length - 1].text = `${out[out.length - 1].text} ${display.slice(cursor).trim()}`.trim();
  }
  return out;
}

export function captionSentences(cues, displayText) {
  const display = String(displayText || '').trim().replace(/\s+/g, ' ');
  if (!display || !cues.length) return cues;
  let searchFrom = 0;
  return cues.map((cue) => {
    let index = display.indexOf(cue.text, searchFrom);
    if (index < 0) index = display.indexOf(cue.text);
    if (index < 0) return { ...cue, sentence: cue.text, highlight: '' };
    const before = display.slice(0, index);
    const sentenceStart = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'), before.lastIndexOf('।')) + 1;
    const after = display.slice(index + cue.text.length);
    const ends = ['.', '!', '?', '।'].map((mark) => after.indexOf(mark)).filter((value) => value >= 0);
    const sentenceEnd = ends.length ? index + cue.text.length + Math.min(...ends) + 1 : display.length;
    searchFrom = Math.max(searchFrom, index + cue.text.length);
    return { ...cue, sentence: display.slice(sentenceStart, sentenceEnd).trim(), highlight: cue.text };
  });
}
