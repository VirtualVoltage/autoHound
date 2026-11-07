const {chromium}=require('playwright');(async()=>{
const b=await chromium.launch();const errs=[];
const url='file:///home/claude/swapyard/_t.html';
for(const [name,vp] of [['desk',{width:1400,height:900}],['phone',{width:400,height:800}]]){
 const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(name+': '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_/.test(m.text()))errs.push(name+' c: '+m.text())});
 await p.goto(url);
 for(const h of ['home','parts','cars','auctions','builds','build-3','partouts','shops','seller-3','meets','sell','fees','item-1','item-2','item-40','watchlist','bogus']){
  await p.evaluate(x=>{location.hash=x},h);await p.waitForTimeout(120);
  const o=await p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('main *, header *')].filter(e=>{if(e.closest('.shelf,.tbl-wrap,.nav'))return false;const r=e.getBoundingClientRect();return r.width&&r.right>w+1}).slice(0,3).map(e=>e.className||e.tagName);return {sw:document.documentElement.scrollWidth,w,bad,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}});
  if(o.sw>o.w||o.bad.length||o.broken.length)console.log(name,h,JSON.stringify(o));
 }
 await p.evaluate(()=>{location.hash='home'});await p.waitForTimeout(400);
 await p.screenshot({path:process.argv[2]+`/s_${name}_home.png`});
 if(name==='phone'){await p.evaluate(()=>{location.hash='item-2'});await p.waitForTimeout(300);await p.screenshot({path:process.argv[2]+'/s_phone_item.png',fullPage:false});}
 if(name==='desk'){
  // filter
  await p.evaluate(()=>{location.hash='parts'});await p.waitForTimeout(100);
  const n0=await p.locator('.card').count();await p.check('#ftJunkyard');const n1=await p.locator('.card').count();await p.check('#fTuner');const n2=await p.locator('.card').count();console.log('filter',n0,n1,n2);
  await p.click('.empty [data-act=clearFilters]');
  // search
  await p.fill('#searchInput','3000GT');await p.press('#searchInput','Enter');await p.waitForTimeout(100);console.log('search 3000GT',await p.locator('.card').count());
  // tier
  await p.evaluate(()=>{location.hash='cars'});await p.waitForTimeout(100);await p.click('#tierBeater');console.log('beaters',await p.locator('.card').count());await p.screenshot({path:process.argv[2]+'/s_cars.png'});
  // bid + end
  await p.evaluate(()=>{location.hash='item-14'});await p.waitForTimeout(100);await p.fill('#bidAmt','1');await p.click('#bidForm button');console.log('err',await p.textContent('#bidErr'));await p.fill('#bidAmt','400');await p.click('#bidForm button');console.log('price',await p.textContent('.big-price'));await p.screenshot({path:process.argv[2]+'/s_item.png'});
  await p.click('[data-act=endAuction]');console.log('closed',(await p.textContent('.result')).replace(/\s+/g,' '));
  // low close
  await p.evaluate(()=>{location.hash='item-2'});await p.waitForTimeout(100);await p.click('[data-act=endAuction]');console.log('low close',(await p.textContent('.result')).replace(/\s+/g,' '));
  // sell without account -> join
  await p.evaluate(()=>{location.hash='sell'});await p.waitForTimeout(100);console.log('est',(await p.textContent('#sellPreview .big-price')));await p.selectOption('#sMode','auction');await p.fill('#sPrice','700');console.log('sell',(await p.textContent('#sellPreview .result')).replace(/\s+/g,' '));await p.screenshot({path:process.argv[2]+'/s_sell.png'});
  await p.click('#sellForm button');await p.fill('#joinName','<b>tess');await p.click('#joinForm button');await p.waitForTimeout(100);console.log('acct',await p.textContent('#accountBtn'));
  await p.click('#sellForm button');await p.waitForTimeout(150);console.log('published',await p.evaluate(()=>location.hash),await p.textContent('h1'));
  // device block
  await p.click('#accountBtn');await p.click('[data-act=signOut]');await p.click('#accountBtn');console.log('blocked',(await p.textContent('#dlgAccount .note-err')));await p.click('[data-act=signBack]');console.log('back',await p.textContent('#accountBtn'));
  // cart
  await p.evaluate(()=>{location.hash='partouts'});await p.waitForTimeout(100);await p.click('[data-act=addPiece] >> nth=0');console.log('cart',await p.textContent('#cartCount'));await p.screenshot({path:process.argv[2]+'/s_cart.png'});await p.click('[data-act=checkout]');console.log((await p.textContent('#dlgCart .check-ok')));await p.click('#dlgCart .x');
  // fee calc + meet calc
  await p.evaluate(()=>{location.hash='fees'});await p.waitForTimeout(100);await p.selectOption('#fTier','3');console.log('fee',(await p.textContent('#feeOut')).replace(/\s+/g,' '));
  await p.evaluate(()=>{location.hash='meets'});await p.waitForTimeout(100);await p.fill('#mSales','1000');console.log('meet',(await p.textContent('#meetOut')).replace(/\s+/g,' '));await p.click('[data-act=toggleMeet] >> nth=0');console.log('meet items',await p.locator('.card').count());
 }
 await p.close();
}
console.log('errors',errs);await b.close();})().catch(e=>{console.error(e);process.exit(1)});
