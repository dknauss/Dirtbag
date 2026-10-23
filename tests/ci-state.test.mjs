import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyState } from './assert-ci-state.mjs';
const state = (style) => ({
  wp: '7.0.7', php: '8.2.31', stylesheet: 'dirtbag', post_id: 4, terms: ['dirtbag'],
  receipt: { style, post_id: 4 },
  payload: style === 'default' ? { isGlobalStylesUserThemeJSON: true, settings: [], styles: [] }
    : { ...JSON.parse(readFileSync(new URL(`../styles/${style}.json`, import.meta.url))), isGlobalStylesUserThemeJSON: true },
});
test('accepts all seven requested styles and patch releases of the pinned runtime', () => {
  for (const style of ['default', 'terminal', 'amber-crt', 'blueprint', 'hi-vis', 'minimalist', 'newspaper']) verifyState(state(style), style);
});
test('accepts WordPress removing empty settings/styles during a default save', () => {
  const empty = state('default'); delete empty.payload.settings; delete empty.payload.styles;
  verifyState(empty, 'default');
});
test('rejects the wrong WordPress or PHP runtime', () => {
  for (const change of [{ wp: '7.1.0' }, { php: '8.3.1' }]) assert.throws(() => verifyState({ ...state('default'), ...change }, 'default'), /runtime mismatch/);
});
test('default-looking CSS cannot hide an omitted apply/reset', () => {
  assert.throws(() => verifyState({ ...state('default'), receipt: null }, 'default'), /did not complete/);
  assert.throws(() => verifyState(state('terminal'), 'default'), /did not complete/);
  const stale = state('terminal'); stale.receipt.style = 'default';
  assert.throws(() => verifyState(stale, 'default'), /saved settings|saved styles/);
});
test('rejects orphaned posts, a different live post, and an unapplied variation', () => {
  assert.throws(() => verifyState({ ...state('terminal'), terms: [] }, 'terminal'), /not linked/);
  assert.throws(() => verifyState({ ...state('terminal'), post_id: 5 }, 'terminal'), /different global-styles/);
  const absent = state('default'); absent.receipt.style = 'terminal';
  assert.throws(() => verifyState(absent, 'terminal'), /saved settings|saved styles/);
});
