export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
export const fail = (status, message) => { throw new ApiError(status, message); };
export async function readJson(request, maxBytes = 20000) {
  if (+(request.headers.get('content-length') || 0) > maxBytes) fail(413, 'That is too long.');
  try { const b = await request.json(); if (b && typeof b === 'object') return b; } catch {}
  fail(400, 'Could not read that request.');
}
export async function readImage(request, maxBytes) {
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.byteLength > maxBytes) fail(413, 'That photo is too large.');
  const jpg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const webp = buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  if (buf.byteLength < 50 || !(jpg || png || webp)) fail(415, 'Photos must be JPG, PNG or WebP images.');
  return { bytes: buf, ext: jpg ? 'jpg' : png ? 'png' : 'webp' };
}
// Chat attachments: photos, videos and PDFs.
export async function readAttachment(request, maxBytes) {
  const b = new Uint8Array(await request.arrayBuffer());
  if (b.byteLength > maxBytes) fail(413, `That file is too large. The limit is ${Math.floor(maxBytes / 1048576 * 10) / 10} MB right now.`);
  const at = (i, ...v) => v.every((x, n) => b[i + n] === x);
  const ext = at(0, 0xFF, 0xD8, 0xFF) ? 'jpg' : at(0, 0x89, 0x50, 0x4E, 0x47) ? 'png' : at(8, 0x57, 0x45, 0x42, 0x50) ? 'webp' : at(0, 0x25, 0x50, 0x44, 0x46) ? 'pdf' : at(4, 0x66, 0x74, 0x79, 0x70) ? 'mp4' : at(0, 0x1A, 0x45, 0xDF, 0xA3) ? 'webm' : null;
  if (b.byteLength < 50 || !ext) fail(415, 'Attachments must be photos, MP4 or WebM videos, or PDFs.');
  return { bytes: b, ext, type: ['jpg', 'png', 'webp'].includes(ext) ? 'photo' : ext === 'pdf' ? 'document' : 'video' };
}
export async function hit(db, key, max, windowMs) {
  const now = Date.now();
  const r = await db.get(`INSERT INTO limits(key,window_start,n) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN window_start<? THEN 1 ELSE n+1 END, window_start=CASE WHEN window_start<? THEN ? ELSE window_start END RETURNING n`, key, now, now - windowMs, now - windowMs, now);
  return r.n <= max;
}
export async function sha256Hex(text) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export const clientKey = request => sha256Hex('autohound-client:' + (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local'));
export const readJsonFile = async (store, path) => { const t = await store.readText(path); return t === null ? null : JSON.parse(t); };
export const writeJsonFile = (store, path, value) => store.writeText(path, JSON.stringify(value, null, 2) + '\n');
export async function readLines(store, path) { const t = await store.readText(path); return t ? t.split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; }
export async function appendLine(store, path, row) { const t = (await store.readText(path)) || ''; await store.writeText(path, t + JSON.stringify(row) + '\n'); }
export async function moveTree(store, from, to) {
  const keys = await store.listAll(from + '/');
  for (const k of keys) { const b = await store.readBytes(k); if (b) await store.writeBytes(to + k.slice(from.length), b); }
  for (const k of keys) if (await store.exists(to + k.slice(from.length))) await store.remove(k);
}
