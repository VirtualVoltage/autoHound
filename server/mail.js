// The site's own email inbox, shown in the admin panel.
// Incoming mail lands in the mail_queue table (Cloudflare's mail intake worker puts it there).
// processMailQueue turns each one into records/inbox/<date>__inbox/E.ID__Subject/message.json,
// with the original email saved as data/inbox/<date>__inbox/E.ID__Subject/message.eml.
import { fail, json, readJsonFile, writeJsonFile } from './http.js';
import { nextId, folderName, dayFolder } from './ids.js';
import { requireAccount } from './auth.js';
import { ensureSchemaOnce } from './rebuild.js';

const TEXT_LIMIT = 200000;

// ---------- reading an email (MIME) ----------
const binary = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return s; };
const toBytes = str => { const b = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) b[i] = str.charCodeAt(i) & 255; return b; };
function decodeCharset(str, charset) {
  const bytes = toBytes(str);
  try { return new TextDecoder(charset || 'utf-8').decode(bytes); } catch { return new TextDecoder().decode(bytes); }
}
function splitPart(str) {
  const m = /\r?\n\r?\n/.exec(str);
  return m ? { head: str.slice(0, m.index), body: str.slice(m.index + m[0].length) } : { head: str, body: '' };
}
function parseHeaders(head) {
  const h = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) { const k = line.slice(0, i).trim().toLowerCase(); if (!(k in h)) h[k] = line.slice(i + 1).trim(); }
  }
  return h;
}
// =?utf-8?B?...?= and =?utf-8?Q?...?= in subjects and names.
function decodeWords(value) {
  if (!value) return '';
  const text = decodeCharset(value, 'utf-8');
  return text.replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?)/g, '$1').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (all, cs, enc, data) => {
    try {
      const raw = enc.toUpperCase() === 'B' ? atob(data) : data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16)));
      return decodeCharset(raw, cs);
    } catch { return all; }
  });
}
function param(value, name) {
  if (!value) return '';
  const star = new RegExp(`;\\s*${name}\\*=([^;]+)`, 'i').exec(value);
  if (star) { const m = /^([^']*)'[^']*'(.*)$/.exec(star[1].trim().replace(/^"|"$/g, '')); if (m) { try { return decodeURIComponent(m[2]); } catch { return m[2]; } } }
  const m = new RegExp(`;\\s*${name}=("([^"]*)"|[^;]+)`, 'i').exec(value);
  return m ? decodeWords((m[2] ?? m[1]).trim()) : '';
}
function decodeBody(body, cte) {
  const e = (cte || '').toLowerCase();
  if (e === 'base64') { try { return atob(body.replace(/[^A-Za-z0-9+/=]/g, '')); } catch { return ''; } }
  if (e === 'quoted-printable') return body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16)));
  return body;
}
export function htmlToText(html) {
  return html.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function walk(str, out, depth = 0) {
  const { head, body } = splitPart(str), h = parseHeaders(head), ctype = h['content-type'] || 'text/plain', type = ctype.split(';')[0].trim().toLowerCase();
  const disp = h['content-disposition'] || '', filename = param(disp, 'filename') || param(ctype, 'name');
  if (type.startsWith('multipart/') && depth < 8) {
    const boundary = param(ctype, 'boundary');
    if (!boundary) return;
    const parts = body.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?[ \\t]*\\r?\\n?`));
    for (const p of parts.slice(1)) if (p.trim()) walk(p, out, depth + 1);
    return;
  }
  const decoded = decodeBody(body, h['content-transfer-encoding']);
  if (!filename && !/^attachment/i.test(disp) && (type === 'text/plain' || type === 'text/html')) {
    const text = decodeCharset(decoded, param(ctype, 'charset'));
    if (type === 'text/plain') out.plain.push(text); else out.html.push(text);
  } else {
    out.attachments.push({ name: filename || type, type, size: decoded.length });
  }
}
export function parseEmail(bytes) {
  const str = binary(bytes), { head } = splitPart(str), h = parseHeaders(head), out = { plain: [], html: [], attachments: [] };
  walk(str, out);
  let text = (out.plain.join('\n\n').trim() || htmlToText(out.html.join('\n'))).replace(/\r\n?/g, '\n');
  if (text.length > TEXT_LIMIT) text = text.slice(0, TEXT_LIMIT) + '\n\n[Message cut off. The full email is in message.eml.]';
  return { from: decodeWords(h.from), to: decodeWords(h.to), cc: decodeWords(h.cc), reply_to: decodeWords(h['reply-to']), subject: decodeWords(h.subject).trim(), date: h.date || '', message_id: h['message-id'] || '', text, attachments: out.attachments };
}

// ---------- saving ----------
const previewOf = text => text.replace(/\s+/g, ' ').trim().slice(0, 140);
export const INSERT_INBOX = 'INSERT OR REPLACE INTO inbox(id,path,data_path,from_addr,to_addr,subject,received,unread,preview) VALUES(?,?,?,?,?,?,?,?,?)';
export const inboxRow = (m, path, dataPath) => [m.id, path, dataPath, m.from, m.to, m.subject, m.received, m.unread ? 1 : 0, previewOf(m.text || '')];

// Each queued email gets its ID first, so a request cut off partway rewrites the same folder next time.
export async function processMailQueue(ctx, limit = 3) {
  await ensureSchemaOnce(ctx.db);
  const rows = await ctx.db.all('SELECT * FROM mail_queue ORDER BY id LIMIT ?', limit);
  for (const r of rows) {
    let id = r.email_id;
    if (!id) {
      id = await nextId(ctx.db, 'E');
      const set = await ctx.db.run('UPDATE mail_queue SET email_id=? WHERE id=? AND email_id IS NULL', id, r.id);
      if (!set.changes) continue;
    }
    const raw = new Uint8Array(r.raw), parsed = parseEmail(raw), folder = `${dayFolder(id, 'inbox')}/${folderName(id, parsed.subject, 'no_subject')}`;
    const path = `records/inbox/${folder}`, dataPath = `data/inbox/${folder}`;
    const m = { id, received: new Date(r.received).toISOString(), envelope_from: r.mail_from, envelope_to: r.rcpt_to, ...parsed, to: parsed.to || r.rcpt_to, from: parsed.from || r.mail_from,
      size: r.size, truncated: !!r.truncated, unread: true, original: 'message.eml' };
    await ctx.store.writeBytes(`${dataPath}/message.eml`, raw);
    await writeJsonFile(ctx.store, `${path}/message.json`, m);
    await ctx.db.run(INSERT_INBOX, ...inboxRow(m, path, dataPath));
    await ctx.db.run('DELETE FROM mail_queue WHERE id=?', r.id);
  }
}

// ---------- admins ----------
// An account is an admin only while its account.json says "admin": true. It's toggled by hand.
export async function isAdmin(ctx, a) { return !!a && (await readJsonFile(ctx.store, `${a.path}/account.json`))?.admin === true; }
export async function requireAdmin(ctx) {
  const a = await requireAccount(ctx.db, ctx.request);
  if (!await isAdmin(ctx, a)) fail(404, 'Not found.');
  return a;
}
const listItem = r => ({ id: r.id, from: r.from_addr, to: r.to_addr, subject: r.subject, received: r.received, unread: !!r.unread, preview: r.preview });
export async function adminSummary(ctx) {
  await processMailQueue(ctx, 2);
  const unread = (await ctx.db.get('SELECT COUNT(*) n FROM inbox WHERE unread=1')).n;
  const latest = (await ctx.db.all('SELECT * FROM inbox ORDER BY received DESC LIMIT 3')).map(listItem);
  return { unread, latest };
}
export async function adminInbox(ctx) {
  await requireAdmin(ctx);
  await processMailQueue(ctx, 5);
  const rows = await ctx.db.all('SELECT * FROM inbox ORDER BY received DESC LIMIT 300');
  const waiting = (await ctx.db.get('SELECT COUNT(*) n FROM mail_queue')).n;
  return json({ messages: rows.map(listItem), waiting });
}
export async function adminMessage(ctx, id) {
  await requireAdmin(ctx);
  const r = await ctx.db.get('SELECT * FROM inbox WHERE id=?', id);
  if (!r) fail(404, 'That email isn\'t here.');
  const m = await readJsonFile(ctx.store, `${r.path}/message.json`);
  if (!m) fail(404, 'That email isn\'t here.');
  if (m.unread) { m.unread = false; await writeJsonFile(ctx.store, `${r.path}/message.json`, m); await ctx.db.run('UPDATE inbox SET unread=0 WHERE id=?', id); }
  return json({ message: { id: m.id, from: m.from, to: m.to, cc: m.cc, reply_to: m.reply_to, subject: m.subject, date: m.date, received: m.received, text: m.text, attachments: m.attachments, truncated: m.truncated } });
}
export async function adminRawMessage(ctx, id) {
  await requireAdmin(ctx);
  const r = await ctx.db.get('SELECT * FROM inbox WHERE id=?', id);
  const bytes = r && await ctx.store.readBytes(`${r.data_path}/message.eml`);
  if (!bytes) fail(404, 'That email isn\'t here.');
  return new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${id}.eml"`, 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' } });
}

// ---------- rebuilding the index ----------
export async function indexInbox(ctx, problems) {
  const { db, store } = ctx, base = 'records/inbox';
  for (const day of (await store.listFolders(base)).sort()) for (const folder of (await store.listFolders(`${base}/${day}`)).sort()) {
    const path = `${base}/${day}/${folder}`, m = await readJsonFile(store, `${path}/message.json`);
    if (!m) { problems.push(`${path}: message.json is missing`); continue; }
    await db.run(INSERT_INBOX, ...inboxRow(m, path, `data/inbox/${day}/${folder}`));
  }
}
