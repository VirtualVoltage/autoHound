const {chromium,devices}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();let bad=0;
for (const [name,opts] of [['desktop',{viewport:{width:1300,height:760}}],['phone',devices['iPhone 13']]]){
const c=await b.newContext(opts);const p=await c.newPage();const urls=[],errs=[];
p.on('request',r=>{const u=new URL(r.url());if(u.host===new URL(U).host&&!u.pathname.startsWith('/api/'))urls.push(u.pathname)});
p.on('pageerror',e=>errs.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))errs.push(r.status()+' '+r.url())});
await p.goto(U+'/');await p.waitForSelector('.window',{timeout:20000});await p.waitForTimeout(800);
const nav=await p.$eval('#sideNav',n=>n.querySelectorAll('a').length);
const ct=await p.evaluate(async()=>{const r=await fetch(document.querySelector('script[type=module]').src);return r.headers.get('content-type')});
const unversioned=urls.filter(u=>/\.(js|css)$/.test(u)&&!u.startsWith('/v/'));
console.log(name,'nav buttons',nav,'app.js type',ct,'files',urls.length,'unversioned',unversioned,'errors',errs);
if(nav<3||unversioned.length||errs.length)bad=1;await c.close();}
await b.close();process.exit(bad);})();
