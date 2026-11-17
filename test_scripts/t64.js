// HTML first, email steps: with JavaScript off, a new account confirms its email with the emailed code (required while
// email can be sent, so other pages send it to the confirm page), is told to wait before asking for another code, turns on two-step login, and logs in
// with the emailed login code. Start the server with EMAIL_LOG=1 so codes go to its log instead of out by email.
// Usage: node test_scripts/t64.js <url> <server log file>
const { chromium } = require('playwright');
const fs = require('fs');
const [U, LOG] = process.argv.slice(2);
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const codeFor = (to, kind) => { const m = [...fs.readFileSync(LOG, 'utf8').matchAll(new RegExp(`EMAIL to=${to.replace(/[.+]/g, '\\$&')} subject=Your Autohound ${kind}: (\\d{6})`, 'g'))]; return m.length ? m[m.length - 1][1] : null; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, javaScriptEnabled: false }), p = await ctx.newPage();
  const name = 'mail plain ' + Date.now().toString(36), email = name.replace(/\s/g, '') + '@example.com', pw = 'mailpass1';
  await p.goto(U + '/signup'); await p.fill('#username', name); await p.fill('#email', email); await p.fill('#password', pw); await p.click('#authForm button[type=submit]'); await p.waitForLoadState();
  ok(p.url().includes('/verify') && (await p.innerText('main')).includes(email), 'signup goes to the confirm page');
  await p.goto(U + '/saved');
  ok(p.url().includes('/verify?next=%2Fsaved'), 'other pages send an unconfirmed account to the confirm page');
  await p.fill('#code', '000000'); await p.click('#verifyForm button[type=submit]'); await p.waitForLoadState();
  ok(!(await p.isHidden('#verifyErr')), `wrong code refused: ${await p.textContent('#verifyErr')}`);
  // A code went out at signup, so asking again right away is refused until a minute has passed.
  await p.click('#resendBtn'); await p.waitForLoadState();
  ok(/Wait a minute/.test(await p.textContent('#verifyErr')) && p.url().includes('next='), `Resend code too soon: ${await p.textContent('#verifyErr')}`);
  const code = codeFor(email, 'code');
  await p.fill('#code', code); await p.click('#verifyForm button[type=submit]'); await p.waitForLoadState();
  ok(p.url().endsWith('/saved'), 'right code confirms the email and goes on to the page asked for');
  await p.goto(U + '/account');
  ok((await p.innerText('main')).includes('confirmed'), 'account settings show the email as confirmed');
  await p.click('#loginCodesBtn'); await p.waitForLoadState();
  ok(/Login code\s*On/i.test(await p.innerText('.security')), 'two-step login turned on without JavaScript');
  await p.click('#logoutBtn'); await p.waitForLoadState();
  await p.goto(U + '/login?next=/messages'); await p.fill('#login', email); await p.fill('#password', pw); await p.click('#authForm button[type=submit]'); await p.waitForLoadState();
  ok(await p.isVisible('#codeForm') && /login code/i.test(await p.innerText('main')), 'log in asks for the emailed login code');
  await p.fill('#loginCode', '000000'); await p.click('#codeForm button[type=submit]'); await p.waitForLoadState();
  ok(!(await p.isHidden('#codeErr')), `wrong login code refused: ${await p.textContent('#codeErr')}`);
  await p.fill('#loginCode', codeFor(email, 'login code')); await p.click('#codeForm button[type=submit]'); await p.waitForLoadState();
  ok(p.url().endsWith('/messages') && (await p.innerText('body')).includes('Log out'), 'right login code logs in and goes on to the page asked for');
  await b.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
})();
