// Loads pages the way Google does: every request that robots.txt disallows is blocked.
// Listing, seller, home and map pages must still show their content; private addresses must stay disallowed.
// Usage: node test_scripts/t59.js <url>   (node after fresh-store.sh, or wrangler)
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://127.0.0.1:8791';
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
// Google's rules: the longest matching rule wins, Allow wins a tie, * matches anything, $ ends the path.
const parse = txt => txt.split('\n').map(l => l.replace(/#.*/, '').trim()).map(l => l.match(/^(Allow|Disallow):\s*(\S+)/i)).filter(Boolean).map(m => ({ allow: /^allow$/i.test(m[1]), pat: m[2], re: new RegExp('^' + m[2].replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$|\$$/, '$')) }));
const allowed = (rules, path) => { let best = null; for (const r of rules) if (r.re.test(path) && (!best || r.pat.length > best.pat.length || (r.pat.length === best.pat.length && r.allow))) best = r; return !best || best.allow; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  const rules = parse(await (await ctx.request.get(U + '/robots.txt')).text());
  const must = { '/': 1, '/map': 1, '/listing/L.1': 1, '/seller/A.1': 1, '/api/listings': 1, '/api/listings/L.1': 1, '/api/files/P.1': 1, '/api/accounts/A.1': 1, '/api/me': 1, '/api/options': 1, '/api/map': 1, '/v/abc/js/app.js': 1, '/sitemap.xml': 1,
    '/api/conversations': 0, '/api/conversations/C.1': 0, '/api/favorites': 0, '/api/me/email': 0, '/api/admin/inbox': 0, '/api/login': 0, '/api/signup': 0, '/api/setup': 0,
    '/account': 0, '/my-listings': 0, '/messages': 0, '/messages/C.1': 0, '/saved': 0, '/favorites': 0, '/sell': 0, '/sell?kind=car': 0, '/seller/A.1/x': 1, '/listing/L.1/edit': 0, '/login': 0, '/signup': 0, '/verify': 0, '/admin': 0, '/admin/E.1': 0 };
  for (const [p, want] of Object.entries(must)) ok(allowed(rules, p) === !!want, `${want ? 'allowed ' : 'blocked '} ${p}`);
  const blocked = [];
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.origin === new URL(U).origin && !allowed(rules, u.pathname + u.search)) { blocked.push(u.pathname); return r.abort(); } return r.continue(); });
  const p = await ctx.newPage();
  const live = (await (await ctx.request.get(U + '/api/listings?limit=5')).json()).listings;
  const l = live[0];
  await p.goto(U + '/listing/' + l.id); await p.waitForTimeout(2500);
  let text = await p.innerText('body');
  ok(text.includes(l.title), `listing page shows its title as Google sees it ("${l.title}")`);
  ok(text.includes(String(l.price.toLocaleString('en-US'))) || text.includes(String(l.price)), 'listing page shows the price');
  ok(await p.evaluate(() => [...document.images].some(i => i.complete && i.naturalWidth > 0 && i.src.includes('/api/files/'))), 'listing photo loads');
  await p.goto(U + '/seller/' + l.seller.id); await p.waitForTimeout(2000);
  text = await p.innerText('body'); ok(text.toLowerCase().includes(l.seller.username.toLowerCase()), `seller page shows the seller (${l.seller.username})`);
  await p.goto(U + '/'); await p.waitForTimeout(2000);
  text = await p.innerText('body'); ok(live.slice(0, 3).some(x => text.includes(x.title)), 'home page shows listings');
  ok(blocked.length === 0, `no requests blocked on public pages (${[...new Set(blocked)].join(', ') || 'none'})`);
  await b.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
})();
