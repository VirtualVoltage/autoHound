const {chromium}=require('playwright');const U='http://127.0.0.1:8799';
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();
await p.goto(U+'/login');await p.waitForSelector('#login',{timeout:120000});await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button');await p.waitForTimeout(2000);console.log('old account login',await p.locator('#headLinks a[href="/account"]').count()===1);
await p.evaluate(async()=>fetch('/api/logout',{method:'POST'}));
await p.goto(U+'/signup');await p.waitForSelector('#email');await p.fill('#username','after migration');await p.fill('#email','after_migration@example.com');await p.fill('#password','secret12');await p.click('#authForm button');await p.waitForFunction(()=>location.pathname==='/',{timeout:15000}).catch(()=>{});
console.log('new signup',await p.evaluate(async()=>(await (await fetch('/api/me')).json()).account?.email));
await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
