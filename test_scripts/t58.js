// robots.txt and sitemap.xml: content types, only public pages, and the sitemap follows sold and removed listings.
// Usage: node test_scripts/t58.js <url> <store folder>   (after fresh-store.sh; works on wrangler too with the store folder left out)
const { chromium } = require('playwright');
const [U, store] = [process.argv[2] || 'http://127.0.0.1:8791', process.argv[3]];
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const locs = x => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext()).newPage();
  const get = async path => { const r = await p.request.get(U + path); return { type: r.headers()['content-type'], text: await r.text(), status: r.status() }; };
  for (const path of ['/robots.txt', '/v/abc123/robots.txt']) {
    const r = await get(path);
    ok(r.status === 200 && r.type.startsWith('text/plain') && r.text.includes('Sitemap: https://autohound.online/sitemap.xml') && r.text.includes('Disallow: /api/'), `${path} is text/plain robots (${r.type})`);
  }
  let s = await get('/sitemap.xml');
  ok(s.status === 200 && s.type.startsWith('application/xml') && s.text.startsWith('<?xml'), `sitemap.xml is application/xml (${s.type})`);
  let urls = locs(s.text);
  ok(urls.every(u => u.startsWith('https://autohound.online/')), 'every address uses https://autohound.online');
  ok(urls.includes('https://autohound.online/') && urls.includes('https://autohound.online/map'), 'home and map listed');
  ok(urls.every(u => /^https:\/\/autohound\.online\/(|map|listing\/[a-z0-9-]+|seller\/[^\/]+)$/.test(u)), 'only home, map, listing and seller pages');
  ok(!/[ALPFCME]\.\d\d\.\d\d\.\d\d\.\d{5}/.test(s.text), 'addresses use titles and usernames, no IDs');
  ok(!/@|C\.\d|conversation|private|email/i.test(s.text), 'no emails, chats or private paths');
  const live = (await (await p.request.get(U + '/api/listings?limit=100')).json()).listings || [];
  const listed = urls.filter(u => u.includes('/listing/')).map(u => new URL(u).pathname);
  ok(live.length > 0 && live.every(l => listed.includes(l.url)), `all ${live.length} browsable live listings are in the sitemap (${listed.length} listed)`);
  const sellers = urls.filter(u => u.includes('/seller/')).map(u => new URL(u).pathname);
  ok(new Set(live.map(l => l.seller.id)).size === sellers.length && live.every(l => sellers.includes(l.seller.url)), `seller pages = accounts with live listings (${sellers.length})`);
  ok(/<lastmod>\d{4}-\d\d-\d\d<\/lastmod>/.test(s.text), 'listings carry lastmod dates');

  // Sell one listing and remove another as redline riley, then check they leave the sitemap.
  await p.goto(U + '/login'); await p.waitForSelector('#login');
  await p.fill('#login', 'redline riley'); await p.fill('#password', 'boost4life'); await p.click('#authForm button[type=submit]'); await p.waitForSelector('.window');
  const me = await p.evaluate(() => fetch('/api/me').then(r => r.json()));
  const mine = live.filter(l => l.seller.id === me.account.id);
  ok(mine.length >= 2, `redline riley has ${mine.length} live listings to test with`);
  const [sold, removed] = mine;
  for (const [l, action] of [[sold, 'sold'], [removed, 'delete']])
    ok((await p.evaluate(([id, action]) => fetch('/api/listings/' + id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }).then(r => r.status), [l.id, action])) === 200, `marked ${l.id} ${action}`);
  s = await get('/sitemap.xml'); urls = locs(s.text);
  ok(!urls.some(u => u.endsWith(sold.url) || u.endsWith(removed.url)), 'sold and removed listings left the sitemap');
  ok(urls.filter(u => u.includes('/listing/')).length === listed.length - 2, 'every other listing is still there');
  const left = mine.length - 2;
  ok(urls.includes(`https://autohound.online${me.account.url}`) === left > 0, `seller page kept only while they still have live listings (${left} left)`);
  if (store) require('fs').writeFileSync(store + '/../out/t58-sitemap.xml', s.text);
  await b.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
})();
