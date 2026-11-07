const {chromium}=require('playwright');const {DatabaseSync}=require('node:sqlite');const fs=require('fs'),path=require('path');
const O=process.argv[2],U=process.argv[3],DIR=process.argv[4];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const db=f=>{const d=new DatabaseSync(path.join(DIR,'index.sqlite'));const r=f(d);d.close();return r};
const tree=(p,base=p,o=[])=>{for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())tree(f,base,o);else o.push(path.relative(base,f))}return o};
(async()=>{
 const b=await chromium.launch();const errs=[];
 const mk=async(n,vp={width:1300,height:900})=>{const c=await b.newContext({viewport:vp});const p=await c.newPage();p.on('pageerror',e=>errs.push(n+': '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_|40[0-9]|429/.test(m.text()))errs.push(n+' c: '+m.text())});return p};
 const A=await mk('A'),B=await mk('B');
 await A.goto(U);await A.waitForSelector('.window',{timeout:60000});await sleep(500);
 console.log('windows',await A.locator('.window').count(),'broken',await A.evaluate(()=>[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)));
 await A.screenshot({path:O+'/home.png',fullPage:true});
 // filters and search
 await A.fill('#maxPrice','100');await sleep(800);const cheap=await A.locator('.window .money').allTextContents();console.log('max100',cheap.length,cheap.every(t=>+t.replace(/[$,]/g,'')<=100));
 await A.fill('#maxPrice','');await sleep(800);await A.click('[data-sort=low]');await sleep(500);const sorted=(await A.locator('.window .money').allTextContents()).map(t=>+t.replace(/[$,]/g,''));console.log('low sorted',sorted.every((v,i)=>!i||sorted[i-1]<=v));
 await A.fill('#searchInput','coilovers');await A.press('#searchInput','Enter');await sleep(600);console.log('search',await A.locator('.window').count(),await A.textContent('h1'));
 await A.fill('#searchInput','');await A.press('#searchInput','Enter');await sleep(500);
 console.log('dropdowns on home',await A.locator('main select').count());
 // signup rules
 await A.goto(U+'/signup');await A.waitForSelector('#username');
 const su=async(u,p,e='tester_one@example.com')=>{await A.fill('#username',u);await A.fill('#email',e);await A.fill('#password',p);await A.click('#authForm button');await sleep(200);return (await A.locator('#authErr').isVisible())?await A.textContent('#authErr'):'ok'};
 console.log('short user:',await su('abc','secret1'));console.log('short pass:',await su('abcdef','abc'));console.log('long pass:',await su('abcdef','a'.repeat(16)));console.log('long user:',await su('x'.repeat(41),'secret1'));
 console.log('taken:',await su('Redline Riley','secret1'));console.log('no email:',await su('email tester','secret1',''));console.log('space email:',await su('email tester','secret1','zack crab@gmail.com'));console.log('bad email:',await su('email tester','secret1','zack@gmail'));console.log('underscore:',await su('abc_defg','secret1'));
 await A.fill('#username','<b>bad</b> név 🚗/..');await A.fill('#email','  Tester_One+cars@Example.com ');await A.fill('#password','p@ss w0rd');await A.click('#authForm button');await A.waitForFunction(()=>location.pathname==='/verify',{timeout:15000});await A.click('#verifyForm a.btn');await A.waitForFunction(()=>location.pathname==='/',{timeout:15000});await sleep(400);console.log('signed up',await A.textContent('#headLinks'));
 // sell with photos
 await A.click('#sideNav a[href="/sell"]');await A.waitForSelector('#sellForm');await A.setInputFiles('#sPhotos',[O+'/up_a.jpg',O+'/up_b.jpg']);await sleep(1200);console.log('photos',await A.locator('.up-photo').count());
 await A.fill('#sTitle','Test __ coilovers <i>x</i>');await A.selectOption('#sCategory','Suspension');await A.fill('#sPrice','700');await A.fill('#sFit','1G DSM');await A.fill('#sDesc','Came off my car with no leaks at all.');await A.selectOption('#sCity','Sumas');await A.screenshot({path:O+'/sell.png',fullPage:true});
 await A.click('#pubBtn');await A.waitForFunction(()=>location.pathname.startsWith('/listing/'),{timeout:15000});await sleep(400);const lid=A.url().split('/').pop();console.log('published',lid,await A.textContent('.post-title'),'thumbs',await A.locator('.thumbs button').count());await A.screenshot({path:O+'/listing.png'});
 // B logs in as demo seller? B is logged out: sees listing, cannot message without login
 await B.goto(U+'/listing/'+lid);await B.waitForSelector('#chatBox');await B.fill('#msgText','hello');await B.click('#composer button[type=submit]');await B.waitForFunction(()=>location.pathname==='/login');
 await B.fill('#login','k turbo kate');await B.fill('#password','wrong-pass');await B.click('#authForm button');await sleep(500);console.log('bad login:',await B.textContent('#authErr'));
 await B.fill('#password','spool2fast');await B.click('#authForm button');await B.waitForFunction(()=>location.pathname.startsWith('/listing/'),{timeout:10000});await B.waitForSelector('#chatBox');console.log('demo login ok',await B.textContent('#headLinks'));
 await B.fill('#msgText','Is this still available? Can you do 650?');await B.click('#composer button[type=submit]');await B.waitForSelector('#thread .bubble',{timeout:10000});await sleep(300);const cid=(await B.evaluate(async id=>(await (await fetch('/api/listings/'+id)).json()).listing.chat,lid));console.log('chat',cid);
 await A.goto(U+'/messages');await A.waitForSelector('.inbox-row');console.log('seller inbox',(await A.textContent('.inbox-row')).replace(/\s+/g,' ').slice(0,90),'unread',await A.locator('.inbox-row.unread').count());await A.click('.inbox-row');await A.waitForSelector('#composer');await A.fill('#msgText','Yes it is, $650 works. Rust spot photo attached.');await A.setInputFiles('#attachInput',O+'/up_b.jpg');await sleep(900);await A.setInputFiles('#attachInput',O+'/doc.pdf');await sleep(700);await A.click('#composer button');await sleep(500);
 await sleep(5600);console.log('B sees',await B.locator('.bubble').count(),'order',(await B.locator('.bubble p').allTextContents()).map(t=>t.slice(0,12)),'pdf link',await B.locator('.bubble a.btn').count(),'attach img ok',await B.evaluate(()=>[...document.querySelectorAll('.bubble img')].every(i=>i.complete&&i.naturalWidth>0)));await B.screenshot({path:O+'/thread.png'});
 // outsider cannot read chat or photo
 const C=await mk('C');await C.goto(U);const pid=db(d=>d.prepare("SELECT id FROM files WHERE conversation_id=?").get(cid).id);console.log('outsider chat',(await C.request.get(U+'/api/conversations/'+cid)).status(),'photo',(await C.request.get(U+'/api/files/'+pid)).status(),'private served?',(await C.request.get(U+'/records/accounts/')).status());
 console.log('page has id text',(await B.textContent('main')).includes('L.26.'),(await A.textContent('body')).includes('A.26.'));const lp=db(d=>d.prepare('SELECT path,data_path FROM listings WHERE id=?').get(lid));
 console.log('--- listing tree');console.log(tree(path.join(DIR,lp.path)).join('\n'));console.log('--- data tree');console.log(tree(path.join(DIR,lp.data_path)).join('\n'));
 const conv=db(d=>d.prepare('SELECT * FROM conversations WHERE id=?').get(cid));console.log('title folder',lp.path.split('/').pop());console.log('--- files');console.log(fs.readFileSync(path.join(DIR,conv.path,'conversation.json'),'utf8'));console.log(fs.readFileSync(path.join(DIR,conv.path,conv.seller_id+'.jsonl'),'utf8'));
 // fluid: rename label + file
 const phId=db(d=>d.prepare('SELECT photo FROM listings WHERE id=?').get(lid).photo),fp=db(d=>d.prepare('SELECT path FROM files WHERE id=?').get(phId).path);
 const nf=fp.replace(/__[^/]*$/,'__renamed_by_hand');fs.renameSync(path.join(DIR,fp),path.join(DIR,nf));fs.renameSync(path.join(DIR,nf,'original.jpg'),path.join(DIR,nf,'zzz name.jpg'));console.log('renamed photo status',(await C.request.get(U+'/api/files/'+phId)).status());
 // 7 day backup
 const old=Date.now()-8*864e5;
 const age=(p,when)=>{for(const f of fs.readdirSync(path.join(DIR,p)).filter(x=>x.endsWith('.jsonl'))){const fl=path.join(DIR,p,f);fs.writeFileSync(fl,fs.readFileSync(fl,'utf8').replace(/"\d{4}-\d\d-\d\dT[^"]+Z"/g,JSON.stringify(new Date(when).toISOString())))}db(d=>d.prepare('UPDATE conversations SET last_activity=? WHERE id=?').run(when,cid))};
 // index says expired but files say recent: must not back up
 db(d=>d.prepare('UPDATE conversations SET last_activity=? WHERE id=?').run(old,cid));await A.goto(U+'/messages');await sleep(800);console.log('index stale, files recent -> kept',fs.existsSync(path.join(DIR,conv.path)),await A.locator('.inbox-row').count());
 age(conv.path,old);
 await A.goto(U+'/messages');await sleep(900);console.log('after 7 days inbox',await A.locator('.inbox-row').count());
 console.log('live folder gone',!fs.existsSync(path.join(DIR,conv.path)));const root=path.join(DIR,'records/backups/conversations');console.log(tree(path.join(DIR,'records/backups')).join('\n'));console.log(tree(path.join(DIR,'data/backups')).join('\n'));console.log('top data',fs.readdirSync(path.join(DIR,'data')),'top accounts',fs.readdirSync(path.join(DIR,'data/accounts')));
 // talk again -> same ID, backup2
 await B.goto(U+'/listing/'+lid);await B.waitForSelector('#chatBox');await B.fill('#msgText','Hey I am back, still have it?');await B.click('#composer button[type=submit]');await B.waitForSelector('#thread .bubble');console.log('reopened same id',(await B.evaluate(async id=>(await (await fetch('/api/listings/'+id)).json()).listing.chat,lid))===cid);await sleep(300);console.log('fresh chat bubbles',await B.locator('.bubble').count());
 const cp2=db(d=>d.prepare('SELECT path FROM conversations WHERE id=?').get(cid).path);age(cp2,old);await A.goto(U+'/messages');await sleep(800);console.log('backup folders',tree(root).map(x=>x.split('/').slice(2,3)[0]).filter((v,i,a)=>a.indexOf(v)===i));
 // third round: every message resets timer
 await B.goto(U+'/listing/'+lid);await B.waitForSelector('#chatBox');await B.fill('#msgText','Third time asking about this.');await B.click('#composer button[type=submit]');await B.waitForSelector('#thread .bubble');await sleep(300);
 const cp3=db(d=>d.prepare('SELECT path FROM conversations WHERE id=?').get(cid).path);age(cp3,Date.now()-6.9*864e5);await B.fill('#msgText','bump');await B.click('#composer button');await sleep(500);console.log('timer reset',db(d=>d.prepare('SELECT last_activity FROM conversations WHERE id=?').get(cid).last_activity)>Date.now()-60000);
 // sold -> moves to active, still in inbox
 await A.goto(U+'/listing/'+lid);await A.waitForSelector('#soldBtn');await A.click('#soldBtn');await sleep(800);const c2=db(d=>d.prepare('SELECT status,path FROM conversations WHERE id=?').get(cid));console.log('after sold',c2,'snapshot',fs.existsSync(path.join(DIR,c2.path,'listing.snapshot.json')));await A.goto(U+'/messages');await sleep(500);console.log('still in inbox',await A.locator('.inbox-row').count());await A.click('.inbox-row');await A.waitForSelector('#composer');await A.fill('#msgText','Pick up Saturday?');await A.click('#composer button');await sleep(400);console.log('can still message',await A.locator('.bubble').count());
 await A.goto(U+'/');await A.waitForSelector('.window');console.log('sold hidden from home',(await A.locator('.window h3').allTextContents()).filter(t=>t.startsWith('Test')).length);
 // auction bid
 const auc=db(d=>d.prepare("SELECT id FROM listings WHERE sell_type='auction' AND account_id!=(SELECT id FROM accounts WHERE username='k turbo kate') LIMIT 1").get().id);await B.goto(U+'/listing/'+auc);await B.waitForSelector('#bidForm');await B.fill('#bidAmt','1');await B.click('#bidForm button');console.log('low bid',await B.textContent('#bidErr'));await B.fill('#bidAmt','99999');await B.click('#bidForm button');await sleep(700);console.log('bid price',await B.textContent('.big-price'));
 // favorite & profile
 await B.goto(U+'/');await B.waitForSelector('.window .star');await B.click('.window .star');await sleep(300);await B.goto(U+'/favorites');await B.waitForSelector('.window');console.log('favorites',await B.locator('.window').count());
 await B.goto(U+'/account');await B.waitForSelector('#logoutBtn');await B.setInputFiles('#photoInput',O+'/up_a.jpg');await sleep(900);await B.screenshot({path:O+'/account.png'});
 await B.click('#logoutBtn');await sleep(400);console.log('logged out',await B.textContent('#headLinks'));
 // snapshot for rebuild comparison
 const snap=()=>db(d=>({a:d.prepare('SELECT COUNT(*) n FROM accounts').get().n,l:d.prepare('SELECT COUNT(*) n FROM listings').get().n,live:d.prepare("SELECT COUNT(*) n FROM listings WHERE status='live'").get().n,c:d.prepare("SELECT id,status,backups,last_id,path FROM conversations").all(),f:d.prepare('SELECT COUNT(*) n FROM files').get().n,bidp:d.prepare('SELECT price,bids FROM listings WHERE id=?').get(auc)}));
 fs.writeFileSync(O+'/before.json',JSON.stringify(snap(),null,1));
 // phone
 const ph=await mk('phone',{width:400,height:800});await ph.goto(U);await ph.waitForSelector('.window');await sleep(300);console.log('phone overflow',await ph.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]));await ph.screenshot({path:O+'/phone.png'});await ph.goto(U+'/signup');await ph.waitForSelector('#username');await ph.screenshot({path:O+'/phone-signup.png'});
 console.log('errors',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
