const {chromium}=require('playwright');const U=process.argv[2],O=process.argv[3];
(async()=>{const b=await chromium.launch();for(const w of [1300,700]){const p=await (await b.newContext({viewport:{width:w,height:760},deviceScaleFactor:1})).newPage();
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');await p.waitForTimeout(700);
await p.screenshot({path:`${O}/sidebar-${w}px-wide.png`});}await b.close();})();
