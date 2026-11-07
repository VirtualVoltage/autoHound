const {chromium,devices}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone SE']});const p=await c.newPage();
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button');await p.waitForSelector('#headLinks a[href="/account"]');await p.goto(U);await p.waitForSelector('.mail-row');
console.log(await p.evaluate(()=>{const r=document.querySelector('.mail-row'),cs=getComputedStyle(r);return {cls:r.className,display:cs.display,cols:cs.gridTemplateColumns,kids:[...r.children].map(k=>[k.className,k.getBoundingClientRect().left|0,k.getBoundingClientRect().width|0]),css:document.querySelector('link[rel=stylesheet]').href}}));
await b.close();})();
