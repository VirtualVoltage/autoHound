const {chromium}=require('playwright');const fs=require('fs');const U=process.argv[2],LOG=process.argv[3];
const codeFor=to=>{const m=[...fs.readFileSync(LOG,'utf8').matchAll(new RegExp('EMAIL to='+to.replace(/[.+]/g,'\\$&')+' subject=Your Autohound code: (\\d{6})','g'))];return m.length?m[m.length-1][1]:null};
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const email='code_tester'+Date.now()%10000+'@example.com';
await p.goto(U+'/signup');await p.waitForSelector('#email');await p.fill('#username','code tester '+Date.now()%10000);await p.fill('#email',email);await p.fill('#password','secret12');await p.click('#authForm button');
await p.waitForFunction(()=>location.pathname==='/verify');await p.waitForSelector('#verifyForm');console.log('verify page',(await p.textContent('#verifyForm')).replace(/\s+/g,' ').slice(0,140));
await p.waitForTimeout(300);const code=codeFor(email);console.log('code emailed',/^\d{6}$/.test(code||''),'from line',fs.readFileSync(LOG,'utf8').includes('support@autohound.online'));
await p.fill('#code','000000'===code?'111111':'000000');await p.click('#verifyForm button[type=submit]');await p.waitForTimeout(800);console.log('wrong code:',await p.textContent('#verifyErr'));
await p.click('#resendBtn');await p.waitForTimeout(800);console.log('resend too soon:',await p.textContent('#verifyErr'));
await p.fill('#code',code);await p.click('#verifyForm button[type=submit]');await p.waitForFunction(()=>location.pathname==='/',{timeout:10000});
console.log('me verified',await p.evaluate(async()=>(await (await fetch('/api/me')).json()).account.email_verified),'home strip',await p.locator('.verify-strip').count());
// unverified reminder on home for an account that skips
const q=await (await b.newContext()).newPage();await q.goto(U+'/signup');await q.waitForSelector('#email');await q.fill('#username','skip tester '+Date.now()%10000);await q.fill('#email','skip_'+email);await q.fill('#password','secret12');await q.click('#authForm button');await q.waitForFunction(()=>location.pathname==='/verify');await q.click('#verifyForm a.btn');await q.waitForSelector('.window');console.log('skipper sees strip',await q.locator('.verify-strip').count());
// listing message box is empty
await q.click('.window h3 a');await q.waitForSelector('#msgText');console.log('message box text',JSON.stringify(await q.inputValue('#msgText')),'placeholder',await q.getAttribute('#msgText','placeholder'));
await b.close();console.log('errors',errs);})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
