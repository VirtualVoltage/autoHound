// profile3 look and switching
const {chromium,devices}=require('playwright');const U=process.argv[2],O=process.argv[3];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();const errs=[];
for(const [name,opt] of [['desktop',{viewport:{width:1300,height:900}}],['phone',{...devices['iPhone 14']}],['se',{...devices['iPhone SE']}]]){
const p=await (await b.newContext(opt)).newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/?profile=profile3');await p.waitForSelector('.window');await sleep(400);
console.log(name,'look',await p.evaluate(()=>window.AUTOHOUND_LOOK),'side',(await p.textContent('#sideNav')).replace(/\s+/g,' '));
await p.goto(U+'/login');await p.waitForSelector('#login');console.log(name,'side on login:',JSON.stringify(await p.textContent('#sideNav')),'visible',await p.locator('#sideNav').isVisible());
await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForFunction(()=>location.pathname==='/');await p.waitForSelector('.window');await sleep(400);
await p.screenshot({path:`${O}/p3-${name}-home.png`});
console.log(name,'header',(await p.textContent('#headLinks')).replace(/\s+/g,' '),'| overflow',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
await p.click('#sideNav a[href="/my-listings"]');await p.waitForSelector('.my-card');await sleep(300);console.log(name,'my listings',await p.locator('.my-card').count(),'current',await p.textContent('#sideNav .here'));await p.screenshot({path:`${O}/p3-${name}-mine.png`});
await p.click('#sideNav a[href="/account"]');await p.waitForSelector('#logoutBtn');await sleep(300);console.log(name,'settings has listings grid',await p.locator('#main .windows').count(),'security',await p.locator('.security').count());await p.screenshot({path:`${O}/p3-${name}-account.png`});
await p.goto(U+'/?profile=default');await p.waitForSelector('.window');console.log(name,'back to',await p.evaluate(()=>window.AUTOHOUND_PROFILE),'side nav present',await p.locator('#sideNav').count());}
const q=await (await b.newContext()).newPage();await q.goto(U);await q.waitForSelector('.window');console.log('fresh visitor gets',await q.evaluate(()=>window.AUTOHOUND_PROFILE));
await q.goto(U+'/?profile=../evil');await q.waitForSelector('.window');console.log('bad name ignored',await q.evaluate(()=>window.AUTOHOUND_PROFILE));
await b.close();console.log('errors',errs);})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
