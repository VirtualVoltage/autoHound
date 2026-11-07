// IDs look like L.26.11.04.00000: type, year, month, day (Pacific time), then a daily count.
const pad = (n, w) => String(n).padStart(w, '0');

export function dayStamp(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day}`;
}
export async function nextId(db, type) {
  const day = dayStamp(), key = `${type}.${day}`;
  const row = await db.get('INSERT INTO counters(key,n) VALUES(?,0) ON CONFLICT(key) DO UPDATE SET n=n+1 RETURNING n', key);
  return `${key}.${pad(row.n, 5)}`;
}
// A account, L listing, P photo, F file, C chat, M message, E email to the site's inbox.
export const ID_PATTERN = /^[ALPFCME]\.\d\d\.\d\d\.\d\d\.\d{5,}$/;
export const isId = (s, type) => ID_PATTERN.test(s || '') && (!type || s[0] === type);

// Folder names are ID__title. The title keeps real words, with _ in place of spaces.
export function folderTitle(text, fallback = 'untitled') {
  const t = String(text).replace(/[\/\\:*?"<>|\u0000-\u001f\u007f]+/g, '-').replace(/[\s_]+/g, '_').replace(/^[._-]+|[._-]+$/g, '');
  return [...t].slice(0, 70).join('').replace(/[._-]+$/, '') || fallback;
}
export const folderName = (id, label, fallback) => `${id}__${folderTitle(label, fallback)}`;
// The only place that splits a folder name. Text shown to people comes from title, never id.
export function parseName(name) {
  const i = name.indexOf('__');
  return i < 0 ? { id: name, title: '' } : { id: name.slice(0, i), title: name.slice(i + 2).replace(/_+/g, ' ').trim() };
}
export const cleanWords = text => String(text).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
// Crowded folders are split by the date in the ID: 26.11.04__accounts
export const dayFolder = (id, label) => `${id.slice(2, 10)}__${label}`;
// Accounts sort into A to Z by username. Usernames can start with anything, so the rest go in _other.
export function letterFolder(username) {
  const c = String(username).normalize('NFKD').trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : '_other';
}
export const idOf = name => parseName(name).id;
