// Tab titles: every page names itself, listing pages use the listing's title (so the browser's address bar
// suggestions and history show names instead of addresses with IDs), and clicking around updates them.
const {chromium}=require('playwright');const [U]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/');await p.waitForSelector('.window');ok(await p.title()==='Autohound','home: Autohound');
const card=await p.$eval('.window h3 a',a=>({href:a.getAttribute('href'),text:a.textContent}));
await p.click('.window h3 a');await p.waitForSelector('.post-title');await p.waitForTimeout(200);
ok(await p.title()===card.text+' - Autohound',`listing (clicked in the app): "${await p.title()}"`);
const t=await p.title();ok(!/L\.\d\d\./.test(t),'no ID in the title');
await p.goto(U+card.href);await p.waitForSelector('.post-title');ok(await p.title()===card.text+' - Autohound','listing opened directly');
const seller=await p.$eval('.seller-btn span',e=>e.textContent);await p.click('.seller-btn');await p.waitForSelector('.profile');await p.waitForTimeout(200);ok(await p.title()===seller+' - Autohound',`seller page: "${await p.title()}"`);
await p.goBack();await p.waitForSelector('.post-title');await p.waitForTimeout(200);ok(await p.title()===card.text+' - Autohound','back button restores the listing title');
await p.click('.map-btn');await p.waitForTimeout(400);ok(await p.title()==='Map - Autohound','map');
await p.fill('#searchInput','coilover');await p.press('#searchInput','Enter');await p.waitForTimeout(500);ok(await p.title()==='coilover - Autohound',`search: "${await p.title()}"`);
await p.goto(U+'/login');await p.waitForSelector('#login');ok(await p.title()==='Log in - Autohound','log in');
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();process.exit(bad);})();
