const {chromium,devices}=require('playwright');const U=process.argv[2],O=process.argv[3];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();const errs=[];
const ctx=async(opt={viewport:{width:1300,height:900}})=>{const c=await b.newContext(opt);const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));return p};
const login=async(p,l,pw)=>{await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login',l);await p.fill('#password',pw);await p.click('#authForm button[type=submit]');await p.waitForSelector('#headLinks a[href="/messages"]');};
// buyer starts a chat on one of k turbo kate's listings, with a photo attachment
const kate=await ctx();await login(kate,'k turbo kate','spool2fast');
const lid=await kate.evaluate(async()=>{const d=await (await fetch('/api/me')).json();const a=await (await fetch('/api/accounts/'+d.account.id)).json();return a.listings.find(l=>l.sell_type==='post').id});
const buyer=await ctx();await login(buyer,'boost brandon','turbotime1');await buyer.goto(U+'/listing/'+lid);await buyer.waitForSelector('#msgForm');await buyer.fill('#msgText','Does this fit an Evo 8?');await buyer.click('#msgForm button');await buyer.waitForSelector('#composer');
await buyer.setInputFiles('#attachInput',O+'/up_a.jpg');await sleep(1500);await buyer.fill('#composer textarea','photo of my car');await buyer.click('#composer button[type=submit]');await sleep(1200);const cid=buyer.url().split('/').pop();
// owner edits: new title, price, description
await kate.goto(U+'/listing/'+lid);await kate.waitForSelector('a[href$="/edit"]');console.log('owner sees edit',true);
await kate.click('a[href$="/edit"]');await kate.waitForSelector('#editForm');await kate.screenshot({path:O+'/edit.png'});
await kate.fill('#eTitle','Bitchin coilovers');await kate.click('#editForm button[type=submit]');await sleep(800);console.log('profane edit:',await kate.textContent('#editErr'));
await kate.fill('#eTitle','Renamed orange coilovers, front pair');await kate.fill('#ePrice','399');await kate.fill('#eDesc','Edited description. Still fits Evo 8 and 9.');await kate.click('#editForm button[type=submit]');await kate.waitForFunction(id=>location.pathname==='/listing/'+id,lid);await sleep(500);
console.log('after edit:',(await kate.textContent('.post-title')),'|',(await kate.textContent('.post-price')),'|',(await kate.textContent('.body-text')));
console.log('photos load',await kate.evaluate(async()=>{const imgs=[...document.querySelectorAll('#mainPhoto img,#thumbs img')];await new Promise(r=>setTimeout(r,800));return imgs.length+' '+imgs.every(i=>i.complete&&i.naturalWidth>0)}));
await buyer.goto(U+'/messages/'+cid);await buyer.waitForSelector('#thread');await sleep(800);console.log('chat after rename: bubbles',await buyer.locator('.bubble').count(),'attachment loads',await buyer.evaluate(()=>{const i=document.querySelector('.bubble img');return !!i&&i.complete&&i.naturalWidth>0}),'| head',(await buyer.textContent('.thread-head b')));
console.log('search finds new title',await buyer.evaluate(async()=>(await (await fetch('/api/listings?q=renamed')).json()).listings.length));
console.log('stranger edit',await buyer.evaluate(async id=>(await fetch('/api/listings/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'edit',title:'hacked title here'})})).status,lid));
// auction with bids: price locked
const auc=await kate.evaluate(async()=>{const d=await (await fetch('/api/me')).json();const a=await (await fetch('/api/accounts/'+d.account.id)).json();return a.listings.find(l=>l.sell_type==='auction')});
if(auc){console.log('auction',auc.bids,'bids');} 
const r2=await (await ctx()).evaluate(()=>1);
await b.close();console.log('errors',errs);})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
