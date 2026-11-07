// profile3 phones: square magnifying-glass search button, waffle button that opens the slide-out menu.
const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
for (const [name,dev] of [['iphone13',devices['iPhone 13']],['iphoneSE',devices['iPhone SE']]]){
const p=await (await b.newContext(dev)).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');await p.waitForTimeout(400);
const g=await p.evaluate(()=>{const r=s=>{const x=document.querySelector(s).getBoundingClientRect();return {x:Math.round(x.left),w:Math.round(x.width),h:Math.round(x.height),r:Math.round(x.right)}};return {waffle:r('.waffle'),map:r('.map-btn'),input:r('#searchInput'),go:r('#searchForm button[type=submit]'),text:document.querySelector('#searchForm button[type=submit]').textContent.trim(),vw:innerWidth,sw:document.documentElement.scrollWidth}});
console.log(name,JSON.stringify(g));
ok(g.go.w===g.go.h&&g.waffle.w===g.waffle.h,name+' search and waffle buttons are square');ok(g.text==='','no Search text');
ok(g.waffle.x<g.map.x&&g.map.x<g.input.x&&g.input.x<g.go.x&&g.go.r<=g.vw&&g.sw<=g.vw,name+' waffle, Map, box, glass fit in one row');
await p.screenshot({path:`${O}/waffle-${name}-closed.png`,clip:{x:0,y:0,width:dev.viewport.width,height:240}});
await p.tap('.waffle');await p.waitForSelector('#drawer:not([hidden])');await p.waitForTimeout(200);
const items=await p.$$eval('#drawerNav a',a=>a.map(x=>x.textContent.trim()));console.log(name,'menu',items);
ok(items.includes('Browse market')&&items.includes('My listings')&&items.includes('Account settings')&&items.includes('Saved'),name+' menu has the desktop pages');
await p.screenshot({path:`${O}/waffle-${name}-open.png`});
await p.tap('#drawerNav a[href="/saved"]');await p.waitForURL(/\/saved$/);await p.waitForTimeout(300);ok(await p.$eval('#drawer',d=>d.hidden)&&!(await p.evaluate(()=>document.body.classList.contains('menu-open'))),name+' menu closes after picking a page');
await p.tap('.waffle');await p.waitForSelector('#drawer:not([hidden])');await p.tap('.drawer-back',{position:{x:dev.viewport.width-20,y:300}});await p.waitForTimeout(200);ok(await p.$eval('#drawer',d=>d.hidden),name+' tapping outside closes it');
await p.tap('.waffle');await p.keyboard.press('Escape');await p.waitForTimeout(150);ok(await p.$eval('#drawer',d=>d.hidden),name+' Escape closes it');
await p.fill('#searchInput','coilovers');await p.tap('#searchForm button[type=submit]');await p.waitForTimeout(800);ok((await p.textContent('.main-title')).includes('coilovers'),name+' magnifying glass searches');
ok(!errs.length,name+' no page errors '+errs.join('|'));}
await b.close();process.exit(bad);})();
