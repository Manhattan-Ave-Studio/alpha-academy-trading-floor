// Builds the site for a static host such as Vercel: copies the files the browser loads into
// dist/site and, when the host provides them, writes the Supabase settings into config.js.
//
//   SUPABASE_URL                project URL, like https://abcdefgh.supabase.co
//   SUPABASE_PUBLISHABLE_KEY    the publishable (anon) key; SUPABASE_ANON_KEY also works
//   PUBLIC_URL                  optional: the site's address for join links and QR codes
//
// With no Supabase settings, the built site runs the demo, the same as a local checkout.
// Run: node scripts/build-site.mjs [output folder]
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'dist', 'site'));
const env = process.env;

// Only what index.html loads. SQL, tests, docs, and scripts stay out of the published site.
const SITE_FILES = ['index.html', 'config.js', 'assets', 'vendor'];

function fail(message) {
  console.error(`build-site: ${message}`);
  process.exit(1);
}

// The key ends up in a public file, so refuse anything that bypasses row level security.
function checkPublishableKey(key) {
  if (key.startsWith('sb_secret_')) fail('that is a secret key. Use the publishable key (Project Settings, then API).');
  const parts = key.split('.');
  if (parts.length === 3) {
    let role = '';
    try {
      role = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role;
    } catch (_) {
      // Not a JWT; leave it to Supabase to reject.
    }
    if (role === 'service_role') fail('that is the service_role key. Use the anon (publishable) key.');
  }
}

const supabaseUrl = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
const publicUrl = (env.PUBLIC_URL || '').trim();

if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) fail('set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, or neither.');
if (supabaseUrl && !/^https:\/\/[^/\s]+$/.test(supabaseUrl)) fail(`SUPABASE_URL should look like https://abcdefgh.supabase.co, not ${supabaseUrl}`);
if (supabaseKey) checkPublishableKey(supabaseKey);
if (publicUrl && !/^https?:\/\/\S+$/.test(publicUrl)) fail(`PUBLIC_URL should be a full address like https://trading.gil1906.org/, not ${publicUrl}`);

rmSync(out, { recursive: true, force: true });
for (const f of SITE_FILES) cpSync(join(root, f), join(out, f), { recursive: true });

const settings = {};
if (supabaseUrl) Object.assign(settings, { supabaseUrl, supabaseKey });
if (publicUrl) settings.publicUrl = publicUrl.endsWith('/') ? publicUrl : publicUrl + '/';
if (Object.keys(settings).length) {
  const config = readFileSync(join(root, 'config.js'), 'utf8');
  writeFileSync(join(out, 'config.js'), `${config.trimEnd()}

// Added by scripts/build-site.mjs from the host's environment variables.
Object.assign(window.APP_CONFIG, ${JSON.stringify(settings, null, 2)});
`);
}

console.log(`site written: ${out} (${supabaseUrl ? `live, ${supabaseUrl}` : 'demo mode'})`);
if (env.VERCEL_ENV === 'production' && !supabaseUrl) {
  console.warn('build-site: this production build has no SUPABASE_URL, so the site runs the demo.');
}
