import { SCHEMA, REBUILDABLE_TABLES } from './schema.js';
import { LIMITS } from './config.js';
import { readJsonFile, readLines } from './http.js';
import { idOf, isId, dayFolder, parseName, folderTitle } from './ids.js';
import { usernameKey } from './auth.js';
import { indexRow, INSERT_LISTING } from './listings.js';

const extOf = parts => { const n = parts[parts.length - 1]; return n.includes('.') ? n.split('.').pop().toLowerCase() : null; };
export async function ensureSchema(db) { await db.batch(SCHEMA.map(s => [s])); }

// The whole index comes from the files. Each step handles one account, so it works on small hosts too.
export async function rebuildStep(ctx, cursor, problems = []) {
  const { db, store } = ctx;
  if (cursor === null || cursor === undefined) {
    await ensureSchema(db);
    await db.batch(REBUILDABLE_TABLES.map(t => [`DELETE FROM ${t}`]));
    cursor = 0;
  }
  const accounts = [];
  for (const day of (await store.listFolders('records/accounts')).sort()) for (const a of (await store.listFolders(`records/accounts/${day}`)).sort()) accounts.push(`${day}/${a}`);
  if (cursor < accounts.length) { await indexAccount(ctx, accounts[cursor], problems); return { cursor: cursor + 1, total: accounts.length, done: false, problems }; }
  await indexArchived(ctx, problems);
  await repairCounters(ctx);
  return { cursor, total: accounts.length, done: true, problems };
}
async function indexAccount(ctx, folder, problems) {
  const { db, store } = ctx, path = `records/accounts/${folder}`, dataPath = `data/accounts/${folder}`;
  const a = await readJsonFile(store, `${path}/account.json`);
  if (!a) { problems.push(`${path}: account.json is missing`); return; }
  await db.run('INSERT OR REPLACE INTO accounts(id,username,username_key,path,data_path,photo,joined,status) VALUES(?,?,?,?,?,?,?,?)', a.id, a.username, usernameKey(a.username), path, dataPath, a.profile_photo, a.joined, a.status || 'active');
  const files = await indexDataTree(ctx, dataPath, a.id);
  const keys = await store.listAll(path + '/');
  for (const k of keys.filter(k => k.endsWith('/listing.json'))) {
    const lPath = k.slice(0, -'/listing.json'.length), l = await readJsonFile(store, k), lFolder = lPath.split('/').pop();
    // A folder renamed by hand wins, so a title can be changed from the file system.
    if (folderTitle(l.title, 'listing') !== lFolder.slice(lFolder.indexOf('__') + 2)) l.title = parseName(lFolder).title || l.title;
    const bids = (await readLines(store, `${lPath}/bids.jsonl`)), top = bids.reduce((m, b) => (!m || b[1] > m[1]) ? b : m, null);
    await db.run(INSERT_LISTING, ...indexRow(l, a, lPath, `${dataPath}/listings/${lFolder}`, { price: top ? top[1] : l.price, bids: bids.length, top_bidder: top ? top[0] : null }));
    for (const p of l.photos) if (!files.has(p)) problems.push(`${l.id}: photo ${p} is missing`);
    for (const r of await readLines(store, `${lPath}/reports.jsonl`)) await db.run('INSERT OR IGNORE INTO reports(listing_id,account_id) VALUES(?,?)', l.id, r[0]);
    for (const cKey of keys.filter(x => x.startsWith(lPath + '/conversations/') && x.endsWith('/conversation.json'))) {
      const cPath = cKey.slice(0, -'/conversation.json'.length);
      await indexConversation(ctx, cPath, `${dataPath}/listings/${lFolder}/conversations/${cPath.split('/').pop()}_attachments`, 'live');
    }
  }
}
async function indexDataTree(ctx, dataPath, accountId) {
  const found = new Set(), seen = new Set();
  for (const k of await ctx.store.listAll(dataPath + '/')) {
    const parts = k.split('/'), name = parts[parts.length - 2];
    if (!isId(idOf(name)) || seen.has(name)) continue;
    seen.add(name);
    const id = idOf(name), folder = parts.slice(0, -1).join('/'), li = parts.indexOf('listings'), ci = parts.indexOf('conversations');
    await ctx.db.run('INSERT OR REPLACE INTO files(id,path,ext,owner_account,listing_id,conversation_id) VALUES(?,?,?,?,?,?)', id, folder, extOf(parts), accountId, li >= 0 && ci < 0 ? idOf(parts[li + 1]) : null, ci >= 0 ? idOf(parts[ci + 1]) : null);
    found.add(id);
  }
  return found;
}
async function indexConversation(ctx, cPath, dataPath, status) {
  const { db, store } = ctx, meta = await readJsonFile(store, `${cPath}/conversation.json`);
  if (!meta) return;
  let last = null;
  for (const who of [meta.seller, meta.buyer]) for (const row of await readLines(store, `${cPath}/${who}.jsonl`)) {
    const m = Object.fromEntries(meta.message_template.map((k, i) => [k, row[i]]));
    if (!last || m.time > last.time || (m.time === last.time && m.id > last.id)) last = { ...m, from: who };
  }
  const backups = await countBackups(ctx, meta.id, meta.seller, meta.buyer);
  await db.run('INSERT OR REPLACE INTO conversations(id,listing_id,seller_id,buyer_id,status,backups,path,data_path,last_id,last_from,last_text,last_activity,seller_read,buyer_read) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', meta.id, meta.listing, meta.seller, meta.buyer, status, backups, cPath, dataPath, last?.id || null, last?.from || null, last ? (last.attachment ? (last.attachment[0] === 'F' ? 'Sent a file' : 'Sent a photo') : (last.text || '').slice(0, 120)) : null, last ? Date.parse(last.time) : Date.parse(meta.started), meta.last_read?.[meta.seller] || null, meta.last_read?.[meta.buyer] || null);
}
async function countBackups(ctx, id, seller, buyer) {
  const names = await ctx.store.listFolders(`records/backups/conversations/${dayFolder(id, 'conversations')}/${id}__${seller}_${buyer}`);
  return names.filter(n => /^backup\d+$/.test(n)).length;
}
async function indexArchived(ctx) {
  const { db, store } = ctx;
  const base = 'records/backups/conversations', all = [];
  for (const day of await store.listFolders(base)) for (const f of await store.listFolders(`${base}/${day}`)) all.push({ day, folder: f });
  for (const { day, folder } of all) {
    const root = `${base}/${day}/${folder}`, subs = await store.listFolders(root), id = idOf(folder), [seller, buyer] = folder.split('__')[1].split('_');
    if (subs.includes('active')) {
      const dataRoot = `data/backups/conversations/${day}/${folder}_attachments/active`, cPath = `${root}/active`;
      for (const k of await store.listAll(dataRoot + '/')) {
        const parts = k.split('/'), name = parts[parts.length - 2];
        if (isId(idOf(name))) await db.run('INSERT OR REPLACE INTO files(id,path,ext,owner_account,listing_id,conversation_id) VALUES(?,?,?,NULL,NULL,?)', idOf(name), parts.slice(0, -1).join('/'), extOf(parts), id);
      }
      await indexConversation(ctx, cPath, dataRoot, 'closed');
      continue;
    }
    if (await db.get('SELECT id FROM conversations WHERE id=?', id)) continue;
    const backups = subs.filter(n => /^backup\d+$/.test(n)).sort((a, b) => +a.slice(6) - +b.slice(6));
    if (!backups.length) continue;
    const meta = await readJsonFile(store, `${root}/${backups[backups.length - 1]}/conversation.json`);
    if (meta) await db.run("INSERT OR REPLACE INTO conversations(id,listing_id,seller_id,buyer_id,status,backups) VALUES(?,?,?,?,'backed_up',?)", id, meta.listing, seller, buyer, backups.length);
  }
}
// New IDs must never reuse an old one, so counters only move up.
async function repairCounters(ctx) {
  const { store, db } = ctx, high = {};
  const note = id => { if (!isId(id)) return; const key = id.slice(0, id.lastIndexOf('.')), n = +id.slice(id.lastIndexOf('.') + 1); if (!(high[key] >= n)) high[key] = n; };
  const keys = [...await store.listAll('records/'), ...await store.listAll('data/')];
  for (const k of keys) for (const part of k.split('/')) { note(idOf(part)); note(part.replace(/\.jsonl$/, '')); }
  const rows = await db.all("SELECT id,last_id FROM conversations WHERE last_id IS NOT NULL");
  for (const r of rows) note(r.last_id);
  await db.batch(Object.entries(high).map(([k, n]) => ['INSERT INTO counters(key,n) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET n=MAX(n,excluded.n)', k, n]));
}
export async function rebuildAll(ctx, log = () => {}) {
  let s = await rebuildStep(ctx, null, []);
  while (!s.done) { log(`${s.cursor}/${s.total} accounts`); s = await rebuildStep(ctx, s.cursor, s.problems); }
  return s;
}
