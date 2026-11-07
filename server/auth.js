import { LIMITS } from './config.js';
import { ApiError, fail, hit, json, readJson, readJsonFile, writeJsonFile, sha256Hex, clientKey } from './http.js';
import { nextId, folderName, letterFolder } from './ids.js';
import { checkWords } from './wordfilter.js';
import { ensureSchemaOnce } from './rebuild.js';
import { sendCode, sendLoginCode, checkLoginCode, loginCodesOn } from './verify.js';

const COOKIE = 'ah_session';
export const usernameKey = u => u.normalize('NFKC').replace(/[_\s]+/g, ' ').trim().toLowerCase();
const countChars = s => [...s].length;
const randomHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');

// The browser turns the password into a slow PBKDF2 "proof". Only a salted hash of that proof is stored.
// The browser's salt is "autohound:acct:" plus a random client_salt saved in private.json. Accounts made before
// email login use the older salt, "autohound:" plus the username, and keep it, so their passwords still work.
function checkProof(proof) { if (!/^[0-9a-f]{64}$/.test(proof || '')) fail(400, 'Could not read that password.'); }
const browserSalt = (secret, a) => secret?.password?.client_salt ? `autohound:acct:${secret.password.client_salt}` : `autohound:${usernameKey(a.username)}`;
// People log in with their email. Accounts that have no email can still use their username.
export async function findLogin(db, login) {
  const v = String(login || '').trim();
  if (!v) return null;
  if (v.includes('@')) { await ensureSchemaOnce(db); return db.get('SELECT * FROM accounts WHERE lower(email)=lower(?)', v); }
  return db.get('SELECT * FROM accounts WHERE username_key=?', usernameKey(v));
}
// Unknown logins get a made-up salt that looks like a real one, so this can't be used to find out who has an account.
async function fakeSalt(db, login) {
  let row = await db.get("SELECT value FROM system_state WHERE key='login_salt_secret'");
  if (!row) { await db.run("INSERT OR IGNORE INTO system_state(key,value) VALUES('login_salt_secret',?)", randomHex(32)); row = await db.get("SELECT value FROM system_state WHERE key='login_salt_secret'"); }
  return `autohound:acct:${(await sha256Hex(row.value + ':' + String(login).trim().toLowerCase())).slice(0, 32)}`;
}
export async function loginSalt({ db, store, request }) {
  const b = await readJson(request), login = String(b.login || '').trim();
  if (!login) fail(400, 'Enter your email.');
  if (!await hit(db, 'login-salt:' + await clientKey(request), 60, 600e3)) fail(429, 'Too many tries. Wait a few minutes.');
  const a = await findLogin(db, login), secret = a && await readJsonFile(store, `${a.path}/private.json`);
  return json({ salt: secret ? browserSalt(secret, a) : await fakeSalt(db, login) });
}
function sessionCookie(token, request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
async function startSession(db, accountId, request, body) {
  const token = randomHex(32), expires = Date.now() + LIMITS.sessionMs;
  await db.run('DELETE FROM sessions WHERE expires<?', Date.now());
  await db.run('INSERT INTO sessions(token_hash,account_id,expires) VALUES(?,?,?)', await sha256Hex(token), accountId, expires);
  return json(body, 200, { 'set-cookie': sessionCookie(token, request, Math.floor(LIMITS.sessionMs / 1000)) });
}
export async function currentAccount(db, request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|; )${COOKIE}=([0-9a-f]{64})`));
  if (!m) return null;
  return db.get('SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?', await sha256Hex(m[1]), Date.now());
}
export async function requireAccount(db, request) {
  const a = await currentAccount(db, request);
  if (!a) throw new ApiError(401, 'Log in first.');
  return a;
}
// Emails keep their own rules: underscores and anything else valid in an address are fine, and it's saved as typed.
export function cleanEmail(raw) {
  const email = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!email) fail(400, 'Add your email address.');
  if (/\s/.test(email)) fail(400, 'Email addresses can\'t have spaces in them.');
  if (email.length > 254 || !/^[^@]+@[^@]+\.[^@.]{2,}$/.test(email) || /^\.|\.\.|\.@|@\.|@-/.test(email)) fail(400, 'That email address doesn\'t look right.');
  return email;
}
export const publicAccount = a => a && ({ id: a.id, username: a.username, joined: a.joined, photo: a.photo ? `/api/files/${a.photo}` : null });

export async function signup({ db, store, request, env }) {
  const b = await readJson(request), username = String(b.username || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (username.includes('_')) fail(400, 'Underscores are prohibited.');
  if (username.includes('@')) fail(400, 'Usernames can\'t have @ in them.');
  const n = countChars(username);
  if (n < LIMITS.usernameMin || n > LIMITS.usernameMax) fail(400, `Usernames must be ${LIMITS.usernameMin} to ${LIMITS.usernameMax} characters.`);
  checkWords('username', username);
  const email = cleanEmail(b.email);
  checkProof(b.proof);
  const clientSalt = String(b.client_salt || '');
  if (!/^[0-9a-f]{32}$/.test(clientSalt)) fail(400, 'Could not read that password.');
  await ensureSchemaOnce(db);
  if (!await hit(db, 'signup:' + await clientKey(request), LIMITS.signupsPerHour, 3600e3)) fail(429, 'Too many new accounts from here. Try again later.');
  const key = usernameKey(username);
  if (await db.get('SELECT id FROM accounts WHERE username_key=?', key)) fail(409, 'That username is taken.');
  if (await db.get('SELECT id FROM accounts WHERE lower(email)=lower(?)', email)) fail(409, 'That email is already on another account.');
  const id = await nextId(db, 'A'), folder = `${letterFolder(username)}/${folderName(id, username, 'user')}`, path = `records/accounts/${folder}`, joined = new Date().toISOString();
  try {
    await db.run('INSERT INTO accounts(id,username,username_key,path,data_path,photo,joined,email) VALUES(?,?,?,?,?,NULL,?,?)', id, username, key, path, `data/accounts/${folder}`, joined, email);
  } catch { fail(409, 'That username or email is already taken.'); }
  const salt = randomHex(16);
  await writeJsonFile(store, `${path}/account.json`, { id, username, email, email_verified: false, joined, status: 'active', profile_photo: null });
  await writeJsonFile(store, `${path}/private.json`, { password: { method: 'browser-pbkdf2-sha256-100000+server-sha256', client_salt: clientSalt, salt, hash: await sha256Hex(salt + b.proof) } });
  await writeJsonFile(store, `${path}/favorites.json`, []);
  const account = await db.get('SELECT * FROM accounts WHERE id=?', id);
  // The code goes out right away. A sending problem never blocks the signup; the person can ask for a new code.
  let code = { sent: false };
  try { code = await sendCode({ db, store, request, env }, account, { quiet: true }); } catch (e) { console.error('Signup code not sent', e?.message || e); }
  return startSession(db, id, request, { account: publicAccount(account), code });
}
export async function login(ctx) {
  const { db, store, request } = ctx, b = await readJson(request), login = String(b.login || '').trim();
  if (!login.includes('@') && login.includes('_')) fail(400, 'Underscores are prohibited.');
  checkProof(b.proof);
  if (!await hit(db, 'login:' + await clientKey(request) + ':' + login.toLowerCase(), LIMITS.loginsPer10Min, 600e3)) fail(429, 'Too many tries. Wait a few minutes.');
  const a = await findLogin(db, login);
  const secret = a && await readJsonFile(store, `${a.path}/private.json`);
  if (!secret || await sha256Hex(secret.password.salt + b.proof) !== secret.password.hash) fail(401, 'That email and password don\'t match.');
  // Optional second step: a code emailed to the account. Off unless the owner turned it on.
  if (await loginCodesOn(ctx, a)) return json({ code_required: true, ...(await sendLoginCode(ctx, a)) });
  return startSession(db, a.id, request, { account: publicAccount(a) });
}
export async function loginWithCode(ctx) {
  const b = await readJson(ctx.request), a = await checkLoginCode(ctx, String(b.ticket || ''), String(b.code || ''));
  return startSession(ctx.db, a.id, ctx.request, { account: publicAccount(a) });
}
export async function logout({ db, request }) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|; )${COOKIE}=([0-9a-f]{64})`));
  if (m) await db.run('DELETE FROM sessions WHERE token_hash=?', await sha256Hex(m[1]));
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', request, 0) });
}
