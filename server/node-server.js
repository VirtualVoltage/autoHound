// Run the whole site on your own machine: node server/node-server.js
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { join, extname, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './api.js';
import { nodeContext } from './adapters/node.js';

const here = dirname(fileURLToPath(import.meta.url)), siteDir = resolve(here, '../site');
const dir = resolve(process.env.AUTOHOUND_DIR || resolve(here, '../storage')), port = +(process.env.PORT || 8080);
await fs.mkdir(dir, { recursive: true });
const ctx = nodeContext({ dir, siteDir, env: { ADMIN_KEY: process.env.ADMIN_KEY, RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_LOG: process.env.EMAIL_LOG } });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

async function staticFile(pathname, res) {
  // /v/<version>/js/app.js is /js/app.js (see scripts/stamp-version.mjs).
  const file = resolve(siteDir, '.' + decodeURIComponent(pathname.replace(/^\/v\/[^/]+(?=\/)/, '')));
  let target = file.startsWith(siteDir + sep) ? file : join(siteDir, 'index.html');
  try { if ((await fs.stat(target)).isDirectory()) target = join(target, 'index.html'); } catch { target = join(siteDir, 'index.html'); }
  res.writeHead(200, { 'content-type': TYPES[extname(target)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(await fs.readFile(target));
}
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/')) return await staticFile(url.pathname, res);
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks);
    const out = await handle(new Request(url, { method: req.method, headers: req.headers, body }), ctx);
    const headers = {}; out.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(out.status, headers); res.end(Buffer.from(await out.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500); res.end('Server error'); }
}).listen(port, () => console.log(`Autohound running at http://localhost:${port} (files in ${dir})`));
