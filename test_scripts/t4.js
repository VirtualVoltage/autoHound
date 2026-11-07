const {chromium}=require('playwright');const O=process.argv[2];(async()=>{
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/autohound/index.html');await p.waitForTimeout(300);
console.log('sell btn',await p.locator('.head-links a').first().textContent(),await p.locator('a[href="#post"]').count());
await p.click('.sell-btn');await p.waitForTimeout(200);await p.screenshot({path:O+'/s1.png',fullPage:true});
await p.click('#sellForm button[type=submit]');console.log('err:',await p.textContent('#sellErr'));
await p.setInputFiles('#sPhotos',[O+'/up_a.jpg',O+'/up_b.jpg',O+'/not.txt']);await p.waitForTimeout(800);
console.log('photos',await p.locator('.up-photo').count(),'photoErr:',await p.textContent('#photoErr'));
await p.fill('#sTitle','Test <b>coilovers</b> & more');await p.fill('#sPrice','700');await p.fill('#sDesc','Came off my car, about 10k miles, no leaks.');await p.fill('#sFit','1G DSM');await p.selectOption('#sCity','Blaine');
await p.waitForTimeout(100);console.log('preview',(await p.textContent('.preview-win .window-body')).replace(/\s+/g,' '));
await p.click('[data-act=coverPhoto]');console.log('cover swap ok',await p.locator('.up-photo').count());
await p.screenshot({path:O+'/s2.png',fullPage:true});
await p.click('#sellForm button[type=submit]');await p.waitForTimeout(250);console.log('published',await p.evaluate(()=>location.hash),await p.textContent('.post-title'),'thumbs',await p.locator('.thumbs button').count(),'meter',await p.locator('.meter').count());
await p.click('.thumbs button >> nth=1');await p.screenshot({path:O+'/s3.png'});
await p.evaluate(()=>{location.hash='home'});await p.waitForTimeout(200);console.log('first home',await p.locator('.window h3').first().textContent());
await p.reload();await p.waitForTimeout(300);console.log('after reload',await p.locator('.window h3').first().textContent());
// car + auction
await p.click('.sell-btn');await p.waitForTimeout(150);await p.selectOption('#sKind','cars');await p.waitForTimeout(50);console.log('fits hidden',await p.locator('#sFit').isVisible(),'year',await p.locator('#sYear').isVisible());
await p.setInputFiles('#sPhotos',[O+'/up_b.jpg']);await p.waitForTimeout(400);await p.fill('#sTitle','1995 3000GT VR-4');await p.fill('#sYear','1995');await p.fill('#sMiles','120000');await p.selectOption('#sMode','auction');await p.fill('#sPrice','9000');await p.fill('#sDesc','Runs great, new timing belt, needs paint.');await p.click('#sellForm button[type=submit]');await p.waitForTimeout(250);console.log('car',await p.textContent('.post-title'),(await p.textContent('.attrs')).replace(/\s+/g,' '));
await p.evaluate(()=>{location.hash='cars'});await p.waitForTimeout(150);console.log('cars has mine',await p.locator('.card:has-text("3000GT VR-4")').count());
await p.click('.card:has-text("3000GT VR-4") h3 a');await p.waitForTimeout(150);await p.click('[data-act=deletePost]');await p.waitForTimeout(150);await p.evaluate(()=>{location.hash='cars'});await p.waitForTimeout(120);console.log('after delete',await p.locator('.card:has-text("3000GT VR-4")').count());
const ph=await b.newPage({viewport:{width:400,height:800}});ph.on('pageerror',e=>errs.push('ph '+e.message));await ph.goto('file:///home/claude/autohound/index.html#sell');await ph.waitForTimeout(300);console.log('phone overflow',await ph.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]));await ph.screenshot({path:O+'/s4.png'});
console.log('errors',errs);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
