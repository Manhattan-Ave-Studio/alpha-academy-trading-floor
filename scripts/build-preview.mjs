// Builds a single self-contained HTML file of the demo (for sharing a preview link).
// Run: node scripts/build-preview.mjs [output.html]
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'preview.html');

const bundle = await build({
  entryPoints: [join(root, 'assets/js/app.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  write: false
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'assets/css/app.css'), 'utf8').replace(/<\/style/gi, '<\\/style');

const config = {
  preview: true,
  qrcodeScript: false,
  publicUrl: process.env.PUBLIC_URL || 'https://gil1906.org/trading/'
};

const html = `<title>Alpha Academy Trading Floor</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300..800&display=swap">
<style>
${css}
</style>
<div id="app"></div>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js"></script>
<script>window.APP_CONFIG = ${JSON.stringify(config)};</script>
<script>
${js}
</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`preview written: ${out} (${(html.length / 1024).toFixed(0)} KB)`);
