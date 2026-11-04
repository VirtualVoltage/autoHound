import { $, esc, shortDate, toast, shrink, avatar } from '../util.js';
import { api, upload, session } from '../api.js';
import { windowCard, notFound } from '../components.js';
import { go, needLogin, renderHeader } from '../app.js';

const grid = (list, empty) => list.length ? `<div class="windows">${list.map(windowCard).join('')}</div>` : `<div class="empty"><b>${empty}</b></div>`;
export async function accountPage() {
  if (!session.account) return needLogin();
  const a = session.account, d = await api('accounts/' + a.id);
  $('main').innerHTML = `<div class="wrap page">
    <div class="profile">${avatar(d.account.photo, 'Your profile picture')}<div style="display:grid;gap:6px"><h1 class="main-title">${esc(a.username)}</h1><span class="muted">Joined ${shortDate(a.joined)}</span>
      <div class="actions" style="margin:0"><label class="btn plain" for="photoInput">Change picture</label><input id="photoInput" class="sr" type="file" accept="image/*"><button class="btn plain" id="logoutBtn">Log out</button></div></div></div>
    <h2 style="margin-bottom:10px">Your listings</h2>${grid(d.listings, 'You have no live listings.')}</div>`;
  $('logoutBtn').addEventListener('click', async () => { await api('logout', { method: 'POST' }); session.account = null; session.unread = 0; session.favorites = new Set(); renderHeader(); go('/'); });
  $('photoInput').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const b = await shrink(f, 512, .82, 300 * 1024), r = await upload('me/photo', b); session.account.photo = r.photo; toast('Picture updated'); go('/account', true); } catch (er) { toast(er.message); }
  });
}
export async function sellerPage(id) {
  let d;
  try { d = await api('accounts/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = notFound(e.message); return; }
  $('main').innerHTML = `<div class="wrap page"><div class="profile">${avatar(d.account.photo, '')}<div style="display:grid;gap:6px"><h1 class="main-title">${esc(d.account.username)}</h1><span class="muted">Joined ${shortDate(d.account.joined)} · ${d.listings.length} live listings</span></div></div>${grid(d.listings, 'No live listings.')}</div>`;
}
export async function favoritesPage() {
  if (!session.account) return needLogin();
  const d = await api('favorites');
  $('main').innerHTML = `<div class="wrap page"><h1 class="main-title" style="margin-bottom:12px">Favorites</h1>${grid(d.listings, 'Press the star on any listing to save it here.')}</div>`;
}
