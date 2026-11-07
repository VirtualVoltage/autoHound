import {nodeContext} from '/home/claude/autohound/server/adapters/node.js';
import {rebuildAll} from '/home/claude/autohound/server/rebuild.js';
import {unlinkSync,readFileSync} from 'node:fs';
const D='/home/claude/autohound/test_scripts/work/store';for(const f of ['index.sqlite','index.sqlite-wal','index.sqlite-shm']){try{unlinkSync(D+'/'+f)}catch{}}
const c=nodeContext({dir:D,siteDir:'site'});const r=await rebuildAll(c);console.log('rebuilt',r.total,'problems',r.problems);
const before=JSON.parse(readFileSync('/home/claude/autohound/test_scripts/fixtures/before.json','utf8'));
const conv=await c.db.all('SELECT id,status,backups,last_id,path FROM conversations');
const after={a:(await c.db.get('SELECT COUNT(*) n FROM accounts')).n,l:(await c.db.get('SELECT COUNT(*) n FROM listings')).n,live:(await c.db.get("SELECT COUNT(*) n FROM listings WHERE status='live'")).n,c:conv,f:(await c.db.get('SELECT COUNT(*) n FROM files')).n};
for(const k of ['a','l','live','f'])console.log(k,before[k],after[k]);console.log(JSON.stringify(before.c)===JSON.stringify(after.c)?'conversations identical':JSON.stringify([before.c,after.c]));
console.log('bid',before.bidp,await c.db.get("SELECT price,bids FROM listings WHERE bids>0"));
console.log('counter',await c.db.get("SELECT * FROM counters WHERE key LIKE 'M.%' ORDER BY n DESC LIMIT 1"));
