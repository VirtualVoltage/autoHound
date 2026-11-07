import { $, toast, shrink } from '../util.js';
import { view } from '../theme.js';
import { api, upload, session } from '../api.js';
import { go, needLogin, renderHeader, logOut } from '../app.js';

export async function accountPage() {
  if (!session.account) return needLogin();
  const a = session.account, d = await api('accounts/' + a.id);
  const security = await api('me/email').catch(() => null);
  $('main').innerHTML = view.accountPage({ account: a, photo: d.account.photo, listings: d.listings, favorites: session.favorites, security });
  $('loginCodesBtn')?.addEventListener('click', async e => {
    const on = e.target.dataset.on !== '1', err = $('securityErr');
    err.hidden = true; e.target.disabled = true;
    try { await api('me/login-codes', { json: { on } }); toast(on ? 'Login codes turned on' : 'Login codes turned off'); go('/account', true); }
    catch (er) { err.textContent = er.message; err.hidden = false; e.target.disabled = false; }
  });
  $('emailForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('securityErr'), btn = e.target.querySelector('button');
    err.hidden = true; btn.disabled = true;
    try {
      const r = await api('me/email', { method: 'PUT', json: { email: $('newEmail').value } });
      toast('Email saved');
      go(r.verified ? '/account' : `/verify?next=${encodeURIComponent('/account')}${r.sent ? '&sent=1' : ''}`, true);
    } catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; }
  });
  $('logoutBtn')?.addEventListener('click', logOut);
  $('photoInput').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const b = await shrink(f, 512, .82, 300 * 1024), r = await upload('me/photo', b); session.account.photo = r.photo; toast('Picture updated'); go('/account', true); } catch (er) { toast(er.message); }
  });
}
export async function sellerPage(id) {
  let d;
  try { d = await api('accounts/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  $('main').innerHTML = view.sellerPage({ account: d.account, listings: d.listings, favorites: session.favorites });
}
export async function favoritesPage() {
  if (!session.account) return needLogin();
  const d = await api('favorites');
  $('main').innerHTML = view.favoritesPage({ listings: d.listings, favorites: session.favorites });
}

export async function myListingsPage() {
  if (!session.account) return needLogin();
  const d = await api('accounts/' + session.account.id);
  $('main').innerHTML = view.myListingsPage({ listings: d.listings, favorites: session.favorites });
}
