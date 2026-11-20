// Graphics color from the latest reference photo. The same photo is also drawn
// as a frame in the graphics video. Accent colors the progress bar and diagrams.

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hex(red, green, blue) {
  return `#${[red, green, blue].map((part) => clamp(part).toString(16).padStart(2, '0')).join('')}`;
}

function mix(color, other, amount) {
  return color.map((part, index) => part + (other[index] - part) * amount);
}

function parseHex(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!match) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
}

export function isTheme(value) {
  return Boolean(parseHex(value?.accent) && parseHex(value?.glow) && parseHex(value?.bar));
}

export function themeFromPixels(pixels) {
  const data = pixels instanceof Uint8ClampedArray || pixels instanceof Uint8Array ? pixels : null;
  if (!data || data.length < 4) return null;
  const buckets = new Map();
  let counted = 0;
  for (let index = 0; index + 3 < data.length; index += 16) {
    const alpha = data[index + 3];
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (alpha < 128) continue;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    if (max < 28 || max - min < 24) continue;
    const key = [red, green, blue].map((part) => Math.round(part / 24) * 24).join(',');
    buckets.set(key, (buckets.get(key) || 0) + 1);
    counted += 1;
  }
  if (!counted) return null;
  const [key] = [...buckets.entries()].sort((left, right) => right[1] - left[1])[0];
  const sampled = key.split(',').map(Number);
  const peak = Math.max(...sampled) || 1;
  const accent = sampled.map((part) => clamp(part + (part / peak) * 70));
  const glow = mix(accent, [8, 16, 28], 0.62);
  const bar = mix(accent, [6, 10, 18], 0.78);
  return {
    accent: hex(...accent),
    glow: hex(...glow),
    bar: hex(...bar),
    source: 'reference',
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function referencePhotos(assets) {
  return (Array.isArray(assets) ? assets : []).filter((asset) => (
    asset
    && asset.status === 'validated'
    && asset.kind === 'reference'
    && String(asset.mime || '').startsWith('image/')
    && UUID.test(String(asset.id || ''))
  ));
}

export function photoForScene(photos, scene) {
  const list = Array.isArray(photos) ? photos : [];
  const bound = list.find((photo) => photo.id === scene?.referenceAssetId);
  return bound || list[0] || null;
}

export function referencePreviewPath(assetId) {
  return `/api/v1/media/assets/${encodeURIComponent(assetId)}/preview`;
}

export async function themeFromImageUrl(url) {
  if (!url || typeof document === 'undefined') return null;
  if (String(url).startsWith('data:image/') || String(url).startsWith('blob:')) return themeFromBlobUrl(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Reference image could not be read.');
  const blobUrl = URL.createObjectURL(await response.blob());
  try {
    return await themeFromBlobUrl(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function themeFromBlobUrl(url) {
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Reference image could not be read.'));
    element.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, 24, 24);
  return themeFromPixels(context.getImageData(0, 0, 24, 24).data);
}
