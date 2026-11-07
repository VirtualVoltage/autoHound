const {chromium}=require('playwright');const U=process.argv[2],O=process.argv[3];
(async()=>{const b=await chromium.launch();for(const w of [1300,900]){const p=await (await b.newContext({viewport:{width:w,height:800}})).newPage();
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForFunction(()=>location.pathname==='/');await p.waitForSelector('.window');await p.waitForTimeout(500);
console.log(w,await p.evaluate(()=>{const n=document.getElementById('sideNav').getBoundingClientRect(),h=document.querySelector('.topbar').getBoundingClientRect();return {navLeft:n.left|0,navTop:n.top|0,headBottom:h.bottom|0,navHeight:n.height|0,over:document.documentElement.scrollWidth-document.documentElement.clientWidth}}));
await p.screenshot({path:`${O}/side-${w}.png`});await p.mouse.wheel(0,1500);await p.waitForTimeout(400);await p.screenshot({path:`${O}/side-${w}-scrolled.png`});
const q=await (await b.newContext({viewport:{width:w,height:800}})).newPage();await q.goto(U+'/login');await q.waitForSelector('#login');console.log(w,'login page side visible',await q.locator('#sideNav').isVisible());}
await b.close();})();
