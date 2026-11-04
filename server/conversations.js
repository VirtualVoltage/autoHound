import { LIMITS, MESSAGE_TEMPLATE } from './config.js';
import { fail, hit, json, readJson, readAttachment, readJsonFile, writeJsonFile, readLines, appendLine, moveTree } from './http.js';
import { nextId, isId, dayFolder } from './ids.js';
import { requireAccount } from './auth.js';
import { saveImage } from './files.js';

const folderFor = (id, seller, buyer) => `${id}__${seller}_${buyer}`;
const zip = (template, row) => Object.fromEntries(template.map((k, i) => [k, row[i]]));
const backupRoot = c => `backups/conversations/${dayFolder(c.id, 'conversations')}/${folderFor(c.id, c.seller_id, c.buyer_id)}`;

// The newest message in the files decides the timer, so the index can never expire a chat by mistake.
async function latestMessageTime(store, c) {
  const meta = await readJsonFile(store, `${c.path}/conversation.json`);
  const at = meta.message_template.indexOf('time'); let latest = 0;
  for (const who of [c.seller_id, c.buyer_id]) {
    const rows = await readLines(store, `${c.path}/${who}.jsonl`), last = rows[rows.length - 1];
    if (last) latest = Math.max(latest, Date.parse(last[at]));
  }
  return latest || Date.parse(meta.started);
}
export async function sweepIdle(ctx, limit = 3) {
  const cutoff = Date.now() - LIMITS.conversationIdleMs;
  const rows = await ctx.db.all("SELECT * FROM conversations WHERE status IN ('live','closed') AND last_activity<? LIMIT ?", cutoff, limit);
  for (const c of rows) {
    const latest = await latestMessageTime(ctx.store, c);
    if (latest >= cutoff) await ctx.db.run('UPDATE conversations SET last_activity=? WHERE id=?', latest, c.id);
    else await backUp(ctx, c);
  }
}
async function backUp(ctx, c) {
  const n = c.backups + 1;
  await moveTree(ctx.store, c.path, `records/${backupRoot(c)}/backup${n}`);
  if (c.data_path && (await ctx.store.listAll(c.data_path + '/')).length) await moveTree(ctx.store, c.data_path, `data/${backupRoot(c)}_attachments/backup${n}`);
  await ctx.db.batch([
    ['DELETE FROM files WHERE conversation_id=?', c.id],
    ["UPDATE conversations SET status='backed_up', backups=?, path=NULL, data_path=NULL, last_id=NULL, last_from=NULL, last_text=NULL, last_activity=NULL, seller_read=NULL, buyer_read=NULL WHERE id=?", n, c.id],
  ]);
}
// Sold or removed listing: the chat leaves the listing but stays in both inboxes until its timer runs out.
export async function closeListingConversations(ctx, listing) {
  const rows = await ctx.db.all("SELECT * FROM conversations WHERE listing_id=? AND status='live'", listing.id);
  for (const c of rows) {
    const root = backupRoot(c), to = `records/${root}/active`, dataTo = `data/${root}_attachments/active`;
    await moveTree(ctx.store, c.path, to);
    await writeJsonFile(ctx.store, `${to}/listing.snapshot.json`, listing);
    const hasData = c.data_path && (await ctx.store.listAll(c.data_path + '/')).length;
    if (hasData) await moveTree(ctx.store, c.data_path, dataTo);
    await ctx.db.run("UPDATE conversations SET status='closed', path=?, data_path=? WHERE id=?", to, dataTo, c.id);
    if (hasData) {
      const files = await ctx.db.all('SELECT id,path FROM files WHERE conversation_id=?', c.id);
      for (const f of files) await ctx.db.run('UPDATE files SET path=? WHERE id=?', dataTo + f.path.slice(c.data_path.length), f.id);
    }
  }
}
async function participant(ctx, id) {
  const a = await requireAccount(ctx.db, ctx.request), c = await ctx.db.get("SELECT * FROM conversations WHERE id=? AND status IN ('live','closed')", id);
  if (!c || (c.seller_id !== a.id && c.buyer_id !== a.id)) fail(404, 'That conversation isn\'t here anymore.');
  return { a, c };
}
async function rateCheck(ctx, a) { if (!await hit(ctx.db, 'msg:' + a.id, LIMITS.messagesPerMinute, 60e3)) fail(429, 'You\'re sending messages too fast. Wait a minute.'); }
const cleanText = v => (typeof v === 'string' ? v.trim().slice(0, LIMITS.messageLength) : '');

