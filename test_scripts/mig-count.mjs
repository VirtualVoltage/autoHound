import { DatabaseSync } from 'node:sqlite';
const d = new DatabaseSync(process.argv[2]);
const g = s => d.prepare(s).all();
console.log(JSON.stringify({ closedOutside: g("SELECT COUNT(*) n FROM listings WHERE status IN ('sold','deleted') AND path NOT LIKE 'records/backups/%'")[0].n,
  closedInBackups: g("SELECT COUNT(*) n FROM listings WHERE path LIKE 'records/backups/listings/%'")[0].n, live: g("SELECT COUNT(*) n FROM listings WHERE status='live'")[0].n,
  vfs: g("SELECT COUNT(*) n FROM vfs")[0].n, filesOutside: g("SELECT COUNT(*) n FROM files f JOIN listings l ON l.id=f.listing_id WHERE l.status!='live' AND f.path NOT LIKE 'data/backups/%'")[0].n,
  leftoverVfs: g("SELECT COUNT(*) n FROM vfs v WHERE EXISTS (SELECT 1 FROM listings l WHERE l.status!='live' AND l.path NOT LIKE 'records/backups/%' AND substr(v.path,1,length(l.path)+1)=l.path||'/')")[0].n }));
if (process.argv[3]) { const fs = await import('node:fs'); fs.writeFileSync(process.argv[3], JSON.stringify({ l: g("SELECT * FROM listings ORDER BY id"), f: g("SELECT * FROM files ORDER BY id"), c: g("SELECT * FROM conversations ORDER BY id") })); }
