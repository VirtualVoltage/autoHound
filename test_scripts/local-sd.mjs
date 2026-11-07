import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs';
const db = new DatabaseSync(process.argv[2]); const code = process.argv[4] === 'dump' ? '' : fs.readFileSync(process.argv[3], 'utf8');
const q = async (sql, params = []) => { const st = db.prepare(sql); return /^\s*SELECT/i.test(sql) ? st.all(...params) : (st.run(...params), []); };
const fn = new Function('q', code + '\nreturn softDeleteDemo(q);');
const dump = () => ({ l: db.prepare("SELECT id,status FROM listings ORDER BY id").all(), c: db.prepare("SELECT id,status,path,data_path,backups FROM conversations ORDER BY id").all() });
if (process.argv[4] === 'dump') { fs.writeFileSync(process.argv[5], JSON.stringify(dump())); process.exit(0); }
console.log('before live', db.prepare("SELECT COUNT(*) n FROM listings WHERE status='live'").get().n, 'chats', JSON.stringify(db.prepare("SELECT id,listing_id,status FROM conversations").all()));
console.log(JSON.stringify(await fn(q)));
console.log('after live', db.prepare("SELECT COUNT(*) n FROM listings WHERE status='live'").get().n, 'chats', JSON.stringify(db.prepare("SELECT id,status FROM conversations").all()));
fs.writeFileSync(process.argv[4], JSON.stringify(dump()));
