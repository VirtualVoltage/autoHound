import { $, toast } from '../util.js';
import { view } from '../theme.js';
import { api, session, refreshSession } from '../api.js';
import { go, needLogin, renderHeader } from '../app.js';

// Confirms the account's email with the 6-digit code sent from support@autohound.online.
export async function verifyPage() {
  if (!session.account) return needLogin();
  const next = new URLSearchParams(location.search).get('next') || '/', safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const s = await api('me/email');
  if (s.verified || !s.email) { go(safeNext, true); return; }
  const sent = new URLSearchParams(location.search).get('sent') === '1';
  $('main').innerHTML = view.verifyPage({ email: s.email, ready: s.ready, sent, next: safeNext });
  $('code')?.focus();
  $('verifyForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('verifyErr'), btn = e.target.querySelector('button[type=submit]');
    err.hidden = true; btn.disabled = true;
    try {
      await api('me/email/verify', { json: { code: $('code').value } });
      await refreshSession(); renderHeader(); toast('Email confirmed'); go(safeNext, true);
    } catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; }
  });
  $('resendBtn')?.addEventListener('click', async e => {
    const err = $('verifyErr'); err.hidden = true; e.target.disabled = true;
    try { const r = await api('me/email/code', { method: 'POST' }); toast(r.sent ? 'New code sent' : 'Email sending isn\'t set up yet'); }
    catch (er) { err.textContent = er.message; err.hidden = false; }
    setTimeout(() => { e.target.disabled = false; }, 60000);
  });
}
