import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs';
const d = new DatabaseSync(process.argv[2]), out = {};
for (const t of ['accounts', 'listings', 'conversations', 'files', 'reports', 'inbox']) { try { out[t] = d.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all(); } catch { out[t] = null; } }
if (process.argv[4]) { const a = JSON.parse(fs.readFileSync(process.argv[4], 'utf8')); for (const t in out) console.log(t, (out[t]?.length ?? '-'), JSON.stringify(a[t]) === JSON.stringify(out[t]) ? 'identical' : 'DIFFERENT'); }
else fs.writeFileSync(process.argv[3], JSON.stringify(out));
