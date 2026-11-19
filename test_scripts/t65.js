// Phones: the chat box sits right under the seller's name on listing pages, and no safety line or other
// note sits under the chat's Attach and Send buttons. Every profile's chat box, desktop and phone.
const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
for(const [name,opts] of [['phone',devices['iPhone 13']],['desktop',{viewport:{width:1400,height:950}}]]){
const p=await (await b.newContext(opts)).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/');await p.waitForSelector('.window');await p.click('.window h3 a');await p.waitForSelector('#chatBox');await p.waitForTimeout(400);
const g=await p.evaluate(()=>{const s=document.querySelector('.seller-btn, .seller-card'),c=document.getElementById('chatBox'),t=document.querySelector('.post-title'),sr=s.getBoundingClientRect(),cr=c.getBoundingClientRect();
  const between=[...document.querySelectorAll('.post *')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.top>=sr.bottom-1&&r.bottom<=cr.top+1&&!s.contains(e)&&!c.contains(e)&&!e.contains(c)}).length;
  return {gap:Math.round(cr.top-sr.bottom),between,chatAboveTitle:cr.top<t.getBoundingClientRect().top,notes:[...c.querySelectorAll('p.note')].map(e=>e.textContent),text:document.body.innerText}});
if(name==='phone'){ok(g.between===0&&g.gap<30,`phone: chat right under the seller's name (${g.gap}px gap, nothing between)`);ok(g.chatAboveTitle,'phone: chat comes before the title box');}
ok(!g.notes.length&&!/public place|wire money/i.test(g.text),`${name}: no note under the chat buttons`);
await p.screenshot({path:`${O}/chat-order-${name}.png`,fullPage:name==='phone'});
ok(!errs.length,`${name}: no page errors ${errs.join('|')}`);}
await b.close();process.exit(bad);})();
