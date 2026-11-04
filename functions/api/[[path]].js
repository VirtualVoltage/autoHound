import { handle } from '../../server/api.js';
import { cloudflareContext } from '../../server/adapters/cloudflare.js';

const VFS = 'CREATE TABLE IF NOT EXISTS vfs(path TEXT PRIMARY KEY, bytes BLOB NOT NULL)';
let vfsReady = false;
export async function onRequest(context) {
  if (!context.env.FILES && !vfsReady) { await context.env.DB.prepare(VFS).run(); vfsReady = true; }
  return handle(context.request, cloudflareContext(context));
}
