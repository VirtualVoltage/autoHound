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

// Public page addresses use the title, not the ID: /listing/all-terrain-tire-285-70r17-12kd, /seller/boost_brandon.
// The short code at the end of a listing's address is its ID's date and count in a compact form, so two listings
// with the same title never clash, a renamed listing keeps working, and nothing extra has to be stored.
export const slug = text => String(text ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
const DAYS = 40000; // more than any YY.MM.DD can reach (99 * 372 + 11 * 31 + 30)
export function listingCode(id) {
  const m = /^L\.(\d\d)\.(\d\d)\.(\d\d)\.(\d{5,})$/.exec(id || '');
  return m ? (+m[4] * DAYS + +m[1] * 372 + (+m[2] - 1) * 31 + (+m[3] - 1)).toString(36) : null;
}
export function listingIdFromCode(code) {
  if (!/^[0-9a-z]{1,11}$/.test(code || '')) return null;
  const n = parseInt(code, 36), day = n % DAYS, id = `L.${pad(Math.floor(day / 372), 2)}.${pad(Math.floor(day % 372 / 31) + 1, 2)}.${pad(day % 31 + 1, 2)}.${pad(Math.floor(n / DAYS), 5)}`;
  return listingCode(id) === code ? id : null;
}
export const listingPath = l => { const s = slug(l.title), c = listingCode(l.id); return `/listing/${s ? s + '-' : ''}${c}`; };
// What comes after /listing/ in an address: the title and code, or (older links) the ID itself.
export const listingIdFromKey = key => isId(key, 'L') ? key : listingIdFromCode(String(key ?? '').split('-').pop());
// Usernames never contain _, so it stands in for their spaces, the same as in folder names.
export const sellerPath = username => `/seller/${encodeURIComponent(String(username).trim().replace(/\s+/g, '_'))}`;
