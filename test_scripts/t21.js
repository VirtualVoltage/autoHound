const {chromium}=require('playwright');const U=process.argv[2],O=process.argv[3];
(async()=>{const b=await chromium.launch();const errs=[];
const login=async(name,pw)=>{const c=await b.newContext({viewport:{width:1300,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login',name);await p.fill('#password',pw);await p.click('#authForm button');await p.waitForSelector('#headLinks a[href="/account"]');return p;};
const p=await login('boost brandon','turbotime1');
await p.goto(U);await p.waitForSelector('.window');await p.waitForTimeout(600);
console.log('me',await p.evaluate(async()=>JSON.stringify((await (await fetch('/api/me')).json()).admin_inbox).slice(0,200)));
console.log('header',(await p.textContent('#headLinks')).replace(/\s+/g,' '),'| home strip',await p.locator('.admin-strip').count());
await p.screenshot({path:O+'/admin-home.png'});
await p.click('#headLinks a[href="/admin"]');await p.waitForSelector('.mail-row');console.log('inbox rows',await p.locator('.mail-row').count(),'| page text has E. ids',/E\.\d\d\./.test(await p.textContent('#main')));
console.log((await p.textContent('#main')).replace(/\s+/g,' ').slice(0,400));
await p.screenshot({path:O+'/admin-inbox.png'});
for(let i=0;i<3;i++){await p.locator('.mail-row').nth(i).click();await p.waitForSelector('.mail-body');console.log('---',(await p.textContent('.post-title')),'|',(await p.textContent('.attrs')).replace(/\s+/g,' '),'|',JSON.stringify(await p.textContent('.mail-body')),'| imgs in body',await p.locator('.mail-body img, .post-title img').count());if(i===1)await p.screenshot({path:O+'/admin-message.png',fullPage:true});await p.goBack?.();await p.goto(U+'/admin');await p.waitForSelector('.mail-row');}
const raw=await p.evaluate(async()=>{const id=document.querySelector('.mail-row').getAttribute('href').split('/').pop();const r=await fetch('/api/admin/inbox/'+id+'/raw');return [r.status,r.headers.get('content-disposition'),(await r.text()).slice(0,30)]});console.log('raw',raw);
console.log('unread after reading',await p.evaluate(async()=>(await (await fetch('/api/me')).json()).admin_inbox.unread));
const q=await login('k turbo kate','spool2fast');console.log('non-admin header',(await q.textContent('#headLinks')).includes('inbox'),'api',await q.evaluate(async()=>(await fetch('/api/admin/inbox')).status),'me admin',await q.evaluate(async()=>(await (await fetch('/api/me')).json()).account.admin));
await q.goto(U+'/admin');await q.waitForTimeout(800);console.log('non-admin page',(await q.textContent('#main')).replace(/\s+/g,' ').slice(0,60));
const anon=await (await b.newContext()).newPage();await anon.goto(U);await anon.waitForSelector('.window');console.log('anon api',await anon.evaluate(async()=>(await fetch('/api/admin/inbox')).status));
await b.close();console.log('errors',errs);})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
