import { $, esc, countChars } from '../util.js';
import { api, passwordProof, refreshSession, session, getOptions } from '../api.js';
import { go, renderHeader } from '../app.js';

export async function authPage(mode) {
  const next = new URLSearchParams(location.search).get('next') || '/', safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (session.account) { go(safeNext, true); return; }
  const signup = mode === 'signup', L = (await getOptions()).limits, other = signup ? 'login' : 'signup', q = location.search;
  $('main').innerHTML = `<div class="wrap page"><form class="panel auth" id="authForm" novalidate>
    <h1 class="main-title">${signup ? 'Make an account' : 'Log in'}</h1>
    <label class="field"><span>Username</span><input id="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="80"></label>
    <label class="field"><span>Password</span><input id="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" maxlength="40"></label>
    ${signup ? `<p class="note">Username: ${L.usernameMin} to ${L.usernameMax} characters. Password: ${L.passwordMin} to ${L.passwordMax} characters. There's no email, so a lost password can't be reset yet.</p>` : ''}
    <p class="err" id="authErr" role="alert" hidden></p>
    <button class="btn" type="submit">${signup ? 'Sign up' : 'Log in'}</button>
    <p class="note">${signup ? 'Already have an account?' : 'New here?'} <a href="/${other}${esc(q)}">${signup ? 'Log in' : 'Sign up'}</a></p>
  </form></div>`;
  $('username').focus();
  $('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('authErr'), btn = e.target.querySelector('button'), username = $('username').value.trim(), password = $('password').value, show = m => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (signup) {
      const u = countChars(username), p = countChars(password);
      if (u < L.usernameMin || u > L.usernameMax) return show(`Usernames must be ${L.usernameMin} to ${L.usernameMax} characters.`);
      if (p < L.passwordMin || p > L.passwordMax) return show(`Passwords must be ${L.passwordMin} to ${L.passwordMax} characters.`);
    } else if (!username || !password) return show('Enter your username and password.');
    btn.disabled = true;
    try {
      await api(signup ? 'signup' : 'login', { json: { username, proof: await passwordProof(username, password) } });
      await refreshSession(); renderHeader(); go(safeNext, true);
    } catch (er) { show(er.message); btn.disabled = false; }
  });
}
