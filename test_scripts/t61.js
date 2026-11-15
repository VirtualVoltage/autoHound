// Crawler-friendly public pages: listing and seller pages are addressed by title and username (no IDs), and arrive with
// their own title, description, preview tags, product details and a plain text copy before any page code runs.
// Older ID addresses are sent on to the new ones. Sold listings are noindex, missing ones answer 404.
// Usage: node test_scripts/t61.js <url>   (node after fresh-store.sh, or wrangler)
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://127.0.0.1:8791';
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const ID = /[ALPFCME]\.\d\d\.\d\d\.\d\d\.\d{5,}/;
const pick = (html, re) => (html.match(re) || [])[1];
const unesc = s => s?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const raw = async path => { const r = await ctx.request.get(U + path, { maxRedirects: 0 }); return { status: r.status(), html: await r.text(), to: r.headers().location }; };
  const live = (await (await ctx.request.get(U + '/api/listings?limit=100')).json()).listings;
  ok(live.every(l => /^\/listing\/[a-z0-9-]+$/.test(l.url) && !ID.test(l.url) && /^\/seller\/[^/]+$/.test(l.seller.url) && !ID.test(l.seller.url)), `every listing and seller has a title address, e.g. ${live[0].url} and ${live[0].seller.url}`);
  ok(new Set(live.map(l => l.url)).size === live.length, 'no two listings share an address');
  for (const l of [live.find(x => x.kind === 'parts'), live.find(x => x.kind === 'cars'), live.find(x => x.sell_type === 'auction')].filter(Boolean)) {
    const { status, html } = await raw(l.url), title = unesc(pick(html, /<title>([^<]*)<\/title>/));
    ok(status === 200 && title === `${l.title} - Autohound`, `${l.url} -> title: ${title}`);
    const desc = unesc(pick(html, /<meta name="description" content="([^"]*)"/));
    ok(desc.includes(l.city) && desc.includes(l.description.slice(0, 30)) && desc.length <= 160, `description: ${desc}`);
    ok(pick(html, /<link rel="canonical" href="([^"]*)"/) === 'https://autohound.online' + l.url && pick(html, /property="og:url" content="([^"]*)"/) === 'https://autohound.online' + l.url, 'canonical address is the title address');
    ok(unesc(pick(html, /property="og:title" content="([^"]*)"/)) === l.title && /property="og:image" content="https:\/\/autohound\.online\/api\/files\//.test(html), 'link preview title and photo');
    let d = null; try { d = JSON.parse(pick(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)); } catch {}
    ok(d && d.name === l.title && d.offers.price === l.price && d.offers.priceCurrency === 'USD' && d.offers.availability.endsWith('InStock') && d.image?.length > 0 && d.url.endsWith(l.url), 'product details (name, price, in stock, photos)');
    ok(l.kind !== 'cars' || (d && d['@type'].includes('Car') && d.mileageFromOdometer?.value >= 0), 'cars carry year and miles');
    const plain = pick(html, /<noscript>([\s\S]*?)<\/noscript>/) || '';
    ok(plain.includes(`<h1>`) && unesc(plain).includes(l.title) && unesc(plain).includes(l.description) && plain.includes(l.seller.url) && !/noindex/.test(html), 'plain text copy for bots that run no code, page indexable');
    ok(!ID.test(html.replace(/\/api\/files\/P\.[\d.]+/g, '')), 'no IDs anywhere in the page except photo file addresses');
    ok(!/email|private|password/i.test(html.replace(l.description, '')), 'nothing private in the page');
    // Older addresses
    for (const old of [`/listing/${l.id}`, `/listing/some-old-title-${l.url.split('-').pop()}`, l.url + '/']) { const r = await raw(old); ok(r.status === 301 && r.to === l.url, `${old} is sent on to the title address`); }
    const q = await raw(`/listing/${l.id}?chat=abc`); ok(q.status === 301 && q.to === l.url + '?chat=abc', 'the rest of the address is kept');
  }
  // In a browser: an old ID link ends on the title address, and every link on the page is a title address.
  const l = live[0];
  await p.goto(U + '/listing/' + l.id); await p.waitForFunction(t => document.body.innerText.includes(t), l.title);
  ok(new URL(p.url()).pathname === l.url && await p.title() === l.title + ' - Autohound', `old ID link opens ${new URL(p.url()).pathname}`);
  ok(await p.locator('script[type="application/ld+json"]').count() === 1, 'product details still in the page after it loads');
  const links = async () => p.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
  let hrefs = await links(); ok(hrefs.includes(l.seller.url) && !hrefs.some(h => ID.test(h)), 'listing page links carry no IDs');
  await p.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForSelector('.window');
  hrefs = await links(); ok(live.slice(0, 5).every(x => hrefs.includes(x.url)) && !hrefs.some(h => ID.test(h)), 'home page links to listings by title, no IDs');
  ok(await p.title() === 'Autohound' && await p.locator('[data-page]').count() === 0, 'home is titled Autohound and drops the listing\'s tags');
  // Opened inside the app with an old address, the address bar is corrected too.
  const other = live.find(x => x.id !== l.id);
  await p.evaluate(id => { history.pushState({}, '', '/listing/' + id); dispatchEvent(new PopStateEvent('popstate')); }, other.id);
  await p.waitForFunction(u => location.pathname === u, other.url).then(() => ok(true, 'old address opened inside the app is corrected'), () => ok(false, 'old address opened inside the app is corrected'));
  await p.goto(U + '/map'); await p.waitForTimeout(1500);
  const map = await (await ctx.request.get(U + '/api/map')).json(); ok(map.listings.every(x => x.url && !ID.test(x.url)), 'map pins link by title');
  // Seller page
  const s = await raw(l.seller.url), st = unesc(pick(s.html, /<title>([^<]*)<\/title>/));
  ok(s.status === 200 && st === `${l.seller.username} - Autohound`, `${l.seller.url} -> title: ${st}`);
  ok(s.html.includes(`<a href="${l.url}">`) && pick(s.html, /<link rel="canonical" href="([^"]*)"/) === 'https://autohound.online' + l.seller.url && !ID.test(s.html.replace(/\/api\/files\/P\.[\d.]+/g, '')), 'seller page links its listings, no IDs');
  for (const old of [`/seller/${l.seller.id}`, `/seller/${encodeURIComponent(l.seller.username.toUpperCase())}`]) { const r = await raw(old); ok(r.status === 301 && r.to === l.seller.url, `${old} is sent on to ${l.seller.url}`); }
  await p.goto(U + '/seller/' + l.seller.id); await p.waitForFunction(t => document.body.innerText.toLowerCase().includes(t), l.seller.username.toLowerCase());
  ok(new URL(p.url()).pathname === l.seller.url && !(await links()).some(h => ID.test(h)), 'seller page in a browser: username address, no IDs in links');
  // Missing, removed and private pages
  for (const path of ['/listing/L.99.01.01.00000', '/listing/nonsense', '/listing/no-such-thing-zzzzzz', '/seller/A.99.01.01.00000', '/seller/nobody_by_this_name', `/listing/${l.seller.id}`]) {
    const r = await raw(path);
    ok(r.status === 404 && /name="robots" content="noindex"/.test(r.html) && r.html.includes('<title>Autohound</title>') && r.html.includes('js/app.js'), `${path} answers 404, noindex, and still loads the site`);
  }
  for (const path of ['/', '/map', `/listing/${l.id}/edit`, '/login']) {
    const r = await raw(path);
    ok(r.status === 200 && r.html.includes('<title>Autohound</title>') && !r.html.includes('data-page'), `${path} is served as before`);
  }
  // Sitemap
  const sm = await (await ctx.request.get(U + '/sitemap.xml')).text();
  ok(live.every(x => sm.includes(`<loc>https://autohound.online${x.url}</loc>`)) && sm.includes(`<loc>https://autohound.online${l.seller.url}</loc>`) && !ID.test(sm), 'sitemap lists the title addresses, no IDs');
  // Sold: the seller marks one sold; its page stays up for people but is taken out of search results. A new title moves the address.
  await p.goto(U + '/login'); await p.waitForSelector('#login'); await p.fill('#login', 'boost brandon'); await p.fill('#password', 'turbotime1'); await p.click('#authForm button[type=submit]'); await p.waitForSelector('.window');
  const mine = await p.evaluate(async () => { const me = (await (await fetch('/api/me')).json()).account.id; const d = await (await fetch('/api/listings?limit=100')).json(); return d.listings.filter(x => x.seller.id === me && x.sell_type === 'post'); });
  const patch = (id, body) => p.evaluate(([id, body]) => fetch('/api/listings/' + id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) })), [id, body]);
  const sold = await patch(mine[0].id, { action: 'sold' });
  const r = await raw(mine[0].url);
  ok(sold.status === 200 && r.status === 200 && /name="robots" content="noindex"/.test(r.html) && !r.html.includes('ld+json') && !r.html.includes('og:title'), 'sold listing: page stays, marked noindex, no product details');
  if (mine[1]) {
    await p.goto(U + `/listing/${mine[1].id}/edit`); await p.waitForSelector('#editForm');
    const titleBox = p.locator('#eTitle');
    if (await titleBox.count()) {
      await titleBox.fill('Renamed part for the address test'); await p.locator('#editForm button[type=submit]').first().click();
      await p.waitForFunction(() => /^\/listing\/renamed-part-for-the-address-test-/.test(location.pathname)).then(() => ok(true, 'a new title gives a new address: ' + new URL(p.url()).pathname), () => ok(false, 'a new title gives a new address (' + p.url() + ')'));
      const back = await raw(mine[1].url); ok(back.status === 301 && /^\/listing\/renamed-part-for-the-address-test-/.test(back.to), 'the address from before the rename is sent on to the new one');
    } else ok(false, 'edit form title box not found');
  }
  ok(!errs.length, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
})();
