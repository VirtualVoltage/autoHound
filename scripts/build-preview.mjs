// Builds one self-contained preview page of the site for the Claude app's side panel.
// It runs the real site code and the active profile's desktop look, with sample data copied from a running server.
// Signing up, logging in and posting are turned off in the preview.
//
// Usage: node scripts/build-preview.mjs <server url> <output.html> [profile]
// The server should be a local copy (npm start), never the live site. esbuild is loaded from $ESBUILD or node_modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [server, out, profileArg] = process.argv.slice(2);
if (!server || !out) { console.error('Usage: node scripts/build-preview.mjs <server url> <output.html> [profile]'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = profileArg || /AUTOHOUND_PROFILE = '([^']+)'/.exec(fs.readFileSync(`${root}/site/js/profile.js`, 'utf8'))[1];
const look = `${root}/site/profiles/${profile}/desktop`;
const esbuild = await import(process.env.ESBUILD || 'esbuild');

// ---------- sample data from the local server ----------
const get = async p => { const r = await fetch(server + '/api/' + p); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
const options = await get('options');
const browse = (await get('listings?limit=100')).listings;
const listings = {}, accounts = {}, fileIds = new Set();
for (const card of browse) {
  const l = (await get('listings/' + card.id)).listing;
  listings[l.id] = l;
  for (const p of l.photos) fileIds.add(p.split('/').pop());
  if (!accounts[l.seller.id]) accounts[l.seller.id] = await get('accounts/' + l.seller.id);
}
for (const a of Object.values(accounts)) if (a.account.photo) fileIds.add(a.account.photo.split('/').pop());
const files = {};
for (const id of fileIds) {
  const r = await fetch(`${server}/api/files/${id}?size=thumb`);
  if (r.ok) files[id] = `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
}
const imgDir = `${look}/img`, assets = {};
for (const f of fs.readdirSync(imgDir)) assets[`/profiles/${profile}/desktop/img/${f}`] = `data:image/${path.extname(f).slice(1)};base64,${fs.readFileSync(`${imgDir}/${f}`).toString('base64')}`;
const data = { options, browse, listings, accounts, files, assets };

// ---------- bundle the site code ----------
const plugin = {
  name: 'preview',
  setup(b) {
    b.onResolve({ filter: /^\/js\// }, a => ({ path: `${root}/site${a.path}` }));
    b.onLoad({ filter: /site[\\/]js[\\/]theme\.js$/ }, () => ({ contents: `import * as v from ${JSON.stringify(`${look}/views.js`)}; export const view = v;`, loader: 'js' }));
  },
};
const built = await esbuild.build({
  entryPoints: [`${root}/site/js/app.js`], bundle: true, write: false, format: 'esm', target: 'es2022', minify: true, plugins: [plugin],
  define: { 'location.pathname': '__vloc.pathname', 'location.search': '__vloc.search', 'history': '__vloc.history' },
});
const appJs = built.outputFiles[0].text;
const css = fs.readFileSync(`${look}/site.css`, 'utf8');

// ---------- fake server inside the page ----------
const shim = `
window.AUTOHOUND_PROFILE = ${JSON.stringify(profile)}; window.AUTOHOUND_DEVICE = 'desktop'; window.AUTOHOUND_LOOK = ${JSON.stringify(`/profiles/${profile}/desktop`)};
const DATA = window.__PREVIEW_DATA;
// Pages change inside the preview without changing the real address.
window.__vloc = { pathname: '/', search: '',
  set(u) { const x = new URL(u, 'https://preview.local'); this.pathname = x.pathname; this.search = x.search; },
  history: { pushState(_s, _t, u) { __vloc.set(u); }, replaceState(_s, _t, u) { __vloc.set(u); }, back() {} } };
const OFF = 'This is a preview with sample listings. Sign up, log in and post at autohound.online.';
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function api(p, method) {
  const u = new URL(p, 'https://preview.local'), parts = u.pathname.split('/').slice(2), q = u.searchParams;
  if (method !== 'GET') return reply({ error: OFF }, 400);
  if (parts[0] === 'me') return reply({ account: null, unread: 0 });
  if (parts[0] === 'options') return reply(DATA.options);
  if (parts[0] === 'favorites' || parts[0] === 'conversations') return reply({ error: 'Log in first.' }, 401);
  if (parts[0] === 'listings' && parts[1]) return DATA.listings[parts[1]] ? reply({ listing: DATA.listings[parts[1]] }) : reply({ error: 'That listing isn\\'t here anymore.' }, 404);
  if (parts[0] === 'listings') {
    const words = (q.get('q') || '').toLowerCase().split(/\\s+/).filter(Boolean), min = +q.get('min') || 0, max = q.get('max') ? +q.get('max') : Infinity;
    let list = DATA.browse.filter(l => l.price >= min && l.price <= max && words.every(w => [l.title, l.description, l.city, l.category, l.seller.username].join(' ').toLowerCase().includes(w)));
    if (q.get('sort') === 'low') list.sort((a, b) => a.price - b.price); else if (q.get('sort') === 'high') list.sort((a, b) => b.price - a.price);
    const off = +q.get('offset') || 0, lim = +q.get('limit') || 48;
    return reply({ listings: list.slice(off, off + lim), more: off + lim < list.length });
  }
  if (parts[0] === 'accounts' && DATA.accounts[parts[1]]) return reply(DATA.accounts[parts[1]]);
  return reply({ error: 'That page isn\\'t in the preview.' }, 404);
}
const realFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  return url.startsWith('/api/') ? Promise.resolve(api(url, (init.method || 'GET').toUpperCase())) : realFetch(input, init);
};
// Photos and profile images come from the page itself.
const swap = img => {
  const src = img.getAttribute('src') || ''; let d;
  if (src.startsWith('/api/files/')) d = DATA.files[src.slice(11).split('?')[0]];
  else if (DATA.assets[src]) d = DATA.assets[src];
  if (d) img.setAttribute('src', d); else if (src.startsWith('/api/')) img.removeAttribute('src');
};
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.tagName === 'IMG') swap(n); n.querySelectorAll?.('img').forEach(swap); } })
  .observe(document.documentElement, { childList: true, subtree: true });
`;

const html = `<title>Autohound Preview</title>
<meta name="description" content="Preview of the Autohound site with sample listings.">
<link rel="icon" href="${assets[`/profiles/${profile}/desktop/img/brand-profile.webp`] || ''}">
<style>${css}
.preview-note { position: relative; z-index: 30; padding: 5px 16px; background: #3a2f00; color: #ffe14d; font-size: 12px; text-align: center; }
</style>
<div class="preview-note">Preview with sample listings. The live site is autohound.online.</div>
<div id="app"></div>
<script>window.__PREVIEW_DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};</script>
<script>${shim}</script>
<script type="module">${appJs.replace(/<\/script/gi, '<\\/script')}</script>
`;
fs.writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1e6).toFixed(2)} MB, ${browse.length} listings, ${Object.keys(files).length} photos, profile ${profile}`);
