// Local idea angles. These rewrite the home Try chips around the typed subject.
// They do not call a provider. An empty box keeps the generic starters.

const SUBJECT_LIMIT = 42;

const LEAD_IN = /^(?:please\s+)?(?:can you\s+|could you\s+|i want(?: to)?\s+|let'?s\s+|make(?: a| an)?\s+|create(?: a| an)?\s+|a video (?:about|on)\s+|video (?:about|on)\s+)?(?:explain(?:ing)?|share|show|tease|walk through|describe)\s+/i;
const ABOUT = /^(?:about|on|how)\s+/i;
const ARTICLE = /^(?:a|an|the)\s+/i;

export const IDEA_ANGLES = [
  {
    id: 'concept',
    modeId: 'talking-head',
    fallbackLabel: 'Explain a concept',
    label: (subject) => `Explain ${subject}`,
    prompt: (subject) => `Explain ${subject} to a beginner in plain language. Use one concrete analogy, stay on ${subject}, and keep it under 90 seconds.`,
  },
  {
    id: 'workflow',
    modeId: 'talking-head',
    fallbackLabel: 'Share a workflow',
    label: (subject) => `Share a ${subject} workflow`,
    prompt: (subject) => `Share one practical ${subject} workflow. Show the steps in order, name the mistake each step avoids, and stay on ${subject}.`,
  },
  {
    id: 'feature',
    modeId: 'product-teaser',
    fallbackLabel: 'Tease a feature',
    label: (subject) => `Tease a ${subject} feature`,
    prompt: (subject) => `Tease the one ${subject} feature a viewer should remember. Show the before and after, and do not drift away from ${subject}.`,
  },
  {
    id: 'signs',
    modeId: 'social-reel',
    fallbackLabel: '3 quick signs',
    label: (subject) => `3 ${subject} signs`,
    prompt: (subject) => `Give three quick signs someone is getting ${subject} wrong, then the one change that fixes it. Every sign must be about ${subject}.`,
  },
];

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  return (boundary > 12 ? cut.slice(0, boundary) : cut).trim();
}

function firstClause(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[“”"']/g, '')
    .split(/[.!?\n]/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

// "Explain a load balancer" and "load balancer" both become "load balancer".
// A chip click pins the typed subject after "Starting point:" so the labels
// do not re-parse the written prompt and drift off the topic.
export function ideaSubject(value) {
  const raw = String(value || '');
  const pinned = raw.match(/Starting point:\s*(.+)$/i);
  let text = firstClause(pinned ? pinned[1] : raw);
  text = text.replace(LEAD_IN, '').replace(ABOUT, '').replace(ARTICLE, '').trim();
  text = text.replace(/[,:;]+$/, '').trim();
  if (text.length < 3) return '';
  return clip(text, SUBJECT_LIMIT);
}

export function ideaAngles(value) {
  const subject = ideaSubject(value);
  if (!subject) {
    return IDEA_ANGLES.map((angle) => ({
      id: angle.id,
      modeId: angle.modeId,
      label: angle.fallbackLabel,
      topic: '',
      subject: '',
      tailored: false,
    }));
  }
  return IDEA_ANGLES.map((angle) => ({
    id: angle.id,
    modeId: angle.modeId,
    label: clip(angle.label(subject), 48),
    topic: angle.prompt(subject),
    subject,
    tailored: true,
  }));
}

// A click must keep the typed subject. An empty box has no starter to apply,
// so the caller leaves the field alone instead of wiping it.
export function applyIdeaAngle(current, angle) {
  if (!angle?.tailored || !angle.topic) return String(current || '');
  const clean = String(current || '').replace(/\s+/g, ' ').trim();
  if (!clean) return angle.topic;
  if (clean.startsWith(angle.topic)) return clean;
  return `${angle.topic} Starting point: ${clean}`;
}
