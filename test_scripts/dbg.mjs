import {nodeContext} from '/home/claude/autohound/server/adapters/node.js';
const c=nodeContext({dir:'/home/claude/autohound/test_scripts/work/store',siteDir:'site'});
const rows=await c.db.all("SELECT l.id,l.status,l.photo,f.path FROM listings l LEFT JOIN files f ON f.id=l.photo WHERE l.account_id LIKE 'A.26.11%'");console.log(rows);
const r=rows[0];console.log('files',await c.store.listFiles(r.path));const parent=r.path.slice(0,r.path.lastIndexOf('/'));console.log(await c.store.listFolders(parent));
