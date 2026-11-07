const {chromium,devices}=require('playwright');const fs=require('fs');const [U,LOG,STORE]=process.argv.slice(2);
const codeFor=to=>{const m=[...fs.readFileSync(LOG,'utf8').matchAll(new RegExp('EMAIL to='+to.replace(/[.+]/g,'\\$&')+' subject=Your Autohound code: (\\d{6})','g'))];return m.length?m[m.length-1][1]:null};
const findAcct=name=>{const r=require('child_process').execSync(`grep -rl '"username": *"${name}"' ${STORE}/records/accounts --include=account.json`).toString().trim().split('\n')[0];return JSON.parse(fs.readFileSync(r,'utf8'))};
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
for (const [dev,opts,user,pass] of [['desktop',{viewport:{width:1300,height:800}},'boost brandon','turbotime1'],['phone',devices['iPhone 13'],'k turbo kate','spool2fast']]){
const p=await (await b.newContext(opts)).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');
ok((await p.textContent('label.field span'))==='Email or username', dev+' login label');
ok(await p.getAttribute('#login','type')==='text', dev+' login box takes spaces');
await p.fill('#login',user);await p.fill('#password',pass);await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
await p.goto(U+'/account');await p.waitForSelector('#emailForm');
ok((await p.textContent('#emailForm span'))==='Add an email', dev+' add email shown');
await p.fill('#newEmail','bad email');await p.click('#emailForm button');await p.waitForTimeout(500);
ok(!(await p.isHidden('#securityErr')), dev+' bad email error: '+await p.textContent('#securityErr'));
const email=dev+'.owner@example.com';
if(dev==='phone'){await p.fill('#newEmail','desktop.owner@EXAMPLE.com');await p.click('#emailForm button');await p.waitForTimeout(600);ok((await p.textContent('#securityErr')).includes('another account'), 'duplicate blocked: '+await p.textContent('#securityErr'));}
await p.fill('#newEmail',email);await p.click('#emailForm button');await p.waitForURL(/\/verify/,{timeout:8000});
const a=findAcct(user);ok(a.email===email&&a.email_verified===false, dev+' account.json email saved');
await p.waitForTimeout(300);const code=codeFor(email);ok(/^\d{6}$/.test(code||''), dev+' code emailed');
await p.fill('#code',code);await p.click('#verifyForm button[type=submit]');await p.waitForURL(u=>new URL(u).pathname==='/account',{timeout:8000});
await p.waitForSelector('.security');ok(!(await p.$('#emailForm')), dev+' form gone once confirmed');ok(findAcct(user).email_verified===true, dev+' confirmed in account.json');
await p.screenshot({path:`${process.env.OUT}/email-${dev}.png`,fullPage:false});
// log in by the new email now
await p.click('#logoutBtn');await p.waitForTimeout(500);await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login',email.toUpperCase());await p.fill('#password',pass);await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
ok(await p.evaluate(()=>!!document.querySelector('#sideNav a')), dev+' logged in with new email');
ok(!errs.length, dev+' no page errors '+errs.join('|'));}
await b.close();process.exit(bad);})();
