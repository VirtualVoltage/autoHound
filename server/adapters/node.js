import { DatabaseSync } from 'node:sqlite';
import { promises as fs } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { TextHelpers } from './storage-common.js';

// Your own server: records/ and data/ are ordinary folders on disk.
export class DiskStore extends TextHelpers {
  constructor(root) { super(); this.root = resolve(root); }
  full(p) { const f = resolve(this.root, p); if (!f.startsWith(this.root + sep)) throw new Error('Bad path'); return f; }
  async readBytes(p) { try { return new Uint8Array(await fs.readFile(this.full(p))); } catch (e) { if (e.code === 'ENOENT' || e.code === 'EISDIR') return null; throw e; } }
  async writeBytes(p, b) { const f = this.full(p); await fs.mkdir(dirname(f), { recursive: true }); const tmp = f + '.tmp'; await fs.writeFile(tmp, b); await fs.rename(tmp, f); }
  async remove(p) {
    const f = this.full(p); await fs.rm(f, { force: true });
    let d = dirname(f);
    while (d !== this.root) { try { await fs.rmdir(d); } catch { break; } d = dirname(d); }
  }
  async exists(p) { try { await fs.access(this.full(p)); return true; } catch { return false; } }
  async listAll(prefix) {
    const start = this.full(prefix.replace(/\/$/, '')), out = [];
    const walk = async d => { let list; try { list = await fs.readdir(d, { withFileTypes: true }); } catch { return; } for (const e of list) { const f = join(d, e.name); if (e.isDirectory()) await walk(f); else if (!e.name.endsWith('.tmp')) out.push(relative(this.root, f).split(sep).join('/')); } };
    await walk(start);
    return out;
  }
}
export function sqliteDatabase(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL');
  return {
    get: async (sql, ...p) => db.prepare(sql).get(...p) ?? null,
    all: async (sql, ...p) => db.prepare(sql).all(...p),
    run: async (sql, ...p) => ({ changes: Number(db.prepare(sql).run(...p).changes) }),
    batch: async list => { db.exec('BEGIN'); try { for (const [sql, ...p] of list) db.prepare(sql).run(...p); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } },
  };
}
export const nodeContext = ({ dir, siteDir, env = {} }) => ({
  env, store: new DiskStore(dir), db: sqliteDatabase(join(dir, 'index.sqlite')),
  assets: { read: async p => new Uint8Array(await fs.readFile(join(siteDir, p))) },
});
