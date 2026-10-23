import { readFileSync } from 'node:fs';
const { preferredVersions: versions } = JSON.parse(readFileSync(new URL('./blueprint.json', import.meta.url)));
for (const key of ['wp', 'php']) {
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(versions[key])) throw new Error(`CI requires a numeric ${key} version`);
  console.log(`${key}=${versions[key]}`);
}
