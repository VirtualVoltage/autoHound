// Listing chat box: one frame for messages and typing, no empty box before the first message.
const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
for (const [name,opts] of [['desktop',{viewport:{width:1300,height:900}}],['phone',devices['iPhone 13']]]){
const p=await (await b.newContext(opts)).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','boost brandon');await p.fill('#password','turbotime1');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');
const id=await p.evaluate(async()=>{const me=(await (await fetch('/api/me')).json()).account.id;const d=await (await fetch('/api/listings?limit=100')).json();for(const l of d.listings){if(l.seller.id===me)continue;const x=(await (await fetch('/api/listings/'+l.id)).json()).listing;if(!x.chat&&x.sell_type==='post')return x.id}});
await p.goto(U+'/listing/'+id);await p.waitForSelector('#chatBox .chat-window');await p.waitForTimeout(500);
const g=await p.evaluate(()=>({frames:document.querySelectorAll('#chatBox .chat-window').length,h:Math.round(document.querySelector('.chat-window').getBoundingClientRect().height),line:getComputedStyle(document.getElementById('composer')).borderTopWidth}));ok(g.frames===1&&g.h>=300&&g.line==='0px',name+' one frame, '+g.h+'px tall, no divider line');
await p.$eval('#chatBox',e=>e.scrollIntoView());await p.screenshot({path:`${O}/chatbox-${name}-empty.png`,clip:await p.$eval('#chatBox',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})});
await p.fill('#msgText','Is the price firm?');await p.click('#composer button[type=submit]');await p.waitForSelector('#thread .bubble, #thread > *',{timeout:10000});await p.waitForTimeout(500);
for(let i=0;i<14;i++){await p.fill('#msgText','Message number '+i+' with enough words to take up a little room in the chat');await p.click('#composer button[type=submit]');await p.waitForTimeout(250);}
await p.waitForTimeout(600);
const h=await p.evaluate(()=>{const t=document.getElementById('thread'),w=document.querySelector('.chat-window');return {frame:Math.round(w.getBoundingClientRect().height),scrolls:t.scrollHeight>t.clientHeight,atBottom:t.scrollHeight-t.scrollTop-t.clientHeight<5,inside:t.parentElement===w}});
ok(h.inside&&h.frame===g.h&&h.scrolls&&h.atBottom,name+' 15 messages: box stays '+h.frame+'px, scrolls inside, shows the newest');
await p.reload();await p.waitForSelector('#thread .bubble');await p.waitForTimeout(800);const re=await p.evaluate(()=>{const t=document.getElementById('thread');return t.scrollHeight-t.scrollTop-t.clientHeight<5});ok(re,name+' reopening the listing starts at the newest message');
await p.$eval('#thread',t=>{t.scrollTop=0});await p.waitForTimeout(200);ok(await p.$eval('#thread',t=>t.scrollTop===0),name+' can scroll up');
await p.$eval('#chatBox',e=>e.scrollIntoView());await p.screenshot({path:`${O}/chatbox-${name}-sent.png`,clip:await p.$eval('#chatBox',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})});
ok(!errs.length,name+' no page errors '+errs.join('|'));}
await b.close();process.exit(bad);})();
