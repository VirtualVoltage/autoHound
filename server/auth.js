import { LIMITS } from './config.js';
import { ApiError, fail, hit, json, readJson, readJsonFile, writeJsonFile, sha256Hex, clientKey } from './http.js';
import { nextId, folderName, letterFolder } from './ids.js';

const COOKIE = 'ah_session';
export const usernameKey = u => u.normalize('NFKC').toLowerCase();
const countChars = s => [...s].length;
const randomHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');

// The browser turns the password into a slow PBKDF2 "proof". Only a salted hash of that proof is stored.
function checkProof(proof) { if (!/^[0-9a-f]{64}$/.test(proof || '')) fail(400, 'Could not read that password.'); }
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
export const publicAccount = a => a && ({ id: a.id, username: a.username, joined: a.joined, photo: a.photo ? `/api/files/${a.photo}` : null });

export async function signup({ db, store, request }) {
  const b = await readJson(request), username = String(b.username || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const n = countChars(username);
  if (n < LIMITS.usernameMin || n > LIMITS.usernameMax) fail(400, `Usernames must be ${LIMITS.usernameMin} to ${LIMITS.usernameMax} characters.`);
  checkProof(b.proof);
  if (!await hit(db, 'signup:' + await clientKey(request), LIMITS.signupsPerHour, 3600e3)) fail(429, 'Too many new accounts from here. Try again later.');
  const key = usernameKey(username);
  if (await db.get('SELECT id FROM accounts WHERE username_key=?', key)) fail(409, 'That username is taken.');
  const id = await nextId(db, 'A'), folder = `${letterFolder(username)}/${folderName(id, username, 'user')}`, path = `records/accounts/${folder}`, joined = new Date().toISOString();
  try {
    await db.run('INSERT INTO accounts(id,username,username_key,path,data_path,photo,joined) VALUES(?,?,?,?,?,NULL,?)', id, username, key, path, `data/accounts/${folder}`, joined);
  } catch { fail(409, 'That username is taken.'); }
  const salt = randomHex(16);
  await writeJsonFile(store, `${path}/account.json`, { id, username, joined, status: 'active', profile_photo: null });
  await writeJsonFile(store, `${path}/private.json`, { password: { method: 'browser-pbkdf2-sha256-100000+server-sha256', salt, hash: await sha256Hex(salt + b.proof) } });
  await writeJsonFile(store, `${path}/favorites.json`, []);
  const account = await db.get('SELECT * FROM accounts WHERE id=?', id);
  return startSession(db, id, request, { account: publicAccount(account) });
}
export async function login({ db, store, request }) {
  const b = await readJson(request), username = String(b.username || '').trim();
  checkProof(b.proof);
  const key = usernameKey(username);
  if (!await hit(db, 'login:' + await clientKey(request) + ':' + key, LIMITS.loginsPer10Min, 600e3)) fail(429, 'Too many tries. Wait a few minutes.');
  const a = await db.get('SELECT * FROM accounts WHERE username_key=?', key);
  const secret = a && await readJsonFile(store, `${a.path}/private.json`);
  if (!secret || await sha256Hex(secret.password.salt + b.proof) !== secret.password.hash) fail(401, 'That username and password don\'t match.');
  return startSession(db, a.id, request, { account: publicAccount(a) });
}
export async function logout({ db, request }) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|; )${COOKIE}=([0-9a-f]{64})`));
  if (m) await db.run('DELETE FROM sessions WHERE token_hash=?', await sha256Hex(m[1]));
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', request, 0) });
}
