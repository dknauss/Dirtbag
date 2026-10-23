// Exercise the actual shell runner with deterministic CLI/HTTP substitutes.
// No WordPress installation, network writes, or broad process-name cleanup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const runner = new URL('../.github/scripts/boot-playground.sh', import.meta.url).pathname;
async function boot(mode) {
  const root = mkdtempSync(join(tmpdir(), 'dirtbag-boot-test-'));
  const bin = join(root, 'bin'); mkdirSync(bin);
  const logs = join(root, 'logs');
  const executable = (name, source) => writeFileSync(join(bin, name), source, { mode: 0o755 });
  executable('npx', `#!/usr/bin/env node
const fs = require('node:fs');
const file = process.env.FAKE_BOOT_ROOT + '/launches.json';
const launches = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
launches.push({pid:process.pid,args:process.argv.slice(2)});
fs.writeFileSync(file,JSON.stringify(launches));
if(process.env.FAKE_BOOT_MODE==='dead'){console.error('simulated CLI fatal');process.exit(1);}
console.log('Ready!');
setInterval(()=>{},1000);
`);
  executable('curl', `#!/usr/bin/env node
const fs=require('node:fs');
const args=process.argv.slice(2), url=args.at(-1), mode=process.env.FAKE_BOOT_MODE;
const launches=JSON.parse(fs.readFileSync(process.env.FAKE_BOOT_ROOT+'/launches.json'));
if(args.includes('-w')){process.stdout.write('200');process.exit(0);}
if(url.endsWith('style.css'))process.exit(mode==='no-theme'?22:0);
if(url.includes('/users?')){process.stdout.write('[{"slug":"roadside-archivist"}]');process.exit(0);}
process.stdout.write('<img class="wp-post-image">'+((mode==='php-error'||(mode==='recover'&&launches.length===1))?'<b>Warning</b> simulated query failure':''));
`);
  // Shorten polling delays, preserving the real shell conditions/retry behavior.
  executable('seq', '#!/bin/sh\nprintf "1\\n2\\n3\\n4\\n5\\n6\\n7\\n8\\n9\\n10\\n"\n');
  executable('sleep', '#!/bin/sh\n/bin/sleep 0.1\n');
  const blueprint = join(root, 'blueprint.json'); writeFileSync(blueprint, '{}');
  let result;
  try {
    try {
      result = await exec('bash', [runner, blueprint, '7.0', '8.2'], {
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, DIRTBAG_BOOT_LOG_DIR: logs, FAKE_BOOT_ROOT: root, FAKE_BOOT_MODE: mode },
        timeout: 45000,
      });
      result.status = 0;
    } catch (error) { result = { stdout: error.stdout || '', stderr: error.stderr || '', status: error.code }; }
    result.launches = JSON.parse(readFileSync(join(root, 'launches.json')));
    result.probe = existsSync(join(logs, 'attempt-1.probe')) ? readFileSync(join(logs, 'attempt-1.probe'), 'utf8') : '';
    result.log = existsSync(join(logs, 'attempt-1.log')) ? readFileSync(join(logs, 'attempt-1.log'), 'utf8') : '';
    if (result.launches.length > 1) {
      result.firstGroupAlive = false;
      try { process.kill(-result.launches[0].pid, 0); result.firstGroupAlive = true; } catch {}
    }
    return result;
  } finally {
    if (existsSync(join(root, 'launches.json'))) {
      for (const { pid } of JSON.parse(readFileSync(join(root, 'launches.json')))) {
        try { process.kill(-pid, 'SIGKILL'); } catch {}
      }
    }
    rmSync(root, { recursive: true, force: true });
  }
}
test('boots once with explicit runtime pins and the generated blueprint', async () => {
  const result = await boot('ready');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /seeded after attempt 1/);
  assert.equal(result.launches.length, 1);
  assert.ok(result.launches[0].args.includes('--wp=7.0'));
  assert.ok(result.launches[0].args.includes('--php=8.2'));
  assert.ok(result.launches[0].args.includes('--workers=6'));
  assert.ok(result.launches[0].args.some(arg => arg.startsWith('--blueprint=')));
});
test('rejects a missing theme even when image and author probes pass', async () => {
  const result = await boot('no-theme');
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.launches.length, 3);
  assert.match(result.probe, /theme-installed=no featured-image=yes published-author-slug=yes no-php-errors=yes/);
  assert.doesNotMatch(result.stdout, /seeded after/);
});
test('rejects rendered PHP errors and retains failed-attempt diagnostics', async () => {
  const result = await boot('php-error');
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.probe, /no-php-errors=no/);
  assert.match(result.stderr, /simulated query failure/);
  assert.match(result.log, /Ready!/);
});
test('retries with a fresh owned process and recovers from a failed first probe', async () => {
  const result = await boot('recover');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.launches.length, 2);
  assert.notEqual(result.launches[0].pid, result.launches[1].pid);
  assert.equal(result.firstGroupAlive, false, 'the failed launch must be stopped before retrying');
  assert.match(result.stdout, /seeded after attempt 2/);
  assert.match(result.probe, /no-php-errors=no/);
});
test('a dead CLI fails loudly instead of reporting a successful boot', async () => {
  const result = await boot('dead');
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.launches.length, 3);
  assert.match(result.stderr, /simulated CLI fatal/);
  assert.doesNotMatch(result.stdout, /seeded after/);
});
