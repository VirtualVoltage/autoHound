// Email confirmation codes. After signup the site emails a 6-digit code from support@autohound.online.
// Codes are stored only as a salted hash, expire after 15 minutes, and allow 5 guesses.
// Sending uses Resend when RESEND_API_KEY is set. Without it, nothing is sent and the site says so.
import { fail, json, sha256Hex, readJsonFile, writeJsonFile, hit } from './http.js';
import { requireAccount, cleanEmail } from './auth.js';
import { ensureSchemaOnce } from './rebuild.js';

export const FROM = 'Autohound <support@autohound.online>';
const CODE_MINUTES = 15, MAX_GUESSES = 5, RESEND_GAP_MS = 60e3, SENDS_PER_HOUR = 5;

// Returns true when the email was handed to a sending service.
export async function sendEmail(env, { to, subject, text }) {
  if (env?.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, text, reply_to: 'support@autohound.online' }),
    });
    if (!r.ok) { console.error('Email send failed', r.status, (await r.text()).slice(0, 300)); fail(502, 'The code couldn\'t be sent right now. Try again in a minute.'); }
    return true;
  }
  // Local testing only: prints the email instead of sending it.
  if (env?.EMAIL_LOG === '1') { console.log(`EMAIL to=${to} subject=${subject}\n${text}`); return true; }
  return false;
}
export const sendingReady = env => !!(env?.RESEND_API_KEY || env?.EMAIL_LOG === '1');

const randomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0');
async function accountFile(ctx, a) { return (await readJsonFile(ctx.store, `${a.path}/account.json`)) || {}; }

// Sends a fresh code to the account's email. Used right after signup and by "Send a new code".
export async function sendCode(ctx, a, { quiet = false } = {}) {
  await ensureSchemaOnce(ctx.db);
  const file = await accountFile(ctx, a);
  if (!file.email) fail(400, 'This account has no email yet.');
  if (file.email_verified) return { sent: false, verified: true };
  if (!sendingReady(ctx.env)) return { sent: false, ready: false };
  const last = await ctx.db.get('SELECT sent FROM email_codes WHERE account_id=?', a.id);
  if (last && Date.now() - last.sent < RESEND_GAP_MS) { if (quiet) return { sent: false, wait: true }; fail(429, 'A code was just sent. Wait a minute before asking for another.'); }
  if (!await hit(ctx.db, 'email-code:' + a.id, SENDS_PER_HOUR, 3600e3)) fail(429, 'Too many codes sent. Try again in an hour.');
  const code = randomCode(), salt = crypto.randomUUID();
  await ctx.db.run('INSERT INTO email_codes(account_id,email,salt,code_hash,expires,guesses,sent) VALUES(?,?,?,?,?,0,?) ON CONFLICT(account_id) DO UPDATE SET email=excluded.email, salt=excluded.salt, code_hash=excluded.code_hash, expires=excluded.expires, guesses=0, sent=excluded.sent',
    a.id, file.email, salt, await sha256Hex(salt + code), Date.now() + CODE_MINUTES * 60e3, Date.now());
  await sendEmail(ctx.env, { to: file.email, subject: `Your Autohound code: ${code}`,
    text: `Hi ${a.username},\n\nYour Autohound code is ${code}\n\nType it on the site to confirm this email. It works for ${CODE_MINUTES} minutes.\nIf you didn't sign up for Autohound, you can ignore this email.\n\nAutohound\nsupport@autohound.online` });
  return { sent: true };
}

export async function verifyStatus(ctx) {
  const a = await requireAccount(ctx.db, ctx.request), file = await accountFile(ctx, a);
  return json({ email: file.email || null, verified: !!file.email_verified, ready: sendingReady(ctx.env), login_codes: !!file.login_codes });
}
// Adds an email to an account that has none (older accounts), or fixes one that isn't confirmed yet.
// A confirmed email can't be changed here. A confirmation code is sent right after, when sending works.
export async function setEmail(ctx) {
  const a = await requireAccount(ctx.db, ctx.request);
  await ensureSchemaOnce(ctx.db);
  const file = await accountFile(ctx, a);
  if (file.email && file.email_verified) fail(400, 'Your email is already confirmed.');
  const email = cleanEmail((await ctx.request.json().catch(() => ({}))).email);
  if (file.email === email) return json({ email, ...(await sendCode(ctx, a, { quiet: true })) });
  if (!await hit(ctx.db, 'set-email:' + a.id, 10, 3600e3)) fail(429, 'Too many email changes. Try again in an hour.');
  if (await ctx.db.get('SELECT id FROM accounts WHERE lower(email)=lower(?) AND id<>?', email, a.id)) fail(409, 'That email is already on another account.');
  try { await ctx.db.run('UPDATE accounts SET email=?, email_verified=0 WHERE id=?', email, a.id); }
  catch { fail(409, 'That email is already on another account.'); }
  file.email = email; file.email_verified = false;
  await writeJsonFile(ctx.store, `${a.path}/account.json`, file);
  await ctx.db.run('DELETE FROM email_codes WHERE account_id=?', a.id);
  return json({ email, ...(await sendCode(ctx, a, { quiet: true })) });
}
export async function resendCode(ctx) {
  const a = await requireAccount(ctx.db, ctx.request);
  return json(await sendCode(ctx, a));
}
export async function checkCode(ctx) {
  const a = await requireAccount(ctx.db, ctx.request);
  await ensureSchemaOnce(ctx.db);
  const code = String((await ctx.request.json().catch(() => ({}))).code || '').replace(/\D/g, '');
  if (code.length !== 6) fail(400, 'Enter the 6-digit code from the email.');
  const row = await ctx.db.get('SELECT * FROM email_codes WHERE account_id=?', a.id), file = await accountFile(ctx, a);
  if (file.email_verified) return json({ verified: true });
  if (!row || row.email !== file.email || row.expires < Date.now()) fail(400, 'That code has expired. Send a new one.');
  if (row.guesses >= MAX_GUESSES) fail(429, 'Too many wrong tries. Send a new code.');
  if (await sha256Hex(row.salt + code) !== row.code_hash) {
    await ctx.db.run('UPDATE email_codes SET guesses=guesses+1 WHERE account_id=?', a.id);
    fail(400, `That code isn't right. ${MAX_GUESSES - row.guesses - 1} tries left.`);
  }
  file.email_verified = true;
  await writeJsonFile(ctx.store, `${a.path}/account.json`, file);
  await ctx.db.run('UPDATE accounts SET email_verified=1 WHERE id=?', a.id);
  await ctx.db.run('DELETE FROM email_codes WHERE account_id=?', a.id);
  return json({ verified: true });
}

