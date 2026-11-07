const {chromium,devices}=require('playwright');const U=process.argv[2],O=process.argv[3];
(async()=>{const b=await chromium.launch();for(const opt of [{viewport:{width:1300,height:900}},{...devices['iPhone 14']}]){const p=await (await b.newContext(opt)).newPage();
for(const path of ['/signup','/login']){await p.goto(U+path);await p.waitForSelector('#password');await p.evaluate(()=>document.activeElement.blur());await p.waitForTimeout(200);
console.log(opt.viewport?.width||'phone',path,await p.evaluate(()=>{const ids=[...document.querySelectorAll('#authForm input')].map(i=>i.id);const s=id=>{const c=getComputedStyle(document.getElementById(id));return [c.backgroundColor,c.borderTopColor,c.height,c.paddingLeft,c.fontSize,c.width].join('|')};const v=ids.map(s);return ids.join(',')+' same='+v.every(x=>x===v[0])+' '+v[0]}));
await p.screenshot({path:`${O}/auth${path.replace('/','-')}-${opt.viewport?.width||'phone'}.png`});}}
await b.close();})();
