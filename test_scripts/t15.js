const {chromium,devices}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();
for(const [dev,name] of [['Desktop Chrome','redline riley'],['Desktop Chrome','Redline Riley'],['Desktop Chrome','redline_riley'],['Desktop Chrome','new_person here'],['iPhone 14','Redline riley'],['iPhone 14','redline riley ']]){
 const c=await b.newContext({...devices[dev]});const p=await c.newPage();await p.goto(U+'/login');await p.waitForSelector('#login',{timeout:120000});
 await p.fill('#login',name);await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');
 await p.waitForTimeout(2500);console.log(dev.padEnd(15),JSON.stringify(name).padEnd(18),await p.evaluate(()=>({path:location.pathname,err:document.getElementById('authErr')?.hidden===false?document.getElementById('authErr').textContent:'',acct:!!document.querySelector('#headLinks a[href="/account"]')})));await c.close();}
await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
