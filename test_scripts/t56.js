// Map page fills the window under its heading: no frame, no sideways scroll, no page scroll, at several sizes.
const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});let bad=0;const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m);if(!c)bad=1};
for (const [name,opts,login] of [['desktop',{viewport:{width:1400,height:900}},true],['desktop-narrow',{viewport:{width:700,height:800}},true],['phone',devices['iPhone 13'],true],['phone-visitor',devices['iPhone SE'],false]]){
const p=await (await b.newContext(opts)).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
if(login){await p.goto(U+'/login');await p.waitForSelector('#login');await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');}
await p.goto(U+'/map');await p.waitForSelector('#mapBox canvas',{timeout:20000});await p.waitForTimeout(700);
const g=await p.evaluate(()=>{const m=document.getElementById('mapBox').getBoundingClientRect(),s=document.getElementById('sideNav'),ss=getComputedStyle(s),sr=s.getBoundingClientRect(),c=getComputedStyle(document.getElementById('mapBox'));
const barTop=ss.position==='fixed'&&s.offsetHeight?sr.top:innerHeight;const leftEdge=ss.position!=='fixed'&&sr.width&&sr.right<=m.left+1?sr.right:0;
return {left:Math.round(m.left),right:Math.round(m.right),bottom:Math.round(m.bottom),h:Math.round(m.height),leftEdge:Math.round(leftEdge),vw:document.documentElement.clientWidth,barTop:Math.round(barTop),border:c.borderTopWidth,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,vh:innerHeight,legendAbove:document.querySelector('.map-legend').getBoundingClientRect().bottom<=m.top}});
console.log(name,JSON.stringify(g));
ok(Math.abs(g.left-g.leftEdge)<=1&&Math.abs(g.right-g.vw)<=1,name+' map runs edge to edge');ok(Math.abs(g.bottom-g.barTop)<=2,name+' map reaches the bottom'+(g.barTop<g.vh?' bar':' of the window'));
ok(g.border==='0px'&&g.legendAbove,name+' no frame, key above the map');ok(g.scrollW<=g.vw&&g.scrollH<=g.vh+2,name+' page doesn\'t scroll');
await p.screenshot({path:`${O}/mapfull-${name}.png`});ok(!errs.length,name+' no page errors '+errs.join('|'));}
await b.close();process.exit(bad);})();
