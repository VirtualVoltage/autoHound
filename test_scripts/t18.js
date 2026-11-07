// email privacy and duplicates, run after t6 against the same server
const {chromium}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();const c=await b.newContext();const p=await c.newPage();
await p.goto(U+'/signup');await p.waitForSelector('#email');await p.fill('#username','dupe email person');await p.fill('#email','TESTER_ONE+CARS@example.com');await p.fill('#password','secret12');await p.click('#authForm button');await p.waitForTimeout(1500);console.log('duplicate email:',await p.textContent('#authErr'));
await p.fill('#email','second_person@example.com');await p.click('#authForm button');await p.waitForFunction(()=>location.pathname==='/verify',{timeout:15000});await p.click('#verifyForm a.btn');await p.waitForFunction(()=>location.pathname==='/',{timeout:15000});
const me=await p.evaluate(async()=>(await (await fetch('/api/me')).json()).account);console.log('me has email',me.email);
await p.goto(U+'/account');await p.waitForSelector('#logoutBtn');console.log('account page shows email',(await p.textContent('#main')).includes('second_person@example.com'));
const pub=await p.evaluate(async id=>JSON.stringify(await (await fetch('/api/accounts/'+id)).json()),me.id);console.log('public profile leaks email',pub.includes('@'));
const home=await p.evaluate(async()=>JSON.stringify(await (await fetch('/api/listings?limit=100')).json()));console.log('listings leak email',home.includes('example.com'));
await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
