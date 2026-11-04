import { fail } from './http.js';
import { nextId, folderName, idOf } from './ids.js';

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm' };

// A file's folder is named ID__label. Links use only the ID, so labels and file names can change.
export async function saveImage(ctx, parentPath, image, label, refs) {
  const id = await nextId(ctx.db, image.type && image.type !== 'photo' ? 'F' : 'P'), path = `${parentPath}/${folderName(id, label, 'photo')}`;
  await ctx.store.writeBytes(`${path}/original.${image.ext}`, image.bytes);
  await ctx.db.run('INSERT OR REPLACE INTO files(id,path,ext,owner_account,listing_id,conversation_id) VALUES(?,?,?,?,?,?)', id, path, image.ext, refs.account || null, refs.listing || null, refs.conversation || null);
  return id;
}
async function locate(ctx, row) {
  let names = await ctx.store.listFiles(row.path);
  if (names.length) return { path: row.path, names };
  const parent = row.path.slice(0, row.path.lastIndexOf('/')), found = (await ctx.store.listFolders(parent)).find(n => idOf(n) === row.id);
  if (!found) return null;
  const path = `${parent}/${found}`;
  await ctx.db.run('UPDATE files SET path=? WHERE id=?', path, row.id);
  return { path, names: await ctx.store.listFiles(path) };
}
export async function serveFile(ctx, id, size, account) {
  const row = await ctx.db.get('SELECT * FROM files WHERE id=?', id);
  if (!row) fail(404, 'File not found.');
  if (row.conversation_id) {
    const c = await ctx.db.get('SELECT seller_id,buyer_id FROM conversations WHERE id=?', row.conversation_id);
    if (!account || !c || (account.id !== c.seller_id && account.id !== c.buyer_id)) fail(404, 'File not found.');
  } else if (row.listing_id) {
    const l = await ctx.db.get('SELECT status,account_id FROM listings WHERE id=?', row.listing_id);
    if (!l || ((l.status === 'hidden' || l.status === 'deleted') && account?.id !== l.account_id)) fail(404, 'File not found.');
  }
  const where = await locate(ctx, row);
  if (!where) fail(404, 'File not found.');
  const isThumb = n => /^thumb\./i.test(n), name = (size === 'thumb' && where.names.find(isThumb)) || where.names.find(n => !isThumb(n)) || where.names[0];
  const bytes = name && await ctx.store.readBytes(`${where.path}/${name}`);
  if (!bytes) fail(404, 'File not found.');
  return new Response(bytes, { headers: {
    'content-type': TYPES[name.split('.').pop().toLowerCase()] || 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'cache-control': row.conversation_id ? 'private, max-age=3600' : 'public, max-age=86400',
  } });
}
