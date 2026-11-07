// Gives the site's code files a new address whenever they change, so browsers never reuse old copies.
// It hashes everything in site/js and site/profiles, then writes that version into site/index.html:
//   /v/<version>/js/app.js  ->  served as /js/app.js (site/_redirects on Cloudflare, node-server.js locally).
// Run it before every commit: node scripts/stamp-version.mjs  (the git pre-commit hook runs it too).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = `${root}/site`;
const hash = crypto.createHash('sha256');
const walk = dir => {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = `${dir}/${name}`;
    if (fs.statSync(p).isDirectory()) walk(p);
    else { hash.update(path.relative(site, p)); hash.update(fs.readFileSync(p)); }
  }
};
walk(`${site}/js`);
walk(`${site}/profiles`);
const version = hash.digest('hex').slice(0, 10);

const file = `${site}/index.html`;
const before = fs.readFileSync(file, 'utf8');
let html = before
  .replace(/<script>window\.AUTOHOUND_BASE = '[^']*';<\/script>\n?/, '')
  .replace(/(src=")(?:\/v\/[^/]+)?(\/js\/)/g, `$1/v/${version}$2`);
html = html.replace(/(<script src="\/v\/)/, `<script>window.AUTOHOUND_BASE = '/v/${version}';</script>\n$1`);
if (html !== before) fs.writeFileSync(file, html);
console.log(`site version ${version}${html === before ? ' (unchanged)' : ''}`);
