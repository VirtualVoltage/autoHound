import { $ } from './util.js';
import { view } from './theme.js';

async function runSetup() {
  $('main').innerHTML = view.setupScreen();
  for (let i = 0; i < 400; i++) {
    const r = await fetch('/api/setup', { method: 'POST' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Setup failed.');
    const bar = $('setupBar'); if (bar) bar.style.width = Math.round(d.progress * 100) + '%';
    if (d.done) return;
  }
  throw new Error('Setup took too long. Refresh to continue.');
}
let setupRun = null;
export async function api(path, opts = {}) {
  const o = { ...opts, credentials: 'same-origin' };
  if (o.json !== undefined) { o.method = o.method || 'POST'; o.headers = { ...(o.headers || {}), 'content-type': 'application/json' }; o.body = JSON.stringify(o.json); delete o.json; }
  const r = await fetch('/api/' + path, o);
  let d = {}; try { d = await r.json(); } catch {}
  if (r.status === 503 && d.setup) {
    setupRun = setupRun || runSetup().finally(() => { setupRun = null; });
    await setupRun;
    const again = new Error('RESTART'); again.restart = true; throw again;
  }
  if (!r.ok) { const e = new Error(d.error || 'The server had a problem. Try again in a minute.'); e.status = r.status; throw e; }
  return d;
}
export const upload = (path, blob) => api(path, { method: 'POST', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob });
export const session = { account: null, unread: 0, adminInbox: null, favorites: new Set(), options: null };
export async function refreshSession() {
  const d = await api('me');
  session.account = d.account; session.unread = d.unread; session.adminInbox = d.admin_inbox || null;
  session.favorites = new Set(session.account ? (await api('favorites')).ids : []);
}
export async function getOptions() { return session.options || (session.options = await api('options')); }
// Password never leaves the browser. It's stretched here and only the result is sent.
export async function passwordProof(username, password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('autohound:' + username.normalize('NFKC').replace(/[_\s]+/g, ' ').trim().toLowerCase()), iterations: 100000 }, key, 256);
  return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join('');
}
