const {chromium,devices}=require('playwright');const [U,O]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();let bad=0;
for (const [name,dev] of [['iphone13',devices['iPhone 13']],['iphoneSE',devices['iPhone SE']]]){
const c=await b.newContext(dev);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const info=async tag=>{await p.waitForTimeout(700);const r=await p.evaluate(()=>{const g=id=>{const e=document.getElementById(id);const r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),n:e.children.length,pos:getComputedStyle(e).position}};const w=[...document.querySelectorAll('#headLinks .btn,#sideNav .btn')].filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent);return {rail:g('headLinks'),side:g('sideNav'),vh:innerHeight,clipped:w,over:document.documentElement.scrollWidth}});console.log(name,tag,JSON.stringify(r));return r;};
await p.goto(U+'/');await p.waitForSelector('.window');let r=await info('home logged out');if(!(r.rail.top<200&&r.side.pos==='fixed'&&r.side.bottom===r.vh))bad=1;
await p.screenshot({path:`${O}/phone-${name}-loggedout.png`});
await p.goto(U+'/login');await p.waitForSelector('#login');r=await info('login page');if(r.side.n!==0)bad=1;
await p.fill('#login','redline riley');await p.fill('#password','boost4life');await p.click('#authForm button[type=submit]');await p.waitForSelector('.window');r=await info('home logged in');
await p.screenshot({path:`${O}/phone-${name}-loggedin.png`});
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(300);
const foot=await p.evaluate(()=>{const f=document.querySelector('.foot-note').getBoundingClientRect(),s=document.getElementById('sideNav').getBoundingClientRect();return {footBottom:Math.round(f.bottom),barTop:Math.round(s.top)}});console.log(name,'bottom of page',foot);if(foot.footBottom>foot.barTop)bad=1;
if(errs.length){console.log(errs);bad=1}await c.close();}
await b.close();process.exit(bad);})();
