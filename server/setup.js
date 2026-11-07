import { SEED_RECORDS, SEED_ASSETS } from './seed-data.js';
import { ensureSchema, rebuildStep } from './rebuild.js';
import { json } from './http.js';

const getState = async (db, key) => (await db.get('SELECT value FROM system_state WHERE key=?', key))?.value ?? null;
const setState = (db, key, value) => db.run('INSERT INTO system_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, String(value));

export async function isReady(db) { try { return (await getState(db, 'ready')) === '1'; } catch { return false; } }

// Fresh server: copy in the demo accounts a few files at a time, then build the index from those files.
// If records/ already has accounts, nothing is copied: a missing index only gets rebuilt, and real data is never overwritten.
export async function setupStep(ctx) {
  const { db, store, assets } = ctx;
  await ensureSchema(db);
  if ((await getState(db, 'ready')) === '1') return json({ done: true, progress: 1 });
  const total = SEED_RECORDS.length + SEED_ASSETS.length;
  let cursor = await getState(db, 'seed_cursor');
  if (cursor === null && (await store.listFolders('records/accounts')).length) { cursor = total; await setState(db, 'seed_cursor', total); }
  let i = +(cursor || 0);
  if (i < total) {
    for (let n = 0; n < 15 && i < total; n++, i++) {
      const path = i < SEED_RECORDS.length ? SEED_RECORDS[i].path : SEED_ASSETS[i - SEED_RECORDS.length].path;
      if (await store.exists(path)) continue;
      if (i < SEED_RECORDS.length) await store.writeText(path, SEED_RECORDS[i].text);
      else await store.writeBytes(path, await assets.read(SEED_ASSETS[i - SEED_RECORDS.length].asset));
    }
    await setState(db, 'seed_cursor', i);
    return json({ done: false, progress: i / total * 0.8 });
  }
  const c = await getState(db, 'rebuild_cursor');
  const s = await rebuildStep(ctx, c === null ? null : +c);
  await setState(db, 'rebuild_cursor', s.cursor);
  if (s.done) await setState(db, 'ready', 1);
  return json({ done: s.done, progress: s.done ? 1 : 0.8 + 0.2 * s.cursor / (s.total || 1) });
}
