const {chromium,devices}=require('playwright');const [U,O,tag]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const c=await b.newContext({viewport:{width:1400,height:900}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/');await p.waitForSelector('.window');
ok(!/demo|made up|nothing is charged|sample photos/i.test(await p.textContent('body')), 'no demo text on home');
const id=await p.evaluate(async()=>{const d=await (await fetch('/api/listings?limit=100')).json();for(const x of d.listings){const l=(await (await fetch('/api/listings/'+x.id)).json()).listing;if(l.photos.length>=2)return l.id}});
await p.goto(U+'/listing/'+id);await p.waitForSelector('#mainPhoto img');
const src=()=>p.$eval('#mainPhoto img',i=>i.getAttribute('src'));const first=await src();
const op=async()=>+(await p.$eval('#photoNext',e=>getComputedStyle(e).opacity));
ok(await op()===0,'arrows hidden before hover');
await p.hover('#mainPhoto');await p.waitForTimeout(250);ok(await op()===1,'arrows show on hover');
if(tag)await p.screenshot({path:`${O}/listing-hover-${tag}.png`});
await p.click('#photoNext');ok(await src()!==first && await p.textContent('#photoCount')==='2 / '+(await p.$$('#thumbs [data-i]')).length,'next button');
await p.mouse.move(5,5);await p.keyboard.press('ArrowLeft');ok(await src()===first,'left arrow key goes back');
await p.keyboard.press('ArrowLeft');ok((await p.textContent('#photoCount')).startsWith('2 /'),'wraps to last photo');
await p.keyboard.press('ArrowRight');ok(await src()===first,'right arrow key wraps to first');
ok(await p.$eval('#thumbs [data-i="0"]',e=>e.classList.contains('on')),'current thumb lit');
await p.click('#thumbs [data-i="1"]');ok(await p.textContent('#photoCount')==='2 / '+(await p.$$('#thumbs [data-i]')).length,'thumb click');
const lay="skipped";
console.log(lay);
await p.screenshot({path:`${O}/listing-desktop.png`});
// typing in the chat box must not change photos
const box=await p.$('#msgText');if(box){const before=await p.textContent('#photoCount');await box.click();await p.keyboard.press('ArrowLeft');ok(await p.textContent('#photoCount')===before,'arrow keys ignored while typing');}
// leaving the page removes the key handler
await p.goto(U+'/');await p.waitForSelector('.window');await p.keyboard.press('ArrowRight');
ok(!errs.length,'no page errors '+errs.join('|'));
const m=await (await b.newContext(devices['iPhone 13'])).newPage();await m.goto(U+'/listing/'+id);await m.waitForSelector('#mainPhoto img');ok(+(await m.$eval('#photoNext',e=>getComputedStyle(e).opacity))>0.5,'phone shows arrows without hover');await m.tap('#photoNext');ok((await m.textContent('#photoCount')).startsWith('2 /'),'phone next tap');
ok(!/demo|made up|nothing is charged|sample photos/i.test(await m.textContent('body')),'no demo text on phone');await m.screenshot({path:`${O}/listing-phone.png`});
await b.close();process.exit(bad);})();
