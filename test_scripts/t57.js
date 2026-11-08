// Mouse wheel: past the end of the chat frame its contents pull and spring back, the page doesn't scroll;
// over the listing photo the wheel changes photos (one per turn), in the page and in full screen.
const {chromium}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
const p=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
const id=await p.evaluate(async()=>{const me=(await (await fetch('/api/me')).json()).account.id;const d=await (await fetch('/api/listings?limit=100')).json();for(const l of d.listings){if(l.seller.id===me)continue;const x=(await (await fetch('/api/listings/'+l.id)).json()).listing;if(!x.chat&&x.sell_type==='post'&&x.photos.length>1)return x.id}});
await p.goto(U+'/listing/'+id);await p.waitForSelector('#chatBox .chat-window');await p.waitForTimeout(500);
const pull=()=>p.$eval('.chat-window',w=>({pull:parseFloat(w.style.getPropertyValue('--pull')||0),ty:new DOMMatrix(getComputedStyle(w.querySelector('.chat-composer')).transform).m42}));
const overChat=async()=>{const r=await p.$eval('.chat-window',e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});await p.mouse.move(r.x,r.y);};
for(const state of ['empty','messages']){
  if(state==='messages'){for(let i=0;i<12;i++){await p.fill('#msgText','Message '+i+' with enough words to take up a little room in the chat box');await p.click('#composer button[type=submit]');await p.waitForTimeout(250);}await p.waitForTimeout(500);}
  await overChat();await p.waitForTimeout(300);const y0=await p.evaluate(()=>scrollY);
  for(let i=0;i<6;i++){await p.mouse.wheel(0,100);await p.waitForTimeout(30);}
  await p.waitForTimeout(60);const a=await pull();const y1=await p.evaluate(()=>scrollY);
  ok(a.pull<-10&&a.pull>=-46,`${state}: wheel down past the end pulls the contents up (${a.pull}px)`);
  ok(y1===y0,`${state}: the page behind doesn't scroll`);
  if(state==='empty')await p.screenshot({path:`${O}/spring-pulled.png`,clip:await p.$eval('#chatBox',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y-20,width:r.width,height:r.height+40}})});
  await p.waitForTimeout(800);const c=await pull();ok(c.pull===0&&Math.abs(c.ty)<0.5,`${state}: springs back once the wheel stops`);
  if(state==='messages'){
    await p.mouse.wheel(0,-150);await p.waitForTimeout(250);const s=await p.$eval('#thread',t=>({top:t.scrollTop,max:t.scrollHeight-t.clientHeight}));const d=await pull();
    ok(s.top<s.max-50&&d.pull===0,'messages: wheel up scrolls the messages normally, no pull');
    await p.$eval('#thread',t=>t.scrollTop=0);for(let i=0;i<4;i++){await p.mouse.wheel(0,-100);await p.waitForTimeout(30);}await p.waitForTimeout(40);
    ok((await pull()).pull>10,'messages: wheel up past the oldest pulls the contents down');await p.waitForTimeout(800);
  }
}
// photos
const cnt=()=>p.textContent('#photoCount');
const ph=await p.$eval('#mainPhoto',e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});await p.mouse.move(ph.x,ph.y);await p.waitForTimeout(300);
const start=await cnt();const sy=await p.evaluate(()=>scrollY);
await p.mouse.wheel(0,100);await p.waitForTimeout(250);ok((await cnt()).startsWith('2 /')&&start.startsWith('1 /'),'wheel down over the photo shows the next one');
ok(await p.evaluate(()=>scrollY)===sy,'the page does not scroll while over the photo');
// a trackpad glide: many small events in a row only move one photo
for(let i=0;i<20;i++){await p.mouse.wheel(0,12);await p.waitForTimeout(16);}await p.waitForTimeout(250);ok((await cnt()).startsWith('1 /'),'a long trackpad glide moves just one photo');
await p.mouse.wheel(0,-100);await p.waitForTimeout(250);ok((await cnt()).startsWith('2 /'),'wheel up goes back (wrapping round)');
await p.mouse.wheel(80,0);await p.waitForTimeout(250);ok((await cnt()).startsWith('1 /'),'sideways trackpad swipe works too');
await p.click('#photoFull');await p.waitForSelector('#photoViewer:not([hidden])');await p.waitForTimeout(300);
const before=await p.textContent('#pvCount');await p.mouse.move(650,425);await p.mouse.wheel(0,100);await p.waitForTimeout(250);const after=await p.textContent('#pvCount');
ok(before!==after,`wheel works in full screen (${before} -> ${after})`);
ok(!errs.length,'no page errors '+errs.join('|'));
await b.close();process.exit(bad);})();
