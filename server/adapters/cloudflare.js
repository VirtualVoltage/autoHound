import { TextHelpers } from './storage-common.js';
import { LIMITS } from '../config.js';

// R2: real object storage. Paths are the same as folders on a normal disk.
export class R2Store extends TextHelpers {
  constructor(bucket) { super(); this.bucket = bucket; }
  async readBytes(path) { const o = await this.bucket.get(path); return o ? new Uint8Array(await o.arrayBuffer()) : null; }
  writeBytes(path, bytes) { return this.bucket.put(path, bytes); }
  async remove(path) { await this.bucket.delete(path); }
  async exists(path) { return !!(await this.bucket.head(path)); }
  async listAll(prefix) {
    const keys = []; let cursor;
    do { const r = await this.bucket.list({ prefix, cursor }); r.objects.forEach(o => keys.push(o.key)); cursor = r.truncated ? r.cursor : undefined; } while (cursor);
    return keys;
  }
}
// Used until R2 is switched on. Same paths, kept as rows in a D1 table.
export class D1Store extends TextHelpers {
  constructor(db) { super(); this.db = db; }
  async readBytes(path) {
    const r = await this.db.prepare('SELECT bytes FROM vfs WHERE path=?').bind(path).first();
    return r ? new Uint8Array(r.bytes) : null;
  }
  writeBytes(path, bytes) { return this.db.prepare('INSERT OR REPLACE INTO vfs(path,bytes) VALUES(?,?)').bind(path, bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes).run(); }
  async remove(path) { await this.db.prepare('DELETE FROM vfs WHERE path=?').bind(path).run(); }
  async exists(path) { return !!(await this.db.prepare('SELECT 1 x FROM vfs WHERE path=?').bind(path).first()); }
  async listAll(prefix) {
    const r = await this.db.prepare('SELECT path FROM vfs WHERE path>=? AND path<? ORDER BY path').bind(prefix, prefix + '￿').all();
    return r.results.map(x => x.path);
  }
}
export function d1Database(d1) {
  const prep = (sql, params) => d1.prepare(sql).bind(...params);
  return {
    get: (sql, ...p) => prep(sql, p).first(),
    all: async (sql, ...p) => (await prep(sql, p).all()).results,
    run: async (sql, ...p) => ({ changes: (await prep(sql, p).run()).meta.changes }),
    batch: list => list.length ? d1.batch(list.map(([sql, ...p]) => prep(sql, p))) : null,
  };
}
export function cloudflareContext(context) {
  const { env } = context;
  return {
    env, db: d1Database(env.DB), maxUploadBytes: env.FILES ? undefined : LIMITS.smallStoreBytes,
    store: env.FILES ? new R2Store(env.FILES) : new D1Store(env.DB),
    assets: { read: async p => { const r = await env.ASSETS.fetch(new URL(p, context.request.url)); if (!r.ok) throw new Error('Missing asset ' + p); return new Uint8Array(await r.arrayBuffer()); } },
  };
}