// ---------- optional login codes (two-step login) ----------
// Off by default. Turned on in account settings, saved as "login_codes": true in account.json.
// Needs a confirmed email and working email sending, so nobody gets locked out.
const LOGIN_CODE_MINUTES = 10;
const hint = email => { const [u, d] = email.split('@'); return `${u.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(6, u.length - 1)))}@${d}`; };
export async function loginCodesOn(ctx, a) {
  const file = await accountFile(ctx, a);
  return !!(file.login_codes && file.email && file.email_verified && sendingReady(ctx.env));
}
export async function sendLoginCode(ctx, a) {
  await ensureSchemaOnce(ctx.db);
  if (!await hit(ctx.db, 'login-code:' + a.id, SENDS_PER_HOUR, 3600e3)) fail(429, 'Too many login codes sent. Try again in an hour.');
  const file = await accountFile(ctx, a), code = randomCode(), salt = crypto.randomUUID(), ticket = [...crypto.getRandomValues(new Uint8Array(24))].map(x => x.toString(16).padStart(2, '0')).join('');
  await ctx.db.run('DELETE FROM login_codes WHERE expires<?', Date.now());
  await ctx.db.run('INSERT INTO login_codes(ticket_hash,account_id,salt,code_hash,expires,guesses) VALUES(?,?,?,?,?,0)', await sha256Hex(ticket), a.id, salt, await sha256Hex(salt + code), Date.now() + LOGIN_CODE_MINUTES * 60e3);
  await sendEmail(ctx.env, { to: file.email, subject: `Your Autohound login code: ${code}`,
    text: `Hi ${a.username},\n\nYour Autohound login code is ${code}\n\nIt works for ${LOGIN_CODE_MINUTES} minutes. If you didn't just try to log in, change your password.\n\nAutohound\nsupport@autohound.online` });
  return { ticket, email_hint: hint(file.email) };
}
export async function checkLoginCode(ctx, ticket, rawCode) {
  await ensureSchemaOnce(ctx.db);
  const code = rawCode.replace(/\D/g, '');
  if (!/^[0-9a-f]{48}$/.test(ticket)) fail(400, 'That login has expired. Log in again.');
  if (code.length !== 6) fail(400, 'Enter the 6-digit code from the email.');
  const key = await sha256Hex(ticket), row = await ctx.db.get('SELECT * FROM login_codes WHERE ticket_hash=?', key);
  if (!row || row.expires < Date.now()) fail(400, 'That login has expired. Log in again.');
  if (row.guesses >= MAX_GUESSES) { await ctx.db.run('DELETE FROM login_codes WHERE ticket_hash=?', key); fail(429, 'Too many wrong tries. Log in again.'); }
  if (await sha256Hex(row.salt + code) !== row.code_hash) {
    await ctx.db.run('UPDATE login_codes SET guesses=guesses+1 WHERE ticket_hash=?', key);
    fail(400, `That code isn't right. ${MAX_GUESSES - row.guesses - 1} tries left.`);
  }
  await ctx.db.run('DELETE FROM login_codes WHERE ticket_hash=?', key);
  return ctx.db.get('SELECT * FROM accounts WHERE id=?', row.account_id);
}
export async function setLoginCodes(ctx) {
  const a = await requireAccount(ctx.db, ctx.request), on = (await ctx.request.json().catch(() => ({}))).on === true, file = await accountFile(ctx, a);
  if (on && !file.email_verified) fail(400, 'Confirm your email first.');
  if (on && !sendingReady(ctx.env)) fail(400, 'Email codes aren\'t switched on for the site yet.');
  file.login_codes = on;
  await writeJsonFile(ctx.store, `${a.path}/account.json`, file);
  return json({ login_codes: on });
}
