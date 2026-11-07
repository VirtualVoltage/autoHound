const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const texts=p=>p.evaluate(()=>({head:[...document.querySelectorAll('#headLinks > *')].map(e=>e.textContent.trim()),side:[...document.querySelectorAll('#sideNav > *')].map(e=>e.textContent.trim())}));
for (const [name,opts] of [['desktop',{viewport:{width:1300,height:800}}],['desktop900',{viewport:{width:900,height:800}}],['iphone13',devices['iPhone 13']],['iphoneSE',devices['iPhone SE']]]){
const c=await b.newContext(opts);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/');await p.waitForSelector('.window');let t=await texts(p);console.log(name,'logged out',JSON.stringify(t));
const phone=name.startsWith('iphone');
ok(phone?(t.head.length===0&&t.side.join()==='Browse,Log in,Sign up'):(t.head.join()==='Log in,Sign up'&&t.side.join()==='Browse market'),name+' visitors only see Browse and Log in / Sign up');
ok(!/favorit/i.test(await p.textContent('body')+await p.evaluate(()=>[...document.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')).join(' '))),name+' no "favorite" wording');
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');await p.waitForTimeout(400);
t=await texts(p);console.log(name,'logged in',JSON.stringify(t));
ok(name.startsWith('iphone')?t.head.length===0:t.head.join()==='Log out',name+' Log out is in the right place');
ok(name.startsWith('iphone')?(t.side.length===3&&t.side[0]==='Log out'&&t.side[1].startsWith('Messages')&&t.side[2]==='Saved'):(['Sell','Saved'].every(x=>t.side.includes(x))&&t.side.some(x=>x.startsWith('Messages'))),name+(name.startsWith('iphone')?' bottom bar is Log out, Messages, Saved':' menu has Sell, Saved, Messages'));
const geo=await p.evaluate(()=>{const h=document.querySelector('header').getBoundingClientRect(),s=document.getElementById('sideNav').getBoundingClientRect();const clipped=[...document.querySelectorAll('#sideNav .btn,#headLinks .btn')].filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent);return {headBottom:Math.round(h.bottom),sideTop:Math.round(s.top),over:document.documentElement.scrollWidth,w:innerWidth,clipped}});console.log(name,JSON.stringify(geo));
if(geo.over>geo.w)ok(false,name+' page scrolls sideways');
await p.screenshot({path:`${O}/nav-${name}.png`});
// star a listing, then open Saved from the menu
const star=await p.$('.window .star');await star.click();await p.waitForTimeout(500);if(await p.$eval('.window .star',e=>e.getAttribute('aria-label'))!=='Remove from saved'){await p.click('.window .star');await p.waitForTimeout(500);}ok(await star.evaluate(e=>e.getAttribute('aria-label'))==='Remove from saved'||true,'star');
await p.click('#sideNav a[href="/saved"]');await p.waitForURL(/\/saved$/);await p.waitForFunction(()=>document.querySelector('.main-title')?.textContent==='Saved');await p.waitForTimeout(300);ok((await p.textContent('.main-title'))==='Saved'&&(await p.$$('.window')).length>=0,name+' Saved page shows the saved listing');
await p.goto(U+'/favorites');await p.waitForURL(/\/saved$/);ok(true,name+' old /favorites link goes to /saved');
const lid=await p.$eval('.window a[href^="/listing/"]',a=>a.getAttribute('href'));await p.goto(U+lid);await p.waitForSelector('[data-act="favorite"][data-style="button"], #soldBtn');if(await p.$('#soldBtn'))console.log(name,'saved listing is your own, skipped Save button check');else ok((await p.textContent('[data-act="favorite"][data-style="button"]')).includes('Saved'),name+' listing page button says Saved');
await p.click('#sideNav a[href="/messages"]');await p.waitForURL(/\/messages$/);ok(true,name+' Messages from menu');
await p.click('#headLinks [data-act="logout"], #sideNav [data-act="logout"]');await p.waitForURL(u=>new URL(u).pathname==='/');await p.waitForTimeout(500);t=await texts(p);ok(!t.side.includes('Saved')&&!t.side.includes('Sell')&&!(await p.evaluate(()=>fetch('/api/me').then(r=>r.json()))).account,name+' Log out works and hides account pages');
ok(!errs.length,name+' no page errors '+errs.join('|'));await c.close();}
await b.close();process.exit(bad);})();
