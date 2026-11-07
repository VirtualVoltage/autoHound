const {chromium}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1300,height:800}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
await p.goto(U+'/account');await p.waitForSelector('#emailForm');const label=await p.textContent('#emailForm span');
const e='riley.'+Date.now()%100000+'@example.com';await p.fill('#newEmail',e);await p.click('#emailForm button');await p.waitForURL(/\/verify/,{timeout:10000});await p.waitForTimeout(600);
const verifyText=(await p.textContent('main')).replace(/\s+/g,' ').slice(0,160);
const st=await p.evaluate(()=>fetch('/api/me/email').then(r=>r.json()));
await p.goto(U+'/account');await p.waitForSelector('#emailForm');const label2=await p.textContent('#emailForm span');
console.log({label,st,verifyText,label2,errs});await b.close();process.exit(st.email===e&&!errs.length?0:1);})();
