const {chromium}=require('playwright');const U=process.argv[2];
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1300,height:900}});const p=await c.newPage();let api=[],all=0;p.on('request',r=>{all++;if(r.url().includes('/api/'))api.push(r.url().replace(U,'').split('?')[0].replace(/[A-Z]\.\d\d\.\d\d\.\d\d\.\d+/,'ID'))});
const sum=()=>{const m={};for(const a of api)m[a]=(m[a]||0)+1;return [api.length,m];};
await p.goto(U);await p.waitForSelector('.window');await p.waitForTimeout(2500);console.log('first home visit (top of page only)',JSON.stringify(sum()));
api=[];await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(2000);console.log('after scroll',JSON.stringify(sum()));
api=[];await p.click('.window h3 a');await p.waitForSelector('.post-title');await p.waitForTimeout(1500);console.log('open listing',JSON.stringify(sum()));
api=[];await p.goBack();await p.waitForSelector('.window');await p.waitForTimeout(1500);console.log('back home',JSON.stringify(sum()));
api=[];await p.reload();await p.waitForSelector('.window');await p.waitForTimeout(2000);console.log('reload',JSON.stringify(sum()));
await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
