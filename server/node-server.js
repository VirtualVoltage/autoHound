// Run the whole site on your own machine: node server/node-server.js
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { join, extname, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './api.js';
import { nodeContext } from './adapters/node.js';
import { sitemapResponse } from './sitemap.js';
import { pageResponse } from './pages.js';

const here = dirname(fileURLToPath(import.meta.url)), siteDir = resolve(here, '../site');
const dir = resolve(process.env.AUTOHOUND_DIR || resolve(here, '../storage')), port = +(process.env.PORT || 8080);
await fs.mkdir(dir, { recursive: true });
const ctx = nodeContext({ dir, siteDir, env: { ADMIN_KEY: process.env.ADMIN_KEY, RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_LOG: process.env.EMAIL_LOG } });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };

// A real file in site/ (code, styles, photos, robots.txt), or null. /v/<version>/js/app.js is /js/app.js (see scripts/stamp-version.mjs).
async function staticFile(pathname) {
  let file;
  try { file = resolve(siteDir, '.' + decodeURIComponent(pathname.replace(/^\/v\/[^/]+(?=\/)/, ''))); } catch { return null; }
  if (!file.startsWith(siteDir + sep) || file === join(siteDir, 'index.html')) return null;
  try { if (!(await fs.stat(file)).isFile()) return null; } catch { return null; }
  return file;
}
async function send(res, out) {
  const headers = {}; out.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(out.status, headers); res.end(Buffer.from(await out.arrayBuffer()));
}
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/sitemap.xml') return await send(res, await sitemapResponse(ctx));
    const file = !url.pathname.startsWith('/api/') && (req.method === 'GET' || req.method === 'HEAD') && await staticFile(url.pathname);
    if (file) { res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }); return res.end(req.method === 'HEAD' ? undefined : await fs.readFile(file)); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks);
    const request = new Request(url, { method: req.method, headers: req.headers, body, duplex: 'half' });
    // /api/ is the site's API. Everything else is a page, built as HTML (server/pages.js).
    if (url.pathname.startsWith('/api/')) return await send(res, await handle(request, ctx));
    await send(res, await pageResponse(ctx, request, await fs.readFile(join(siteDir, 'index.html'), 'utf8')));
  } catch (e) { console.error(e); res.writeHead(500); res.end('Server error'); }
}).listen(port, () => console.log(`Autohound running at http://localhost:${port} (files in ${dir})`));
