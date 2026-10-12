// The hosting build (scripts/build-site.mjs): it publishes only the site's own files, writes the
// Supabase settings from the host's environment, and refuses a key that would bypass row level security.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = join(root, 'scripts', 'build-site.mjs');
const URL_ = 'https://abcdefgh.supabase.co';
const jwt = (payload) => ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'sig'].join('.');

function build(env = {}) {
  const out = mkdtempSync(join(tmpdir(), 'aatf-site-'));
  const clean = { PATH: process.env.PATH, ...env };
  const r = spawnSync(process.execPath, [script, out], { env: clean, encoding: 'utf8' });
  return { ...r, out, done: () => rmSync(out, { recursive: true, force: true }) };
}

function configOf(out) {
  const sandbox = { window: {} };
  runInNewContext(readFileSync(join(out, 'config.js'), 'utf8'), sandbox);
  return sandbox.window.APP_CONFIG;
}

test('with no settings the site is the demo, and only browser files are published', () => {
  const r = build();
  try {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(r.out, 'config.js'), 'utf8'), readFileSync(join(root, 'config.js'), 'utf8'));
    for (const f of ['index.html', 'assets/js/app.js', 'assets/css/app.css', 'assets/img/alpha-academy-logo.webp', 'vendor/supabase.js', 'vendor/qrcode.js']) {
      assert.ok(existsSync(join(r.out, f)), `missing ${f}`);
    }
    for (const f of ['supabase', 'tests', 'docs', 'scripts', 'package.json', 'CLAUDE.md', 'vercel.json']) {
      assert.ok(!existsSync(join(r.out, f)), `${f} should not be published`);
    }
  } finally {
    r.done();
  }
});

test('Supabase settings and the public address go into config.js', () => {
  const r = build({ SUPABASE_URL: URL_ + '/', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123', PUBLIC_URL: 'https://trading.gil1906.org' });
  try {
    assert.equal(r.status, 0, r.stderr);
    const c = configOf(r.out);
    assert.equal(c.supabaseUrl, URL_);
    assert.equal(c.supabaseKey, 'sb_publishable_abc123');
    assert.equal(c.publicUrl, 'https://trading.gil1906.org/');
    assert.equal(c.appName, 'Alpha Academy Trading Floor', 'the rest of config.js is kept');
  } finally {
    r.done();
  }
});

test('the legacy anon key works too', () => {
  const r = build({ SUPABASE_URL: URL_, SUPABASE_ANON_KEY: jwt({ role: 'anon' }) });
  try {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(configOf(r.out).supabaseKey, jwt({ role: 'anon' }));
  } finally {
    r.done();
  }
});

test('refuses secret keys, half the settings, and a malformed URL', () => {
  const cases = [
    [{ SUPABASE_URL: URL_, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123' }, /secret key/],
    [{ SUPABASE_URL: URL_, SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'service_role' }) }, /service_role/],
    [{ SUPABASE_URL: URL_ }, /both/],
    [{ SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123' }, /both/],
    [{ SUPABASE_URL: 'abcdefgh.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123' }, /should look like/]
  ];
  for (const [env, message] of cases) {
    const r = build(env);
    try {
      assert.notEqual(r.status, 0, `should fail: ${JSON.stringify(env)}`);
      assert.match(r.stderr, message);
    } finally {
      r.done();
    }
  }
});
