// Every page address on Cloudflare (anything that isn't /api/, /sitemap.xml or a file in site/, see site/_routes.json).
// Pages arrive as finished HTML and forms work without JavaScript (server/pages.js).
import { cloudflarePage } from '../server/adapters/cloudflare.js';

const VFS = 'CREATE TABLE IF NOT EXISTS vfs(path TEXT PRIMARY KEY, bytes BLOB NOT NULL)';
let vfsReady = false;
export async function onRequest(context) {
  if (!['GET', 'HEAD', 'POST'].includes(context.request.method)) return new Response('Not allowed.', { status: 405 });
  if (!context.env.FILES && !vfsReady) { await context.env.DB.prepare(VFS).run(); vfsReady = true; }
  return cloudflarePage(context);
}
