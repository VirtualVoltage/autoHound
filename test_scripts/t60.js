// Big listing photos: with the full photo held back, the thumbnail shows stretched to fill the photo area,
// then the full photo fades in over it. Also when changing photos and in full screen. Desktop and phone.
const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
for(const [name,opts] of [['desktop',{viewport:{width:1400,height:950}}],['phone',devices['iPhone 13']]]){
const ctx=await b.newContext(opts),p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
let hold=true;const held=[];
await ctx.route(/\/photos?\/|\/files?\//,async r=>{const u=r.request().url();if(r.request().resourceType()==='image'&&!u.includes('size=thumb')&&hold){held.push(r);return}await r.continue()});
await p.goto(U+'/');await p.waitForSelector('.window');
const id=await p.evaluate(async()=>{const d=await (await fetch('/api/listings?limit=100')).json();for(const l of d.listings){const x=(await (await fetch('/api/listings/'+l.id)).json()).listing;if(x.photos.length>1)return x.id}});
await p.goto(U+'/listing/'+id);await p.waitForSelector('#mainPhoto .ph-thumb');await p.waitForTimeout(800);
const st=()=>p.$eval('#mainPhoto',m=>{const t=m.querySelector('.ph-thumb'),f=m.querySelector('.ph-full'),r=m.getBoundingClientRect(),tr=t.getBoundingClientRect();return {thumbLoaded:t.complete&&t.naturalWidth>0,thumbNatural:t.naturalWidth,thumbFills:Math.abs(tr.width-r.width)<3&&Math.abs(tr.height-r.height)<3,full:+getComputedStyle(f).opacity,fullIn:f.classList.contains('in')}});
let s=await st();ok(held.length>0&&s.thumbLoaded&&s.thumbFills&&s.full===0,`${name}: full photo held back, thumbnail (${s.thumbNatural}px wide) fills the photo area`);
await p.screenshot({path:`${O}/thumb-first-${name}.png`});
hold=false;for(const r of held.splice(0))await r.continue().catch(()=>{});await p.waitForTimeout(600);
s=await st();ok(s.fullIn&&s.full===1,`${name}: full photo fades in over it once loaded`);
await p.screenshot({path:`${O}/thumb-after-${name}.png`});
hold=true;if(name==='desktop')await p.click('#photoNext');else await p.tap('#photoNext');await p.waitForTimeout(500);
s=await st();ok(s.thumbLoaded&&(held.length>0?s.full===0:s.fullIn),`${name}: next photo also starts from its thumbnail${held.length?'':' (it was already preloaded)'}`);
hold=false;for(const r of held.splice(0))await r.continue().catch(()=>{});await p.waitForTimeout(600);ok((await st()).fullIn,`${name}: next photo loads in`);
if(name==='desktop')await p.click('#photoFull');else await p.tap('#mainPhoto');await p.waitForSelector('#photoViewer:not([hidden])');await p.waitForTimeout(500);
const v=await p.$eval('#pvStage',m=>{const t=m.querySelector('.ph-thumb'),f=m.querySelector('.ph-full'),r=m.getBoundingClientRect(),fr=f.getBoundingClientRect();return {t:!!t,fills:Math.abs(fr.width-r.width)<3,inn:f.classList.contains('in')}});
ok(v.t&&v.fills&&v.inn,`${name}: full screen uses the same layers and fills the screen`);
ok(!errs.length,`${name}: no page errors ${errs.join('|')}`);await ctx.close();}
await b.close();process.exit(bad);})();
