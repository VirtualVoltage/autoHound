const {chromium,devices}=require('playwright');const U=process.argv[2],O=process.argv[3];
(async()=>{const b=await chromium.launch();for(const d of ['iPhone SE','iPhone 14']){const c=await b.newContext({...devices[d]});const p=await c.newPage();
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button');await p.waitForSelector('#headLinks a[href="/account"]');await p.goto(U);await p.waitForSelector('.window');await p.waitForTimeout(500);
const r=await p.evaluate(()=>({over:document.documentElement.scrollWidth-document.documentElement.clientWidth,clipped:[...document.querySelectorAll('#headLinks .btn')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)}));console.log(d,JSON.stringify(r));await p.screenshot({path:`${O}/admin-${d.replace(/ /g,'')}.png`});
await p.goto(U+'/admin');await p.waitForSelector('.mail-row');await p.waitForTimeout(300);console.log(d,'inbox over',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));await c.close();}
await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
