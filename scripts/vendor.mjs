// Copies the two browser libraries the app uses into /vendor so the site has no CDN dependency.
// Run after `npm install`: node scripts/vendor.mjs
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'vendor'), { recursive: true });

const files = [
  ['node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'vendor/supabase.js'],
  ['node_modules/qrcode-generator/dist/qrcode.js', 'vendor/qrcode.js']
];
for (const [from, to] of files) {
  copyFileSync(join(root, from), join(root, to));
  console.log(`copied ${from} -> ${to}`);
}
