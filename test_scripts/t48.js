const {chromium}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1300,height:800}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
const head=await p.textContent('#headLinks');await p.click('#headLinks a[href="/saved"]');await p.waitForFunction(()=>document.querySelector('.main-title')?.textContent==='Saved');
console.log(JSON.stringify({head,title:await p.textContent('.main-title'),fav:/favorit/i.test(await p.textContent('body')),errs}));await b.close();process.exit(errs.length?1:0);})();
