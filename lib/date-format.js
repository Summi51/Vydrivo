// Deterministic date labels for client components that also render on the
// server. `toLocaleDateString()` depends on the runtime locale and timezone, so
// the server HTML and the browser can disagree during hydration. These helpers
// format in UTC with fixed English month names instead.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  const timestamp = typeof value === 'number' ? value : Date.parse(value || '');
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

// "Nov 14, 2026"
export function formatMonthDayYear(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

// "14 Nov"
export function formatDayMonth(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

// "14 Nov 2026"
export function formatDayMonthYear(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// "14 Nov 2026, 12:42"
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDayMonthYear(date)}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
