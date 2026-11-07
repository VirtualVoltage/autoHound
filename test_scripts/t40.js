const {chromium}=require('playwright');const [U,O,name]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');const lab=await p.textContent('label.field span');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForTimeout(1500);
await p.goto(U+'/account');await p.waitForSelector('#emailForm');await p.$eval('.security',e=>e.scrollIntoView());await p.screenshot({path:`${O}/${name}.png`});console.log(name,lab,await p.textContent('#emailForm span'),errs);await b.close();})();
