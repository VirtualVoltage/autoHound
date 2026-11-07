const {chromium,devices}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext(devices['iPhone 13'])).newPage();
await p.goto(U+'/');await p.waitForSelector('.window');const title=await p.textContent('.main-title');
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
const before=(await p.evaluate(()=>fetch('/api/favorites').then(r=>r.json()))).ids.length;
await p.tap('.window .star');await p.waitForTimeout(600);
const after=(await p.evaluate(()=>fetch('/api/favorites').then(r=>r.json()))).ids.length;
await p.tap('#sideNav a[href="/saved"]');await p.waitForURL(/\/saved$/);await p.waitForFunction(()=>document.querySelector('.main-title')?.textContent==='Saved');
console.log({title,before,after,page:await p.textContent('.main-title'),windows:(await p.$$('.window')).length});await b.close();})();
