const {chromium,devices}=require('playwright');const U=process.argv[2],O=process.argv[3];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();
const look=async(name,opt)=>{const c=await b.newContext(opt);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(U);await p.waitForSelector('.window',{timeout:120000});await sleep(400);
 const r=await p.evaluate(()=>{const n=document.getElementById('headLinks').getBoundingClientRect();return{look:window.AUTOHOUND_LOOK,css:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href')).filter(h=>h.includes('profiles')),over:document.documentElement.scrollWidth-document.documentElement.clientWidth,nav:{top:Math.round(n.top),right:Math.round(innerWidth-n.right),pos:getComputedStyle(document.getElementById('headLinks')).position}}});console.log(name.padEnd(22),JSON.stringify(r),errs.length?errs:'');await p.screenshot({path:`${O}/d-${name.replace(/ /g,'-')}.png`});return c;};
await look('desktop',{viewport:{width:1300,height:900}});
await look('desktop narrow',{viewport:{width:900,height:800}});
await look('desktop tiny window',{viewport:{width:400,height:800}});
for(const d of ['iPhone 14','iPhone SE','iPhone 14 landscape','Pixel 7','Galaxy S9+','iPad (gen 7)','iPad Pro 11','Galaxy Tab S4'])await look(d,{...devices[d]});
// logged-in desktop header
const c=await b.newContext({viewport:{width:1300,height:900}});const p=await c.newPage();await p.goto(U+'/signup');await p.waitForSelector('#username');await p.fill('#username','top right tester '+Date.now()%100000);await p.fill('#password','secret12');await p.click('#authForm button[type=submit]');await p.waitForSelector('#headLinks a[href="/account"]');
await p.waitForSelector('.window');await sleep(400);await p.screenshot({path:`${O}/d-desktop-in.png`});
console.log('order',await p.evaluate(()=>[...document.querySelectorAll('#headLinks .btn')].map(e=>e.textContent)));
await p.goto(U+'/listing/'+'x');await sleep(300);
await p.goto(U);await p.waitForSelector('.window h3 a');await p.click('.window h3 a');await p.waitForSelector('.post-title');await sleep(300);await p.screenshot({path:`${O}/d-desktop-listing.png`});
await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
