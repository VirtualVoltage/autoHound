import { $, esc, countChars } from '../util.js';
import { view } from '../theme.js';
import { api, passwordProof, refreshSession, session, getOptions } from '../api.js';
import { go, renderHeader } from '../app.js';

export async function authPage(mode) {
  const next = new URLSearchParams(location.search).get('next') || '/', safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (session.account) { go(safeNext, true); return; }
  const signup = mode === 'signup', L = (await getOptions()).limits;
  $('main').innerHTML = view.authPage({ signup, limits: L, otherLink: `/${signup ? 'login' : 'signup'}${location.search}` });
  $('username').focus();
  $('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('authErr'), btn = e.target.querySelector('button'), username = $('username').value.trim(), password = $('password').value, show = m => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (username.includes('_')) return show('Usernames use spaces, not underscores.');
    if (signup) {
      if (!$('email').value.trim()) return show('Add your email address.');
      const u = countChars(username.replace(/\s+/g, ' ')), p = countChars(password);
      if (u < L.usernameMin || u > L.usernameMax) return show(`Usernames must be ${L.usernameMin} to ${L.usernameMax} characters.`);
      if (p < L.passwordMin || p > L.passwordMax) return show(`Passwords must be ${L.passwordMin} to ${L.passwordMax} characters.`);
    } else if (!username || !password) return show('Enter your username and password.');
    btn.disabled = true;
    try {
      const r = await api(signup ? 'signup' : 'login', { json: { username, ...(signup ? { email: $('email').value.trim() } : {}), proof: await passwordProof(username, password) } });
      await refreshSession(); renderHeader();
      go(signup ? `/verify?next=${encodeURIComponent(safeNext)}${r.code?.sent ? '&sent=1' : ''}` : safeNext, true);
    } catch (er) { show(er.message); btn.disabled = false; }
  });
}
