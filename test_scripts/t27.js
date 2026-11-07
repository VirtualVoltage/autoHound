// email login, legacy username login, hidden salts, field styles, optional login codes
const {chromium}=require('playwright');const fs=require('fs');const U=process.argv[2],LOG=process.argv[3];
const lastCode=(to,kind)=>{const m=[...fs.readFileSync(LOG,'utf8').matchAll(new RegExp('EMAIL to='+to.replace(/[.+]/g,'\\$&')+' subject=Your Autohound '+kind+': (\\d{6})','g'))];return m.length?m[m.length-1][1]:null};
(async()=>{const b=await chromium.launch();const errs=[];const ctx=async()=>{const c=await b.newContext({viewport:{width:1300,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));return p};
const t=Date.now()%100000,email=`login_tester${t}@example.com`,pw='secret12';
let p=await ctx();await p.goto(U+'/signup');await p.waitForSelector('#email');
console.log('field styles same',await p.evaluate(()=>{const s=id=>{const c=getComputedStyle(document.getElementById(id));return [c.backgroundColor,c.borderTopColor,c.height,c.paddingLeft,c.fontSize].join('|')};return [s('username'),s('email'),s('password')]}).then(a=>a.every(x=>x===a[0])+' '+a[0]));
await p.fill('#username','login tester '+t);await p.fill('#email',email);await p.fill('#password',pw);await p.click('#authForm button[type=submit]');await p.waitForFunction(()=>location.pathname==='/verify');
await p.fill('#code',lastCode(email,'code'));await p.click('#verifyForm button[type=submit]');await p.waitForFunction(()=>location.pathname==='/');
await p.evaluate(()=>fetch('/api/logout',{method:'POST'}));
p=await ctx();await p.goto(U+'/login');await p.waitForSelector('#login');console.log('login label',(await p.textContent('#authForm label')).trim());
await p.fill('#login',email.toUpperCase());await p.fill('#password',pw);await p.click('#authForm button[type=submit]');await p.waitForSelector('#headLinks a[href="/account"]');console.log('email login (caps) ok');
// private.json has client_salt
// settings: turn on login codes
await p.goto(U+'/account');await p.waitForSelector('#loginCodesBtn');console.log('settings:',(await p.textContent('.security')).replace(/\s+/g,' ').slice(0,170));
await p.click('#loginCodesBtn');await p.waitForTimeout(1200);await p.waitForSelector('#loginCodesBtn');console.log('after turning on:',await p.textContent('#loginCodesBtn'));
await p.evaluate(()=>fetch('/api/logout',{method:'POST'}));
p=await ctx();await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login',email);await p.fill('#password',pw);await p.click('#authForm button[type=submit]');await p.waitForSelector('#codeForm');console.log('code step:',(await p.textContent('#codeForm p')).replace(/\s+/g,' '));
console.log('logged in before code?',await p.evaluate(async()=>!!(await (await fetch('/api/me')).json()).account));
await p.fill('#loginCode','000001');await p.click('#codeForm button');await p.waitForTimeout(800);console.log('wrong login code:',await p.textContent('#codeErr'));
await p.fill('#loginCode',lastCode(email,'login code'));await p.click('#codeForm button');await p.waitForSelector('#headLinks a[href="/account"]');console.log('login with code ok');
await p.goto(U+'/account');await p.waitForSelector('#loginCodesBtn');await p.click('#loginCodesBtn');await p.waitForTimeout(1200);console.log('after turning off:',await p.textContent('#loginCodesBtn'));
// legacy username login still works, unknown and wrong
p=await ctx();await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button[type=submit]');await p.waitForSelector('#headLinks a[href="/account"]');console.log('old username login ok');
const salts=await p.evaluate(async e=>{const s=async l=>(await (await fetch('/api/login/salt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:l})})).json()).salt;return [await s(e),await s('nobody_'+e),await s('nobody_'+e),await s('boost brandon')]},email);
console.log('salt real vs fake look alike',/^autohound:acct:[0-9a-f]{32}$/.test(salts[0]),/^autohound:acct:[0-9a-f]{32}$/.test(salts[1]),'fake stable',salts[1]===salts[2],'legacy',salts[3]);
p=await ctx();await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','nobody@example.com');await p.fill('#password','whatever1');await p.click('#authForm button[type=submit]');await p.waitForTimeout(1500);console.log('unknown email:',await p.textContent('#authErr'));
p=await ctx();await p.goto(U+'/signup');await p.waitForSelector('#email');await p.fill('#username','at@sign person');await p.fill('#email','x'+t+'@example.com');await p.fill('#password','secret12');await p.click('#authForm button[type=submit]');await p.waitForTimeout(500);console.log('@ in username:',await p.textContent('#authErr'));
await b.close();console.log('errors',errs);})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
