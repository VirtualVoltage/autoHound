// Required email confirmation: no skip button, pages redirect to /verify, the server refuses posts until the code is in.
const {chromium}=require('playwright');const fs=require('fs');const [U,LOG]=process.argv.slice(2);
const codeFor=to=>{const m=[...fs.readFileSync(LOG,'utf8').matchAll(new RegExp('EMAIL to='+to.replace(/[.+]/g,'\\$&')+' subject=Your Autohound code: (\\d{6})','g'))];return m.length?m[m.length-1][1]:null};
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const p=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const n=Date.now()%100000,email=`must${n}@example.com`;
await p.goto(U+'/signup');await p.waitForSelector('#email');await p.fill('#username','must confirm '+n);await p.fill('#email',email);await p.fill('#password','secret12');await p.click('#authForm button[type=submit]');
await p.waitForURL(/\/verify/);await p.waitForSelector('#verifyForm');
ok(!/skip/i.test(await p.textContent('#verifyForm')),'no Skip button');ok(!!(await p.$('#verifyForm a[href="/account"]')),'Wrong email? Fix it link');
await p.goto(U+'/');await p.waitForURL(/\/verify\?next=/);ok(true,'home sends you back to confirm');
await p.goto(U+'/sell');await p.waitForURL(/\/verify\?next=%2Fsell/);ok(true,'sell page sends you back to confirm');
const r=await p.evaluate(()=>fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'L.26.10.18.00000'})}).then(async r=>({s:r.status,e:(await r.json()).error})));ok(r.s===403&&/Confirm your email/.test(r.e),'server refuses saving: '+r.e);
await p.goto(U+'/account');await p.waitForSelector('#emailForm');ok(true,'account settings still opens to fix the email');
await p.goto(U+'/verify');await p.waitForSelector('#code');const code=codeFor(email);ok(/^\d{6}$/.test(code||''),'code emailed');
await p.fill('#code',code);await p.click('#verifyForm button[type=submit]');await p.waitForFunction(()=>location.pathname!=='/verify',{timeout:10000});
await p.goto(U+'/sell');await p.waitForSelector('#sellForm');ok(true,'after confirming, the site opens normally');
const r2=await p.evaluate(()=>fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'L.26.10.18.00000'})}).then(r=>r.status));ok(r2===200,'saving works after confirming');
const q=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();await q.goto(U+'/login');await q.waitForSelector('#login');await q.fill('#login','boost brandon');await q.fill('#password','turbotime1');await q.click('#authForm button[type=submit]');await q.waitForSelector('.window');await q.goto(U+'/sell');await q.waitForSelector('#sellForm');ok(true,'older account with no email is not blocked');
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();process.exit(bad);})();
