// Listing photos: drag with the mouse, swipe with a finger, full screen viewer (button on desktop, tap on phones), Escape and the exit button.
const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const pick=async p=>p.evaluate(async()=>{const d=await (await fetch('/api/listings?limit=100')).json();for(const l of d.listings){const x=(await (await fetch('/api/listings/'+l.id)).json()).listing;if(x.photos.length>1)return x.id}});
const count=p=>p.textContent('#photoCount');
const swipeJS=(p,sel,dx)=>p.evaluate(([sel,dx])=>{const el=document.querySelector(sel),r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,o={bubbles:true,pointerId:7,pointerType:'touch',isPrimary:true};el.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:x,clientY:y}));el.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:x+dx,clientY:y}));},[sel,dx]);
// desktop
const p=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/');await p.waitForSelector('.window');const id=await pick(p);await p.goto(U+'/listing/'+id);await p.waitForSelector('#mainPhoto img');
const box=await p.$eval('#mainPhoto',e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
await p.mouse.move(box.x,box.y);await p.waitForTimeout(250);ok(+(await p.$eval('#photoFull',e=>getComputedStyle(e).opacity))===1,'full screen button shows on hover, top right');
await p.mouse.down();await p.mouse.move(box.x-120,box.y,{steps:6});await p.mouse.up();await p.waitForTimeout(200);ok((await count(p)).startsWith('2 /'),'mouse drag left goes to the next photo');
await p.mouse.move(box.x,box.y);await p.mouse.down();await p.mouse.move(box.x+120,box.y,{steps:6});await p.mouse.up();await p.waitForTimeout(200);ok((await count(p)).startsWith('1 /'),'mouse drag right goes back');
await p.click('#photoFull');await p.waitForSelector('#photoViewer:not([hidden])');await p.waitForTimeout(300);ok(!!(await p.$('#pvStage img')),'full screen viewer opens');
ok(await p.$eval('#pvExit',e=>e.getAttribute('aria-label'))==='Exit full screen','button turns into exit full screen');
await p.screenshot({path:`${O}/viewer-desktop.png`});
await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);ok((await p.textContent('#pvCount')).startsWith('2 /'),'arrow key works in full screen');
const vb=await p.$eval('#photoViewer',e=>{const r=e.getBoundingClientRect();return {x:r.width/2,y:r.height/2}});await p.mouse.move(vb.x,vb.y);await p.mouse.down();await p.mouse.move(vb.x+150,vb.y,{steps:6});await p.mouse.up();await p.waitForTimeout(150);ok((await p.textContent('#pvCount')).startsWith('1 /'),'mouse drag works in full screen');
await p.keyboard.press('Escape');await p.waitForTimeout(300);ok(await p.$eval('#photoViewer',e=>e.hidden),'Escape leaves full screen');
await p.click('#photoFull');await p.waitForSelector('#photoViewer:not([hidden])');await p.click('#pvExit');await p.waitForTimeout(300);ok(await p.$eval('#photoViewer',e=>e.hidden),'exit button leaves full screen');
ok(!errs.length,'desktop: no page errors '+errs.join('|'));
// phone
const m=await (await b.newContext(devices['iPhone 13'])).newPage();const merr=[];m.on('pageerror',e=>merr.push(e.message));
await m.goto(U+'/listing/'+id);await m.waitForSelector('#mainPhoto img');
ok(await m.$eval('#photoFull',e=>getComputedStyle(e).display)==='none','phone hides the full screen button');
await swipeJS(m,'#mainPhoto',-120);await m.waitForTimeout(150);ok((await count(m)).startsWith('2 /'),'finger swipe left goes to the next photo');
await m.tap('#mainPhoto');await m.waitForSelector('#photoViewer:not([hidden])');ok(true,'tapping the photo opens full screen');
await m.screenshot({path:`${O}/viewer-phone.png`});
await swipeJS(m,'#photoViewer',120);await m.waitForTimeout(150);ok((await m.textContent('#pvCount')).startsWith('1 /'),'finger swipe works in full screen');
await m.tap('#pvExit');await m.waitForTimeout(250);ok(await m.$eval('#photoViewer',e=>e.hidden)&&!(await m.evaluate(()=>document.body.classList.contains('viewer-open'))),'exit button closes it on phone');
ok(!merr.length,'phone: no page errors '+merr.join('|'));
await b.close();process.exit(bad);})();
