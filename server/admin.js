// Admin actions. An account is an admin only while its account.json says "admin": true (see mail.js).
import { fail, json, readJson, readJsonFile, writeJsonFile } from './http.js';
import { checkPassword } from './auth.js';
import { requireAdmin } from './mail.js';
import { archiveListing } from './listings.js';
import { closeListingConversations } from './conversations.js';

// Removes anyone's listing, after the admin types their own password. It's moved to backups like any
// removed listing, and listing.json records which admin removed it and when.
export async function adminDeleteListing(ctx, id) {
  const { db, store, request } = ctx, admin = await requireAdmin(ctx), b = await readJson(request);
  await checkPassword(ctx, admin, b.proof);
  const r = await db.get('SELECT * FROM listings WHERE id=?', id);
  if (!r || ['deleted', 'sold'].includes(r.status) || r.path.startsWith('records/backups/')) fail(404, 'That listing is already gone.');
  const l = await readJsonFile(store, `${r.path}/listing.json`);
  if (!l) fail(404, 'That listing is already gone.');
  l.status = 'deleted';
  l.removed_by_admin = { account: admin.id, at: new Date().toISOString() };
  await writeJsonFile(store, `${r.path}/listing.json`, l);
  await db.run("UPDATE listings SET status='deleted' WHERE id=?", id);
  await closeListingConversations(ctx, l);
  await archiveListing(ctx, { ...r, status: 'deleted' });
  return json({ ok: true });
}
