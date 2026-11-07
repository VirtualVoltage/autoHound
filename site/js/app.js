import { $, toast, timeLeft } from './util.js';
import { view } from './theme.js';
import { api, session, refreshSession } from './api.js';
import { homePage, setSearch } from './pages/home.js';
import { listingPage } from './pages/listing.js';
import { sellPage } from './pages/sell.js';
import { authPage } from './pages/auth.js';
import { inboxPage, threadPage } from './pages/messages.js';
import { accountPage, sellerPage, favoritesPage } from './pages/account.js';
import { adminInboxPage, adminMessagePage } from './pages/admin.js';

const ROUTES = [
  [/^\/$/, homePage], [/^\/listing\/([^/]+)$/, listingPage], [/^\/sell$/, sellPage],
  [/^\/signup$/, () => authPage('signup')], [/^\/login$/, () => authPage('login')],
  [/^\/messages$/, inboxPage], [/^\/messages\/([^/]+)$/, threadPage],
  [/^\/account$/, accountPage], [/^\/favorites$/, favoritesPage], [/^\/seller\/([^/]+)$/, sellerPage],
  [/^\/admin$/, adminInboxPage], [/^\/admin\/([^/]+)$/, adminMessagePage],
];
let leave = null, token = 0;
export function go(path, replace) { history[replace ? 'replaceState' : 'pushState']({}, '', path); route(); }
export function needLogin() { go('/login?next=' + encodeURIComponent(location.pathname + location.search), true); }
export function renderHeader() { const h = $('headLinks'); if (h) h.innerHTML = view.headerLinks({ account: session.account, unread: session.unread, adminUnread: session.adminInbox?.unread || 0 }); }
async function route() {
  if (leave) { try { leave(); } catch {} leave = null; }
  const mine = ++token, path = location.pathname.replace(/(.)\/$/, '$1');
  const m = ROUTES.map(([re, fn]) => ({ fn, hit: path.match(re) })).find(x => x.hit);
  scrollTo(0, 0);
  renderHeader();
  if (!m) { $('main').innerHTML = view.notFound(); return; }
  try {
    const result = await m.fn(...m.hit.slice(1).map(decodeURIComponent));
    if (mine === token) leave = result || null; else if (result) result();
  } catch (e) {
    if (e.restart) { await refreshSession().catch(() => {}); renderHeader(); return route(); }
    if (mine === token) $('main').innerHTML = view.notFound(e.message);
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
    document.querySelectorAll(`[data-act="favorite"][data-id="${CSS.escape(id)}"]`).forEach(b => { b.outerHTML = b.dataset.style === 'button' ? view.favoriteButton(id, on) : view.star(id, on); });
    return;
  }
  const a = e.target.closest('a[href]');
  if (a && a.origin === location.origin && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); go(a.pathname + a.search); }
});
document.addEventListener('error', e => {
  if (e.target.tagName === 'IMG' && e.target.parentElement?.classList.contains('ph')) e.target.parentElement.outerHTML = view.missingPhoto();
}, true);
addEventListener('popstate', route);
setInterval(() => document.querySelectorAll('[data-end]').forEach(n => { n.textContent = timeLeft(+n.dataset.end - Date.now()); }), 1000);
setInterval(async () => { if (session.account && !document.hidden) { try { const d = await api('me'); if (d.unread !== session.unread || (d.admin_inbox?.unread || 0) !== (session.adminInbox?.unread || 0)) { session.unread = d.unread; session.adminInbox = d.admin_inbox || null; renderHeader(); } } catch {} } }, 30000);

(async function start() {
  $('app').innerHTML = view.shell();
  $('searchForm')?.addEventListener('submit', e => { e.preventDefault(); setSearch($('searchInput').value.trim()); });
  renderHeader();
  try { await refreshSession(); } catch (e) { if (e.restart) await refreshSession().catch(() => {}); }
  renderHeader();
  route();
})();
