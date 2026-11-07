const {chromium}=require('playwright');const U=process.argv[2],MS=+process.argv[3];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:700}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U);await p.waitForSelector('.window',{timeout:120000});
const start=await p.evaluate(()=>{window.__e=[];const l=document.querySelector('.logo');let on=0,kind='';new MutationObserver(()=>{const k=l.classList.contains('blink')?'flicker':l.classList.contains('dim')?'dim':'';if(k&&!on){on=performance.now();kind=k;window.__o=getComputedStyle(l).opacity}else if(!k&&on){window.__e.push([Math.round(on),Math.round(performance.now()-on),kind,window.__o]);on=0}}).observe(l,{attributes:true,attributeFilter:['class']});return performance.now()});
await p.waitForTimeout(MS);
const r=await p.evaluate(()=>window.__e);
console.log(U,'events',r.length,'in',MS/1000,'s');for(const x of r)console.log(' ',((x[0]-start)/1000).toFixed(1)+'s',x[2],x[1]+'ms','opacity',x[3]);
await b.close();console.log('errors',errs);})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
