// Verify the request-serving PHP runtime and actual saved global-styles layer.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const versions = JSON.parse(readFileSync(new URL('./blueprint.json', import.meta.url))).preferredVersions;
export function verifyState(state, style, expectedVersions = versions) {
  for (const key of ['wp', 'php']) {
    const actual = state[key]?.split('.');
    assert.deepEqual(actual?.slice(0, expectedVersions[key].split('.').length), expectedVersions[key].split('.'), `${key} runtime mismatch: ${state[key]}`);
  }
  assert.equal(state.stylesheet, 'dirtbag', 'wrong active theme');
  assert.ok(state.post_id > 0, 'no live global-styles post');
  assert.ok(state.terms.includes('dirtbag'), 'global-styles post is not linked to Dirtbag');
  assert.equal(state.receipt?.style, style, 'apply/reset did not complete');
  assert.equal(state.receipt?.post_id, state.post_id, 'front end reads a different global-styles post');
  const variation = style === 'default' ? {} : JSON.parse(readFileSync(new URL(`../styles/${style}.json`, import.meta.url)));
  assert.equal(state.payload?.isGlobalStylesUserThemeJSON, true);
  for (const key of ['settings', 'styles']) {
    assert.deepEqual(state.payload[key] ?? [], variation[key] ?? [], `${style}: saved ${key} differs from the requested variation`);
  }
}
export async function checkState(base, style) {
  const response = await fetch(`${base}/?rest_route=/dirtbag-ci/v1/state`);
  assert.ok(response.ok, `CI state endpoint returned ${response.status}`);
  const state = await response.json();
  verifyState(state, style);
  console.log(`Verified runtime WordPress ${state.wp}, PHP ${state.php}; ${style} uses linked global-styles post ${state.post_id}`);
  return state;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkState(process.env.DIRTBAG_BASE_URL || 'http://127.0.0.1:9400', process.env.DIRTBAG_STYLE || 'default');
}
