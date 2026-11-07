import { $, countChars } from '../util.js';
import { view } from '../theme.js';
import { api, passwordProof, newClientSalt, refreshSession, session, getOptions } from '../api.js';
import { go, renderHeader } from '../app.js';

// Sign up asks for a username, email and password. Log in uses the email (older accounts without one can use their username).
export async function authPage(mode) {
  const next = new URLSearchParams(location.search).get('next') || '/', safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (session.account) { go(safeNext, true); return; }
  const signup = mode === 'signup', L = (await getOptions()).limits;
  $('main').innerHTML = view.authPage({ signup, limits: L, otherLink: `/${signup ? 'login' : 'signup'}${location.search}` });
  (signup ? $('username') : $('login')).focus();
  const finish = async () => { await refreshSession(); renderHeader(); go(safeNext, true); };
  $('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('authErr'), btn = e.target.querySelector('button[type=submit]'), password = $('password').value, show = m => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (signup) {
      const username = $('username').value.trim(), email = $('email').value.trim();
      if (username.includes('_')) return show('Usernames use spaces, not underscores.');
      if (username.includes('@')) return show('Usernames can\'t have @ in them.');
      if (!email) return show('Add your email address.');
      const u = countChars(username.replace(/\s+/g, ' ')), p = countChars(password);
      if (u < L.usernameMin || u > L.usernameMax) return show(`Usernames must be ${L.usernameMin} to ${L.usernameMax} characters.`);
      if (p < L.passwordMin || p > L.passwordMax) return show(`Passwords must be ${L.passwordMin} to ${L.passwordMax} characters.`);
      btn.disabled = true;
      try {
        const client_salt = newClientSalt();
        const r = await api('signup', { json: { username, email, client_salt, proof: await passwordProof(`autohound:acct:${client_salt}`, password) } });
        await refreshSession(); renderHeader();
        go(`/verify?next=${encodeURIComponent(safeNext)}${r.code?.sent ? '&sent=1' : ''}`, true);
      } catch (er) { show(er.message); btn.disabled = false; }
      return;
    }
    const login = $('login').value.trim();
    if (!login || !password) return show('Enter your email and password.');
    if (!login.includes('@') && login.includes('_')) return show('Usernames use spaces, not underscores.');
    btn.disabled = true;
    try {
      const { salt } = await api('login/salt', { json: { login } });
      const r = await api('login', { json: { login, proof: await passwordProof(salt, password) } });
      if (!r.code_required) return finish();
      // Two-step login is on for this account: ask for the emailed code.
      $('main').innerHTML = view.loginCodePage({ emailHint: r.email_hint });
      $('loginCode').focus();
      $('codeForm').addEventListener('submit', async ev => {
        ev.preventDefault();
        const cErr = $('codeErr'), cBtn = ev.target.querySelector('button[type=submit]');
        cErr.hidden = true; cBtn.disabled = true;
        try { await api('login/code', { json: { ticket: r.ticket, code: $('loginCode').value } }); await finish(); }
        catch (er) { cErr.textContent = er.message; cErr.hidden = false; cBtn.disabled = false; if (/Log in again/.test(er.message)) setTimeout(() => go(location.pathname + location.search, true), 2500); }
      });
    } catch (er) { show(er.message); btn.disabled = false; }
  });
}
