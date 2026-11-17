import { $ } from '../util.js';
import { view } from '../theme.js';
import { api, session } from '../api.js';
import { go, paint } from '../app.js';
import { SORTS } from '../shared.js';

const state = { sort: 'popular', min: '', max: '', offset: 0, seed: Math.random() };
const hashOf = s => { let h = Math.floor(state.seed * 1e9); for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const mix = list => { const r = new Map(list.map(l => [l.id, hashOf(l.id)])); return [...list].sort((a, b) => r.get(a.id) - r.get(b.id)); };

export function setSearch(q) { go(q ? '/?q=' + encodeURIComponent(q) : '/'); }
async function load(append) {
  const q = new URLSearchParams(location.search).get('q') || '', params = new URLSearchParams();
  if (q) params.set('q', q);
  if (state.min !== '') params.set('min', state.min);
  if (state.max !== '') params.set('max', state.max);
  if (state.sort === 'low' || state.sort === 'high') params.set('sort', state.sort);
  params.set('limit', state.sort === 'popular' ? 100 : 48);
  params.set('offset', append ? state.offset : 0);
  const d = await api('listings?' + params);
  const list = state.sort === 'popular' ? mix(d.listings) : d.listings;
  state.offset = (append ? state.offset : 0) + d.listings.length;
  const grid = $('windows'); if (!grid) return d;
  const html = list.map(l => view.windowCard(l, session.favorites.has(l.id))).join('');
  grid.innerHTML = (append ? grid.innerHTML : '') + html;
  if ($('emptyMsg')) $('emptyMsg').hidden = !!list.length || append;
  if ($('moreBtn')) $('moreBtn').hidden = !d.more;
  return d;
}
export async function homePage() {
  const sp = new URLSearchParams(location.search), q = sp.get('q') || '';
  // Filters in the address (from the server's page, or a link) win over the ones remembered from earlier.
  if (sp.has('min')) state.min = sp.get('min');
  if (sp.has('max')) state.max = sp.get('max');
  if (SORTS.some(([k]) => k === sp.get('sort'))) state.sort = sp.get('sort');
  if ($('searchInput')) $('searchInput').value = q;
  const first = await api('listings?limit=40');
  // The site inbox lives in the menu, so the home page passes no inbox.
  const fresh = paint(view.homePage({ q, min: state.min, max: state.max, sort: state.sort, sorts: SORTS, listings: null, favorites: session.favorites, tickerListings: mix(first.listings), adminInbox: null, account: session.account }));
  let timer;
  const refilter = () => { clearTimeout(timer); timer = setTimeout(() => { state.min = $('minPrice')?.value ?? ''; state.max = $('maxPrice')?.value ?? ''; load(false); }, 300); };
  $('minPrice')?.addEventListener('input', refilter); $('maxPrice')?.addEventListener('input', refilter);
  $('minPrice')?.form?.addEventListener('submit', e => { e.preventDefault(); refilter(); });
  document.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    state.sort = b.dataset.sort;
    document.querySelectorAll('[data-sort]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    load(false);
  }));
  $('moreBtn')?.addEventListener('click', e => { e.preventDefault(); load(true); });
  // The server's page already shows the first listings.
  if (fresh) await load(false); else state.offset = $('windows')?.children.length || 0;
  return () => clearTimeout(timer);
}
