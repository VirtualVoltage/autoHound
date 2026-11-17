// HTML first: every page and form works with JavaScript switched off (AGENTS.md).
// Browses, searches, filters, sorts, flips photos, saves, signs up, logs in and out, chats, bids, sells with a photo,
// edits, marks sold, deletes, changes account settings and uses admin delete, all as plain HTML forms and links.
// Also checks the phone menu opens without JavaScript, and that with JavaScript on the page keeps the server's HTML.
// Usage: node test_scripts/t63.js <url> [admin]   (after fresh-store.sh, which makes "redline riley" an admin; pass
// "noadmin" as the second argument on wrangler, whose store has no admin)
const { chromium, devices } = require('playwright');
const path = require('path');
const U = process.argv[2] || 'http://127.0.0.1:8791', ADMIN = process.argv[3] !== 'noadmin';
const FIX = path.join(__dirname, 'fixtures');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const text = async p => (await p.innerText('body')).replace(/\s+/g, ' ');
(async () => {
  const b = await chromium.launch();
  const plain = async (dev = { viewport: { width: 1300, height: 900 } }) => { const ctx = await b.newContext({ ...dev, javaScriptEnabled: false }); return { ctx, p: await ctx.newPage() }; };
  const login = async (p, who, pw) => { await p.goto(U + '/login'); await p.fill('#login', who); await p.fill('#password', pw); await p.click('#authForm button[type=submit]'); };
  const live = (await (await (await b.newContext()).request.get(U + '/api/listings?limit=100')).json()).listings;

  /* ---------- visitors ---------- */
  let { ctx, p } = await plain();
  await p.goto(U + '/');
  ok(await p.locator('.window').count() >= 20, `home lists ${await p.locator('.window').count()} listings with JavaScript off`);
  ok(await p.locator('link[rel=stylesheet][data-look]').count() === 1 && await p.evaluate(() => getComputedStyle(document.body).backgroundColor) !== 'rgba(0, 0, 0, 0)', 'the look\'s stylesheet is in the HTML and applies');
  await p.fill('#searchInput', 'coilovers'); await p.press('#searchInput', 'Enter'); await p.waitForLoadState();
  ok(p.url().includes('/?q=coilovers') && (await text(p)).toLowerCase().includes('coilovers') && await p.locator('.window').count() > 0, `header search works: ${await p.locator('.window').count()} results`);
  await p.goto(U + '/'); await p.fill('#minPrice', '1000'); await p.click('.price-range button[type=submit]'); await p.waitForLoadState();
  const prices = await p.$$eval('.window .money', n => n.map(x => +x.textContent.replace(/\D/g, '')));
  ok(p.url().includes('min=1000') && prices.length > 0 && prices.every(x => x >= 1000), `price filter (Go button) keeps ${prices.length} listings at $1,000 or more`);
  await p.click('[data-sort="low"]'); await p.waitForLoadState();
  const low = await p.$$eval('.window .money', n => n.map(x => +x.textContent.replace(/\D/g, '')));
  ok(p.url().includes('sort=low') && p.url().includes('min=1000') && low.every((x, i) => !i || x >= low[i - 1]), 'sort buttons work and keep the filter');
  const multi = live.find(l => l.kind === 'cars') || live[0];
  await p.goto(U + multi.url);
  ok((await text(p)).includes(multi.title) && (await text(p)).includes('$' + multi.price.toLocaleString('en-US')), 'listing page shows title and price');
  const thumbs = await p.locator('#thumbs a').count();
  if (thumbs > 1) {
    const first = await p.getAttribute('#mainPhoto img.ph-full', 'src');
    await p.click('#thumbs a >> nth=1'); await p.waitForLoadState();
    ok(p.url().includes('photo=1') && await p.getAttribute('#mainPhoto img.ph-full', 'src') !== first && await p.textContent('#photoCount') === `2 / ${thumbs}`, 'thumbnail links change the big photo');
    await p.click('#photoNext'); await p.waitForLoadState();
    ok(p.url().includes(`photo=${2 % thumbs}`), 'next arrow is a link too');
  }
  ok(!await p.isVisible('#photoFull'), 'full screen button (needs JavaScript) is hidden');
  await p.click('.seller-btn, .seller-card'); await p.waitForLoadState();
  ok(p.url().includes('/seller/') && await p.locator('.window').count() > 0, 'seller link opens the seller page with listings');
  await p.goto(U + '/map');
  ok(await p.isVisible('.map-list') && await p.locator('.map-list a').count() > 0, `map page lists ${await p.locator('.map-list a').count()} listings by town`);
  await p.goto(U + multi.url); await p.click('[data-act="favorite"]'); await p.waitForLoadState();
  ok(p.url().includes('/login?next='), 'saving as a visitor goes to log in');
  await p.fill('#login', 'redline riley'); await p.fill('#password', 'wrong-password'); await p.click('#authForm button[type=submit]'); await p.waitForLoadState();
  ok(p.url().includes('/login?next=') && /don.t match/.test(await p.textContent('#authErr')) && await p.inputValue('#login') === 'redline riley', 'wrong password shows the error, keeps the login and where to go next');
  await p.fill('#password', 'boost4life'); await p.click('#authForm button[type=submit]'); await p.waitForLoadState();
  ok(p.url() === U + multi.url && (await text(p)).includes('Log out'), 'right password goes back to the listing');
  await p.click('form[action="/logout"] button'); await p.waitForLoadState();
  for (const priv of ['/account', '/messages', '/saved', '/sell', '/my-listings']) { await p.goto(U + priv); ok(p.url().includes('/login?next=' + encodeURIComponent(priv)), `${priv} asks visitors to log in`); }
  await ctx.close();

  /* ---------- a new account, signed up without JavaScript ---------- */
  ({ ctx, p } = await plain());
  const name = 'plain html ' + Date.now().toString(36);
  await p.goto(U + '/signup'); await p.fill('#username', name); await p.fill('#email', name.replace(/\s/g, '') + '@example.com'); await p.fill('#password', 'abc'); await p.click('#authForm button[type=submit]');
  ok(/6 to 15/.test(await p.textContent('#authErr')) && await p.inputValue('#username') === name, 'too short password: error, username kept');
  await p.fill('#password', 'plainpass1'); await p.click('#authForm button[type=submit]'); await p.waitForLoadState();
  ok(!p.url().includes('/signup'), `signed up without JavaScript, now at ${p.url().replace(U, '')}`);
  if (p.url().includes('/verify')) { await p.click('a.btn.plain >> text=Continue').catch(() => {}); await p.waitForLoadState(); }
  ok((await text(p)).includes('Log out'), 'logged in after signup');
  // Message a seller and save the listing.
  const target = live.find(l => l.seller.username === 'redline riley' && l.sell_type !== 'auction') || live.find(l => l.seller.username === 'redline riley');
  await p.goto(U + target.url); await p.click('[data-act="favorite"]'); await p.waitForLoadState();
  await p.goto(U + '/saved');
  ok((await text(p)).includes(target.title), 'save star works: listing is on Saved');
  await p.goto(U + target.url); await p.fill('#msgText', 'Is this still available? (no JavaScript)'); await p.click('#composer button[type=submit]'); await p.waitForLoadState();
  ok((await text(p)).includes('Is this still available? (no JavaScript)'), 'first message from the listing page shows in the chat box');
  await p.fill('#msgText', 'Second one, with a photo'); await p.setInputFiles('#attachInput', path.join(FIX, 'up_a.jpg')); await p.click('#composer button[type=submit]'); await p.waitForLoadState();
  ok((await text(p)).includes('Second one, with a photo') && await p.locator('#thread img').count() >= 1, 'reply with a photo attachment');
  const auction = live.find(l => l.sell_type === 'auction' && l.seller.username !== name);
  if (auction) {
    await p.goto(U + auction.url); await p.fill('#bidAmt', '1'); await p.click('#bidForm button[type=submit]'); await p.waitForLoadState();
    ok(/or more/.test(await p.textContent('#bidErr')), 'too low bid shows the error');
    const min = +(await p.getAttribute('#bidAmt', 'min')); await p.fill('#bidAmt', String(min)); await p.click('#bidForm button[type=submit]'); await p.waitForLoadState();
    ok((await text(p)).includes('$' + min.toLocaleString('en-US')) && (await text(p)).includes('1 bids'), `bid of $${min} placed`);
  }
  // Sell with a photo, edit, mark sold, delete.
  await p.goto(U + '/sell'); await p.fill('#sTitle', 'Plain HTML test intake'); await p.click('#pubBtn'); await p.waitForLoadState();
  ok(/at least one photo/.test(await p.textContent('#sellErr')) && await p.inputValue('#sTitle') === 'Plain HTML test intake', 'sell form: missing parts listed, title kept');
  await p.setInputFiles('#sPhotos', [path.join(FIX, 'up_a.jpg'), path.join(FIX, 'up_b.jpg')]);
  await p.fill('#sPrice', '125'); await p.fill('#sDesc', 'Posted with JavaScript switched off, two photos.'); await p.click('#pubBtn'); await p.waitForLoadState();
  ok(/\/listing\/plain-html-test-intake/.test(p.url()) && await p.locator('#thumbs a').count() === 2, `sold with two photos: ${p.url().replace(U, '')}`);
  await p.click('a.btn >> text=Edit'); await p.waitForLoadState();
  await p.fill('#eTitle', 'Plain HTML test intake, edited'); await p.fill('#ePrice', '0'); await p.click('#editForm button[type=submit]'); await p.waitForLoadState();
  ok(p.url().endsWith('/edit') && !(await p.isHidden('#editErr')) && await p.inputValue('#eTitle') === 'Plain HTML test intake, edited', `edit error shown, words kept (${await p.textContent('#editErr')})`);
  await p.fill('#ePrice', '140'); await p.click('#editForm button[type=submit]'); await p.waitForLoadState();
  ok(/plain-html-test-intake-edited/.test(p.url()) && (await text(p)).includes('$140'), 'edit saved: new title address and price');
  const mine = p.url();
  await p.click('#soldBtn'); await p.waitForLoadState();
  ok((await text(p)).includes('has sold'), 'Mark sold works');
  await p.goto(U + '/sell');
  await p.fill('#sTitle', 'Plain HTML delete me'); await p.setInputFiles('#sPhotos', path.join(FIX, 'up_b.jpg')); await p.fill('#sPrice', '20'); await p.fill('#sDesc', 'This one gets deleted right away.'); await p.click('#pubBtn'); await p.waitForLoadState();
  const del = p.url();
  await p.click('#deleteBtn'); await p.waitForLoadState();
  ok(await p.textContent('#deleteBtn') === 'Press again to delete', 'delete asks twice');
  await p.click('#deleteBtn'); await p.waitForLoadState();
  ok(p.url().endsWith('/account'), 'deleted, back on account settings');
  ok((await (await ctx.request.get(del)).status()) === 404, 'deleted listing is gone');
  // Account settings.
  await p.setInputFiles('#photoInput', path.join(FIX, 'up_a.jpg')); await p.click('form[action="/account/photo"] button[type=submit]'); await p.waitForLoadState();
  ok(p.url().endsWith('/account') && /\/api\/files\//.test(await p.getAttribute('.profile img.avatar', 'src')), 'profile picture uploaded');
  await p.click('#logoutBtn'); await p.waitForLoadState();
  ok((await text(p)).includes('Log in') && !(await text(p)).includes('Log out'), 'Log out button works');
  void mine; await ctx.close();

  /* ---------- the seller answers, admin delete ---------- */
  ({ ctx, p } = await plain());
  await login(p, 'redline riley', 'boost4life'); await p.waitForLoadState();
  ok((await text(p)).includes('Log out'), 'log in without JavaScript (password stretched on the server)');
  await p.goto(U + target.url);
  ok(await p.locator('#chatTabs a').count() >= 1 && (await text(p)).includes('Is this still available? (no JavaScript)'), 'seller sees the buyer\'s chat in the chat box');
  await p.fill('#msgText', 'Yes it is. Reply sent without JavaScript.'); await p.click('#composer button[type=submit]'); await p.waitForLoadState();
  ok((await text(p)).includes('Reply sent without JavaScript.'), 'seller reply shows');
  await p.goto(U + '/messages');
  ok((await text(p)).includes(target.title), 'Messages page lists the chat');
  if (ADMIN) {
    const victim = live.find(l => l.seller.username !== 'redline riley' && l.sell_type !== 'auction' && l.id !== target.id);
    await p.goto(U + victim.url); await p.click('#adminDeleteBtn'); await p.waitForLoadState();
    ok(await p.isVisible('#adminDeleteForm'), 'Admin delete link opens the password form');
    await p.fill('#adminPw', 'nope-nope'); await p.click('#adminDeleteForm button[type=submit]'); await p.waitForLoadState();
    ok(/isn.t right/.test(await p.textContent('#adminDeleteErr')), 'wrong admin password refused');
    await p.fill('#adminPw', 'boost4life'); await p.click('#adminDeleteForm button[type=submit]'); await p.waitForLoadState();
    ok((await (await ctx.request.get(U + victim.url)).status()) === 404, 'admin delete removed the listing');
    await p.goto(U + '/admin'); ok((await text(p)).includes('Site inbox'), 'site inbox opens');
  }
  await ctx.close();

  /* ---------- phones ---------- */
  ({ ctx, p } = await plain(devices['iPhone 13']));
  await p.goto(U + '/');
  ok(await p.locator('link[data-look][href*="/mobile/"]').count() === 1, 'phones get the mobile look from the server');
  if (await p.locator('.waffle').count()) {
    await login(p, 'redline riley', 'boost4life'); await p.waitForLoadState();
    await p.click('.waffle');
    ok(await p.isVisible('#drawer') && await p.isVisible('#drawer a[href="/account"]'), 'waffle menu opens without JavaScript');
    await p.click('#drawer a[href="/my-listings"]'); await p.waitForLoadState();
    ok(p.url().endsWith('/my-listings'), 'menu links work');
  }
  await ctx.close();

  /* ---------- with JavaScript on, the server's HTML stays ---------- */
  const js = await b.newContext({ viewport: { width: 1300, height: 900 } }), q = await js.newPage(), errs = [];
  q.on('pageerror', e => errs.push(e.message));
  await q.goto(U + multi.url);
  await q.evaluate(() => { window.firstMain = document.getElementById('main').firstElementChild; });
  await q.waitForTimeout(1500);
  ok(await q.evaluate(() => document.getElementById('main').firstElementChild === window.firstMain && !document.documentElement.classList.contains('no-js')), 'JavaScript keeps the server\'s page instead of rebuilding it');
  if (thumbs > 1) { await q.click('#thumbs a >> nth=1'); ok(!q.url().includes('photo='), 'with JavaScript, thumbnails switch photos in place'); }
  ok(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join('; ') : ''));
  await b.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
})();
