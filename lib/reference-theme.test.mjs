import test from 'node:test';
import assert from 'node:assert/strict';
import { isTheme, photoForScene, referencePhotos, themeFromPixels } from './reference-theme.js';

function fill(red, green, blue, count = 64) {
  const pixels = new Uint8ClampedArray(count * 4);
  for (let index = 0; index < count; index += 1) {
    pixels[index * 4] = red;
    pixels[index * 4 + 1] = green;
    pixels[index * 4 + 2] = blue;
    pixels[index * 4 + 3] = 255;
  }
  return pixels;
}

test('a colorful reference photo becomes a brighter video accent', () => {
  const theme = themeFromPixels(fill(168, 96, 48));
  assert.equal(theme.accent, '#ee8844');
  assert.equal(theme.source, 'reference');
  assert.equal(isTheme(theme), true);
  assert.notEqual(theme.accent, '#62f2d8');
});

test('a grey photo does not invent a color theme', () => {
  assert.equal(themeFromPixels(fill(40, 42, 44)), null);
  assert.equal(themeFromPixels(null), null);
});

test('the newest validated reference photo is used, and a bound scene wins', () => {
  const newest = '11111111-1111-4111-8111-111111111111';
  const older = '22222222-2222-4222-8222-222222222222';
  const photos = referencePhotos([
    { id: newest, status: 'validated', kind: 'reference', mime: 'image/jpeg' },
    { id: older, status: 'validated', kind: 'reference', mime: 'image/png' },
    { id: '33333333-3333-4333-8333-333333333333', status: 'validated', kind: 'thumbnail', mime: 'image/jpeg' },
    { id: 'not-an-id', status: 'validated', kind: 'reference', mime: 'image/png' },
  ]);
  assert.deepEqual(photos.map((photo) => photo.id), [newest, older]);
  assert.equal(photoForScene(photos, {}).id, newest);
  assert.equal(photoForScene(photos, { referenceAssetId: older }).id, older);
});