// One line per message. An attachment is its own line with its own ID and time.
async function writeLine(ctx, c, a, attachment, text) {
  const id = await nextId(ctx.db, 'M'), time = new Date().toISOString();
  await appendLine(ctx.store, `${c.path}/${a.id}.jsonl`, [attachment, id, text, time]);
  const preview = attachment ? (attachment[0] === 'F' ? 'Sent a file' : 'Sent a photo') : text.slice(0, 120);
  const readCol = a.id === c.seller_id ? 'seller_read' : 'buyer_read';
  await ctx.db.run(`UPDATE conversations SET last_id=?, last_from=?, last_text=?, last_activity=?, ${readCol}=? WHERE id=?`, id, a.id, preview, Date.now(), id, c.id);
  return { id, from: a.id, time, text, attachment };
}
async function describeAttachment(ctx, id) {
  if (!id) return null;
  const f = await ctx.db.get('SELECT ext FROM files WHERE id=?', id), ext = f?.ext || 'jpg';
  return { url: `/api/files/${id}`, type: ext === 'pdf' ? 'document' : ['mp4', 'webm'].includes(ext) ? 'video' : 'photo', ext };
}
const forClient = async (ctx, m) => ({ ...m, attachment: await describeAttachment(ctx, m.attachment) });
export async function startConversation(ctx, listingId) {
  await sweepIdle(ctx);
  const { db, store, request } = ctx, a = await requireAccount(db, request), text = cleanText((await readJson(request)).text);
  if (!text) fail(400, 'Write a message first.');
  await rateCheck(ctx, a);
  const l = await db.get("SELECT * FROM listings WHERE id=? AND status='live'", listingId);
  if (!l) fail(404, 'That listing isn\'t here anymore.');
  if (l.account_id === a.id) fail(400, 'That\'s your own listing.');
  let c = await db.get('SELECT * FROM conversations WHERE listing_id=? AND buyer_id=?', listingId, a.id);
  if (c && (c.status === 'live' || c.status === 'closed')) { await writeLine(ctx, c, a, null, text); return json({ id: c.id }); }
  const id = c?.id || await nextId(db, 'C'), folder = folderFor(id, l.account_id, a.id), path = `${l.path}/conversations/${folder}`, dataPath = `${l.data_path}/conversations/${folder}_attachments`;
  await writeJsonFile(store, `${path}/conversation.json`, { id, listing: l.id, seller: l.account_id, buyer: a.id, started: new Date().toISOString(), message_template: MESSAGE_TEMPLATE, last_read: {} });
  await db.run("INSERT INTO conversations(id,listing_id,seller_id,buyer_id,status,backups,path,data_path,last_activity) VALUES(?,?,?,?,'live',?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='live',path=excluded.path,data_path=excluded.data_path,last_activity=excluded.last_activity", id, l.id, l.account_id, a.id, c?.backups || 0, path, dataPath, Date.now());
  c = await db.get('SELECT * FROM conversations WHERE id=?', id);
  await writeLine(ctx, c, a, null, text);
  return json({ id });
}
export async function inbox(ctx) {
  await sweepIdle(ctx);
  const a = await requireAccount(ctx.db, ctx.request);
  const rows = await ctx.db.all(`SELECT c.*, l.title listing_title, l.price listing_price, l.photo listing_photo, l.status listing_status, s.username seller_name, b.username buyer_name, s.photo seller_photo, b.photo buyer_photo
    FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN accounts s ON s.id=c.seller_id JOIN accounts b ON b.id=c.buyer_id
    WHERE (c.seller_id=? OR c.buyer_id=?) AND c.status IN ('live','closed') AND c.last_activity>=? ORDER BY c.last_activity DESC LIMIT 200`, a.id, a.id, Date.now() - LIMITS.conversationIdleMs);
  return json({ conversations: rows.map(c => {
    const seller = c.seller_id === a.id, read = seller ? c.seller_read : c.buyer_read, photo = seller ? c.buyer_photo : c.seller_photo;
    return { id: c.id, listing: { id: c.listing_id, title: c.listing_title, price: c.listing_price, status: c.listing_status, photo: c.listing_photo ? `/api/files/${c.listing_photo}` : null }, with: { id: seller ? c.buyer_id : c.seller_id, username: seller ? c.buyer_name : c.seller_name, photo: photo ? `/api/files/${photo}` : null }, role: seller ? 'selling' : 'buying', last_text: c.last_text, last_from_me: c.last_from === a.id, last_activity: c.last_activity, unread: !!c.last_id && c.last_from !== a.id && read !== c.last_id };
  }) });
}
export async function unreadCount(ctx, a) {
  const r = await ctx.db.get("SELECT COUNT(*) n FROM conversations WHERE (seller_id=? OR buyer_id=?) AND status IN ('live','closed') AND last_id IS NOT NULL AND last_from<>? AND last_id<>COALESCE(CASE WHEN seller_id=? THEN seller_read ELSE buyer_read END,'')", a.id, a.id, a.id, a.id);
  return r.n;
}
export async function openConversation(ctx, id) {
  const { a, c } = await participant(ctx, id);
  const meta = await readJsonFile(ctx.store, `${c.path}/conversation.json`);
  const template = meta.message_template, messages = [];
  for (const who of [c.seller_id, c.buyer_id]) {
    for (const row of await readLines(ctx.store, `${c.path}/${who}.jsonl`)) {
      const m = zip(template, row);
      messages.push(await forClient(ctx, { id: m.id, from: who, time: m.time, text: m.text || '', attachment: m.attachment || null }));
    }
  }
  messages.sort((x, y) => x.time < y.time ? -1 : x.time > y.time ? 1 : (x.id < y.id ? -1 : 1));
  const isSeller = a.id === c.seller_id;
  if (c.last_id && (isSeller ? c.seller_read : c.buyer_read) !== c.last_id) {
    await ctx.db.run(`UPDATE conversations SET ${isSeller ? 'seller_read' : 'buyer_read'}=? WHERE id=?`, c.last_id, c.id);
    meta.last_read[a.id] = c.last_id;
    await writeJsonFile(ctx.store, `${c.path}/conversation.json`, meta);
  }
  const l = await ctx.db.get('SELECT id,title,price,photo,status FROM listings WHERE id=?', c.listing_id);
  const other = await ctx.db.get('SELECT id,username,photo FROM accounts WHERE id=?', isSeller ? c.buyer_id : c.seller_id);
  return json({ id: c.id, me: a.id, listing: { id: l.id, title: l.title, price: l.price, status: l.status, photo: l.photo ? `/api/files/${l.photo}` : null }, with: { id: other.id, username: other.username, photo: other.photo ? `/api/files/${other.photo}` : null }, expires: c.last_activity + LIMITS.conversationIdleMs, messages });
}
export async function sendMessage(ctx, id) {
  const { a, c } = await participant(ctx, id), b = await readJson(ctx.request), text = cleanText(b.text);
  const attachments = (Array.isArray(b.attachments) ? b.attachments : []).filter(p => isId(p, 'P') || isId(p, 'F')).slice(0, 4);
  if (!text && !attachments.length) fail(400, 'Write a message first.');
  await rateCheck(ctx, a);
  for (const p of attachments) {
    const f = await ctx.db.get('SELECT conversation_id,owner_account FROM files WHERE id=?', p);
    if (!f || f.conversation_id !== c.id || f.owner_account !== a.id) fail(400, 'That file isn\'t part of this chat.');
  }
  const messages = [];
  for (const p of attachments) messages.push(await forClient(ctx, await writeLine(ctx, c, a, p, '')));
  if (text) messages.push(await forClient(ctx, await writeLine(ctx, c, a, null, text)));
  return json({ messages });
}
export async function addAttachment(ctx, id) {
  const { a, c } = await participant(ctx, id);
  await rateCheck(ctx, a);
  const file = await readAttachment(ctx.request, ctx.maxUploadBytes || LIMITS.attachmentBytes);
  const pid = await saveImage(ctx, c.data_path, file, file.type === 'photo' ? 'attachment' : file.type, { account: a.id, conversation: c.id });
  return json({ id: pid, type: file.type });
}
