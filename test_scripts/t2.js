const {chromium}=require('playwright');const O=process.argv[2];(async()=>{
const b=await chromium.launch();const errs=[];
const url='file://'+O+'/t/t.html';
for(const [name,vp] of [['desk',{width:1400,height:900}],['phone',{width:400,height:800}]]){
 const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(name+': '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_/.test(m.text()))errs.push(name+' c: '+m.text())});
 await p.goto(url);
 for(const h of ['home','parts','cars','auctions','builds','build-3','partouts','shops','seller-3','meets','post','fees','item-1','item-2','item-40','favorites','bogus']){
  await p.evaluate(x=>{location.hash=x},h);await p.waitForTimeout(100);
  const o=await p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('main *, header *')].filter(e=>{if(e.closest('.tbl-wrap,.shelf,.ticker,.banner,.cats'))return false;const r=e.getBoundingClientRect();return r.width&&r.right>w+1}).slice(0,3).map(e=>e.className||e.tagName);return {sw:document.documentElement.scrollWidth,w,bad,imgs:document.images.length,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length}});
  if(o.sw>o.w||o.bad.length||o.broken)console.log(name,h,JSON.stringify(o));
  if(h==='home'||h==='parts')console.log(name,h,'imgs',o.imgs,'broken',o.broken);
 }
 if(name==='desk'){
  await p.evaluate(()=>{location.hash='home'});await p.waitForTimeout(200);await p.screenshot({path:O+'/h.png',fullPage:true});
  console.log('title',await p.title());
  // preset & area
  await p.screenshot({path:O+'/hw.png',fullPage:true});await p.evaluate(()=>{location.hash='parts'});await p.waitForTimeout(100);await p.evaluate(()=>document.querySelectorAll('.f-more').forEach(d=>d.open=true));await p.check('#fcEngine');await p.waitForTimeout(100);console.log('engine whatcom',await p.locator('.card').count(),await p.evaluate(()=>location.hash));await p.screenshot({path:O+'/l.png'});
  await p.selectOption('#areaPick','skagit');await p.waitForTimeout(100);const sk=await p.locator('.card').count();await p.check('#fNearby');console.log('engine skagit',sk,'nearby',await p.locator('.card').count());
  await p.selectOption('#fMiles','25');console.log('within25',await p.locator('.card').count());
  await p.click('[data-act=clearFilters]');await p.selectOption('#areaPick','whatcom');
  
  await p.fill('#fMax','50');await p.locator('#fMax').blur();await p.waitForTimeout(100);console.log('max50',await p.locator('.card').count());await p.click('[data-act=clearFilters]');
  await p.fill('#searchInput','3000GT');await p.press('#searchInput','Enter');await p.waitForTimeout(100);console.log('search',await p.locator('.card').count());
  await p.evaluate(()=>{location.hash='cars'});await p.waitForTimeout(100);await p.click('#tierDaily');console.log('daily whatcom',await p.locator('.card').count());
  await p.evaluate(()=>{location.hash='item-14'});await p.waitForTimeout(100);await p.fill('#bidAmt','1');await p.click('#bidForm button');console.log('err',await p.textContent('#bidErr'));await p.fill('#bidAmt','450');await p.click('#bidForm button');await p.screenshot({path:O+'/i.png'});
  await p.click('[data-act=endAuction]');console.log('closed buyer',(await p.textContent('.bidbox')).replace(/\s+/g,' '));await p.evaluate(()=>{location.hash='item-2'});await p.waitForTimeout(100);await p.click('[data-act=endAuction]');console.log('closed other',(await p.textContent('.bidbox')).replace(/\s+/g,' '));await p.evaluate(()=>{location.hash='item-14'});await p.waitForTimeout(100);
  await p.click('.post-bar [data-act=reply]');await p.click('#replyForm button');console.log('reply',await p.textContent('#toast'));
  await p.click('.post-bar [data-act=watch]');console.log(await p.textContent('#favCount'));
  await p.evaluate(()=>{location.hash='post'});await p.waitForTimeout(100);await p.click('#sellForm button');await p.fill('#joinName','<b>tess');await p.click('#joinForm button');await p.waitForTimeout(100);console.log('acct',await p.textContent('#accountBtn'));
  await p.selectOption('#sCity','Blaine');await p.click('#sellForm button');await p.waitForTimeout(100);console.log('pub',await p.evaluate(()=>location.hash),await p.textContent('.post-title'));
  await p.click('#accountBtn');await p.click('[data-act=signOut]');await p.click('#accountBtn');console.log('blocked',await p.textContent('#dlgAccount .note-err'));await p.click('[data-act=signBack]');
  await p.evaluate(()=>{location.hash='partouts'});await p.waitForTimeout(150);await p.screenshot({path:O+'/po.png'});await p.click('[data-act=replyPiece] >> nth=0');await p.click('#dlgReply .x');
  await p.evaluate(()=>{location.hash='meets'});await p.waitForTimeout(100);await p.screenshot({path:O+'/mt.png'});await p.fill('#mSales','1000');console.log('meet',(await p.textContent('#meetOut')).replace(/\s+/g,' '));
  console.log('swapyard left',await p.evaluate(()=>/swapyard/i.test(document.documentElement.innerHTML)));
 } else {
  await p.evaluate(()=>{location.hash='home'});await p.waitForTimeout(200);await p.screenshot({path:O+'/ph.png'});
  await p.evaluate(()=>{location.hash='parts'});await p.waitForTimeout(200);await p.screenshot({path:O+'/pl.png'});
 }
 await p.close();
}
console.log('errors',errs);await b.close();})().catch(e=>{console.error(e);process.exit(1)});
