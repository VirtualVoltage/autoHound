// Admin delete: only admins see the red button, it needs the admin's password, and the listing moves to backups.
const {chromium,devices}=require('playwright');const fs=require('fs'),path=require('path');const [U,STORE]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const login=async(p,u,pw)=>{await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login',u);await p.fill('#password',pw);await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');};
// a listing that isn't the admin's
const p=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await login(p,'redline riley','boost4life');
const me=await p.evaluate(()=>fetch('/api/me').then(r=>r.json()));ok(me.account.admin===true,'test admin is an admin');
const id=await p.evaluate(async myId=>{const d=await (await fetch('/api/listings?limit=100')).json();return d.listings.find(l=>l.seller.id!==myId).id},me.account.id);
await p.goto(U+'/listing/'+id);await p.waitForSelector('#adminDeleteBtn');ok(true,'admin sees Admin delete on someone else\'s listing');
const red=await p.$eval('#adminDeleteBtn',e=>({t:e.textContent,c:getComputedStyle(e).borderColor}));ok(red.t==='Admin delete'&&red.c==='rgb(255, 42, 42)','button is red and says Admin delete');
await p.click('#adminDeleteBtn');await p.waitForSelector('#adminPw');await p.fill('#adminPw','wrongpass');await p.click('#adminDeleteForm button[type=submit]');await p.waitForSelector('#adminDeleteErr:not([hidden])');
ok((await p.textContent('#adminDeleteErr')).includes('password isn'),'wrong password refused: '+await p.textContent('#adminDeleteErr'));
ok((await p.evaluate(id=>fetch('/api/listings/'+id).then(r=>r.status),id))===200,'listing still there after wrong password');
await p.screenshot({path:path.join(__dirname,'work','out','admin-delete.png')});
await p.fill('#adminPw','boost4life');await p.click('#adminDeleteForm button[type=submit]');await p.waitForURL(u=>new URL(u).pathname==='/');
ok((await p.evaluate(id=>fetch('/api/listings/'+id).then(r=>r.status),id))===404,'listing gone after the right password');
const browse=await p.evaluate(()=>fetch('/api/listings?limit=100').then(r=>r.json()));ok(!browse.listings.some(l=>l.id===id),'gone from browsing');
const files=require('child_process').execSync(`grep -rl '"removed_by_admin"' ${STORE}/records/backups/listings || true`).toString().trim();ok(files.includes(id),'moved to backups with removed_by_admin');
if(files){const j=JSON.parse(fs.readFileSync(files.split('\n')[0],'utf8'));ok(j.removed_by_admin.account===me.account.id&&j.status==='deleted','records which admin removed it');}
// not an admin
const q=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();await login(q,'boost brandon','turbotime1');
const other=await q.evaluate(async()=>{const me=(await (await fetch('/api/me')).json()).account.id;const d=await (await fetch('/api/listings?limit=100')).json();return d.listings.find(l=>l.seller.id!==me).id});
await q.goto(U+'/listing/'+other);await q.waitForSelector('#chatBox');ok(!(await q.$('#adminDeleteBtn')),'non-admin sees no Admin delete');
const st=await q.evaluate(id=>fetch(`/api/listings/${id}/admin-delete`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proof:'0'.repeat(64)})}).then(r=>r.status),other);ok(st===404,'server refuses non-admins ('+st+')');
const ph=await (await b.newContext(devices['iPhone 13'])).newPage();await login(ph,'redline riley','boost4life');await ph.goto(U+'/listing/'+other);await ph.waitForSelector('#adminDeleteBtn');ok(true,'phone shows Admin delete too');
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();process.exit(bad);})();
