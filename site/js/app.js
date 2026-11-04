import { $, esc, toast, timeLeft } from './util.js';
import { api, session, refreshSession } from './api.js';
import { notFound } from './components.js';
import { homePage, setSearch } from './pages/home.js';
import { listingPage } from './pages/listing.js';
import { sellPage } from './pages/sell.js';
import { authPage } from './pages/auth.js';
import { inboxPage, threadPage } from './pages/messages.js';
import { accountPage, sellerPage, favoritesPage } from './pages/account.js';

const ROUTES = [
  [/^\/$/, homePage], [/^\/listing\/([^/]+)$/, listingPage], [/^\/sell$/, sellPage],
  [/^\/signup$/, () => authPage('signup')], [/^\/login$/, () => authPage('login')],
  [/^\/messages$/, inboxPage], [/^\/messages\/([^/]+)$/, threadPage],
  [/^\/account$/, accountPage], [/^\/favorites$/, favoritesPage], [/^\/seller\/([^/]+)$/, sellerPage],
];
let leave = null, token = 0;
export function go(path, replace) { history[replace ? 'replaceState' : 'pushState']({}, '', path); route(); }
export function needLogin() { go('/login?next=' + encodeURIComponent(location.pathname + location.search), true); }
export function renderHeader() {
  const a = session.account, unread = session.unread ? `<span class="badge-count">${session.unread}</span>` : '';
  $('headLinks').innerHTML = `<a class="btn" href="/sell">Sell</a>` + (a
    ? `<a href="/favorites">Favorites</a><a href="/messages">Messages${unread}</a><a href="/account">${esc(a.username.length > 16 ? [...a.username].slice(0, 15).join('') + '…' : a.username)}</a>`
    : `<a href="/login">Log in</a><a href="/signup">Sign up</a>`);
}
async function route() {
  if (leave) { try { leave(); } catch {} leave = null; }
  const mine = ++token, path = location.pathname.replace(/(.)\/$/, '$1');
  const m = ROUTES.map(([re, fn]) => ({ fn, hit: path.match(re) })).find(x => x.hit);
  scrollTo(0, 0);
  if (!m) { $('main').innerHTML = notFound(); return; }
  try {
    const result = await m.fn(...m.hit.slice(1).map(decodeURIComponent));
    if (mine === token) leave = result || null; else if (result) result();
  } catch (e) {
    if (e.restart) { await refreshSession().catch(() => {}); renderHeader(); return route(); }
    if (mine === token) $('main').innerHTML = notFound(e.message);
  }
}
document.addEventListener('click', async e => {
  const star = e.target.closest('[data-act="favorite"]');
  if (star) {
    e.preventDefault();
    if (!session.account) return needLogin();
    const id = star.dataset.id, d = await api('favorites', { json: { id } }).catch(er => { toast(er.message); return null; });
    if (!d) return;
    session.favorites = new Set(d.ids);
    const on = session.favorites.has(id);
    document.querySelectorAll(`[data-act="favorite"][data-id="${CSS.escape(id)}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); if (b.classList.contains('star')) b.textContent = on ? '★' : '☆'; else b.textContent = on ? '★ Favorited' : '☆ Favorite'; });
    return;
  }
  const a = e.target.closest('a[href]');
  if (a && a.origin === location.origin && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); go(a.pathname + a.search); }
});
document.addEventListener('error', e => {
  if (e.target.tagName === 'IMG' && e.target.parentElement?.classList.contains('ph')) { const p = e.target.parentElement; p.className = 'ph missing'; p.textContent = 'Photo unavailable'; }
}, true);
$('searchForm').addEventListener('submit', e => { e.preventDefault(); setSearch($('searchInput').value.trim()); });
addEventListener('popstate', route);
setInterval(() => document.querySelectorAll('[data-end]').forEach(n => { n.textContent = timeLeft(+n.dataset.end - Date.now()); }), 1000);
setInterval(async () => { if (session.account && !document.hidden) { try { const d = await api('me'); if (d.unread !== session.unread) { session.unread = d.unread; renderHeader(); } } catch {} } }, 30000);

(async function start() {
  renderHeader();
  try { await refreshSession(); } catch (e) { if (e.restart) await refreshSession().catch(() => {}); }
  renderHeader();
  route();
})();
