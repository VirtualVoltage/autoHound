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
export const ID_PATTERN = /^[ALPFCM]\.\d\d\.\d\d\.\d\d\.\d{5,}$/;
export const isId = (s, type) => ID_PATTERN.test(s || '') && (!type || s[0] === type);

// Everything after the first __ is a label and is free to change.
export function slug(text, fallback = 'untitled') {
  const s = String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/_{2,}/g, '_').replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '').slice(0, 40).replace(/[-_]+$/, '');
  return s || fallback;
}
export const folderName = (id, label, fallback) => `${id}__${slug(label, fallback)}`;
export const idOf = name => name.split('__')[0];
