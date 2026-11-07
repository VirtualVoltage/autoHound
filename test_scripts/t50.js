// Map in another profile: Map button, map page pins, pin picker on the sell form, no page errors.
const {chromium}=require('playwright');const [U,O,name]=process.argv.slice(2);
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/');await p.waitForSelector('.window');await p.click('.map-btn');await p.waitForSelector('#mapBox canvas',{timeout:20000});await p.waitForTimeout(800);
const biz=(await p.$$('#mapBox .map-pin.business')).length;await p.click('#mapBox .map-pin.business');await p.waitForSelector('.map-pop');const bg=await p.$eval('.maplibregl-popup-content',e=>getComputedStyle(e).backgroundColor);
await p.screenshot({path:`${O}/map-${name}.png`});
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForTimeout(1500);
await p.goto(U+'/sell');await p.waitForSelector('#spotBox canvas',{timeout:20000});
console.log(JSON.stringify({name,biz,popupBg:bg,errs}));await b.close();process.exit(biz===5&&bg!=='rgb(255, 255, 255)'&&!errs.length?0:1);})();
