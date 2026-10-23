// The lockfile owns both the npm package and the matching preinstalled browsers.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function browserEnvironment(lock) {
  const versions = ['@playwright/test', 'playwright', 'playwright-core']
    .map((name) => lock.packages?.[`node_modules/${name}`]?.version);
  if (!versions.every((version) => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version))) {
    throw new Error('The lockfile must contain stable versions of all three Playwright packages');
  }
  if (new Set(versions).size !== 1) {
    throw new Error(`Playwright package versions disagree: ${versions.join(', ')}`);
  }
  const version = versions[0];
  return { version, image: `mcr.microsoft.com/playwright:v${version}-noble` };
}

export function lockedBrowserEnvironment() {
  return browserEnvironment(JSON.parse(readFileSync(new URL('./package-lock.json', import.meta.url), 'utf8')));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [key, value] of Object.entries(lockedBrowserEnvironment())) console.log(`${key}=${value}`);
}
