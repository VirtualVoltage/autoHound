import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs';
const [dbFile, mailDir] = process.argv.slice(2), db = new DatabaseSync(dbFile);
db.exec("CREATE TABLE IF NOT EXISTS mail_queue(id INTEGER PRIMARY KEY AUTOINCREMENT, received INTEGER NOT NULL, mail_from TEXT, rcpt_to TEXT, raw BLOB NOT NULL, size INTEGER, truncated INTEGER NOT NULL DEFAULT 0, email_id TEXT)");
const env = [['jose_buyer@example.com', 'support@autohound.online'], ['shop@example.org', 'zack@autohound.online'], ['spammer@bad.example', 'whatever@autohound.online']];
for (let i = 1; i <= 3; i++) { const b = Buffer.from(fs.readFileSync(`${mailDir}/${i}.eml`).toString('latin1').replace(/(?<!\r)\n/g, '\r\n'), 'latin1'); db.prepare('INSERT INTO mail_queue(received,mail_from,rcpt_to,raw,size) VALUES(?,?,?,?,?)').run(Date.now() + i * 1000, env[i-1][0], env[i-1][1], b, b.length); }
console.log('queued', db.prepare('SELECT COUNT(*) n FROM mail_queue').get().n);
