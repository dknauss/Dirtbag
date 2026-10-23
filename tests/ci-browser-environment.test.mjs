import test from 'node:test';
import assert from 'node:assert/strict';
import { browserEnvironment, lockedBrowserEnvironment } from './ci-browser-environment.mjs';

function lock(version) {
  return { packages: Object.fromEntries(['@playwright/test', 'playwright', 'playwright-core']
    .map((name) => [`node_modules/${name}`, { version }])) };
}

test('the image follows the lockfile version, including after an upgrade', () => {
  for (const version of ['1.61.0', '1.62.3']) {
    assert.deepEqual(browserEnvironment(lock(version)), {
      version, image: `mcr.microsoft.com/playwright:v${version}-noble`,
    });
  }
  assert.match(lockedBrowserEnvironment().image, /^mcr\.microsoft\.com\/playwright:v\d+\.\d+\.\d+-noble$/);
});

test('missing or non-stable/unsafe version forms fail before matrix jobs launch', () => {
  for (const value of [undefined, 'latest', '1.61.0-beta', '1.61.0\nimage=other']) {
    assert.throws(() => browserEnvironment(lock(value)), /stable versions/);
  }
  assert.throws(() => browserEnvironment({}), /stable versions/);
});

test('different Playwright package/browser versions cannot silently mix', () => {
  const mixed = lock('1.61.0');
  mixed.packages['node_modules/playwright-core'].version = '1.62.0';
  assert.throws(() => browserEnvironment(mixed), /versions disagree/);
});
