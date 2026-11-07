const {chromium}=require('playwright');const O=process.argv[2],U='http://127.0.0.1:8799/';
(async()=>{
 for(let i=0;i<60;i++){try{const r=await fetch(U+'api/listings');if(r.ok)break}catch(e){}await new Promise(r=>setTimeout(r,1000))}
 console.log('api',await (await fetch(U+'api/listings')).text());
 const b=await chromium.launch();const A=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(),B=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();const errs=[];
 for(const[p,n]of[[A,'A'],[B,'B']])p.on('pageerror',e=>errs.push(n+' '+e.message));
 await A.goto(U+'#sell');await A.waitForTimeout(900);
 await A.setInputFiles('#sPhotos',[O+'/up_a.jpg',O+'/up_b.jpg']);await A.waitForTimeout(800);
 await A.fill('#sName','Testy');await A.fill('#sTitle','<img src=x onerror=alert(1)> coilovers');await A.fill('#sPrice','700');await A.fill('#sDesc','Came off my car, about 10k miles, no leaks.');await A.selectOption('#sCity','Blaine');
 await A.click('#sellForm button[type=submit]');await A.waitForFunction(()=>location.hash.startsWith('#item-'),{timeout:15000});await A.waitForTimeout(300);
 const h=await A.evaluate(()=>location.hash);console.log('A posted',h,await A.textContent('.post-title'),'imgs ok',await A.evaluate(()=>[...document.images].filter(i=>i.complete&&!i.naturalWidth).length),'delete',await A.locator('[data-act=deletePost]').count());
 await B.goto(U);await B.waitForTimeout(900);console.log('B first window',await B.locator('.window h3').allTextContents().then(x=>x.filter(t=>t.includes('coilovers')&&t.includes('onerror')).length));
 await B.goto(U+h);await B.waitForTimeout(800);console.log('B sees',await B.textContent('.post-title'),'seller',(await B.textContent('.attrs:nth-of-type(2)')).replace(/\s+/g,' ').slice(0,60),'B delete btn',await B.locator('[data-act=deletePost]').count(),'broken',await B.evaluate(()=>[...document.images].filter(i=>i.complete&&!i.naturalWidth).length),'thumbs',await B.locator('.thumbs button').count());
 await B.screenshot({path:O+'/b1.png'});
 // auction + bid across visitors
 await A.evaluate(()=>{location.hash='sell'});await A.waitForTimeout(200);await A.setInputFiles('#sPhotos',[O+'/up_b.jpg']);await A.waitForTimeout(400);await A.fill('#sName','Testy');await A.selectOption('#sKind','cars');await A.fill('#sTitle','1995 3000GT VR-4');await A.fill('#sYear','1995');await A.fill('#sMiles','120000');await A.selectOption('#sMode','auction');await A.fill('#sPrice','9000');await A.fill('#sDesc','Runs great, new timing belt, needs paint.');await A.click('#sellForm button[type=submit]');await A.waitForFunction(()=>document.querySelector('.post-title')&&document.querySelector('.post-title').textContent.includes('3000GT'),{timeout:15000});const h2=await A.evaluate(()=>location.hash);
 await B.goto(U+h2);await B.waitForTimeout(800);await B.fill('#bidAmt','9500');await B.click('#bidForm button');await B.waitForTimeout(400);console.log('B bid',await B.textContent('.big-price'),'end btn',await B.locator('[data-act=endAuction]').count());
 const r=await fetch(U+'api/listings');const j=await r.json();console.log('api price',j.listings.map(x=>[x.title.slice(0,18),x.price,x.bids,x.photos.length]));
 // abuse checks
 const rid=j.listings[0].rid;
 console.log('del no token',(await fetch(U+`api/listings/${rid}`,{method:'DELETE'})).status);
 console.log('bad photo',(await fetch(U+`api/listings/${rid}/photos`,{method:'POST',headers:{'x-post-token':'nope'},body:'x'})).status);
 const bad=await fetch(U+'api/listings',{method:'POST',body:JSON.stringify({title:'abcd',d:'descdescdesc',sellerName:'xx',price:5,cat:'Evil',city:'Nowhere',cond:'New',meetup:'x'})});console.log('bad cat',bad.status,await bad.text());
 const mk=async()=>{const r=await fetch(U+'api/listings',{method:'POST',body:JSON.stringify({title:'spam post',d:'spam spam spam spam',sellerName:'sp',price:5,cat:'Engine',city:'Lynden',cond:'New',meetup:'Pick up only'})});return r.status};const st=[];for(let i=0;i<5;i++)st.push(await mk());console.log('rate',st);
 // pending spam stays hidden; flag hide simulated: same ip only counts once
 for(let i=0;i<4;i++)await fetch(U+`api/listings/${rid}/flag`,{method:'POST'});console.log('still visible after 1 ip flags',(await (await fetch(U+'api/listings')).json()).listings.length);
 // reload keeps ownership, delete works
 await A.reload();await A.waitForTimeout(900);await A.click('[data-act=deletePost]');await A.waitForTimeout(500);console.log('after delete api',(await (await fetch(U+'api/listings')).json()).listings.map(x=>x.title.slice(0,18)));
 console.log('errors',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
