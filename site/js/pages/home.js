import { $, esc, money, profileAsset } from '../util.js';
import { api } from '../api.js';
import { windowCard } from '../components.js';
import { go } from '../app.js';

const state = { sort: 'popular', min: '', max: '', offset: 0, seed: Math.random() };
const SORTS = [['popular', 'Popular'], ['new', 'Newest'], ['low', 'Price low'], ['high', 'Price high']];
const mix = list => { const r = new Map(list.map(l => [l.id, hashOf(l.id)])); return [...list].sort((a, b) => r.get(a.id) - r.get(b.id)); };
const hashOf = s => { let h = Math.floor(state.seed * 1e9); for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export function setSearch(q) { go(q ? '/?q=' + encodeURIComponent(q) : '/'); }
function ticker(list) {
  const items = mix(list).slice(0, 8).map(l => `<span class="tk-i">${esc(l.title.toUpperCase())} <span class="money">${money(l.price)}</span> <span class="town">${esc(l.city.toUpperCase())}</span></span>`).join('');
  return items ? `<div class="ticker" aria-hidden="true"><div class="ticker-in">${items}${items}</div></div>` : '';
}
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
  if (!list.length && !append) grid.outerHTML = `<div id="windows" class="windows"></div>`;
  $('windows').innerHTML = (append ? $('windows').innerHTML : '') + list.map(windowCard).join('');
  $('emptyMsg').hidden = !!list.length || append;
  $('moreBtn').hidden = !d.more;
  return d;
}
export async function homePage() {
  const q = new URLSearchParams(location.search).get('q') || '';
  $('searchInput').value = q;
  const first = await api('listings?limit=40');
  $('main').innerHTML = `<div class="banner"><img src="${profileAsset('brand-banner.webp')}" alt="Autohound: a dog carrying a wrench in its mouth"></div>${ticker(first.listings)}
    <div class="wrap page">
      <h1 class="main-title center">${q ? `Results for ${esc(q)}` : 'Popular listings'}</h1>
      <div class="filters">
        <div class="price-range"><b>Price</b><input id="minPrice" type="number" min="0" inputmode="numeric" placeholder="min" aria-label="Minimum price" value="${esc(state.min)}"><span>to</span><input id="maxPrice" type="number" min="0" inputmode="numeric" placeholder="max" aria-label="Maximum price" value="${esc(state.max)}"></div>
        <div class="sorts" role="group" aria-label="Sort listings">${SORTS.map(([k, t]) => `<button data-sort="${k}" class="${state.sort === k ? 'on' : ''}" aria-pressed="${state.sort === k}">${t}</button>`).join('')}</div>
      </div>
      <div id="windows" class="windows"></div>
      <div id="emptyMsg" class="empty" hidden><b>Nothing matches that.</b><span>Try a different search or price.</span></div>
      <div class="center" style="margin-top:14px;width:fit-content"><button id="moreBtn" class="btn plain" hidden>Show more</button></div>
    </div>`;
  let timer;
  const refilter = () => { clearTimeout(timer); timer = setTimeout(() => { state.min = $('minPrice').value; state.max = $('maxPrice').value; load(false); }, 300); };
  $('minPrice').addEventListener('input', refilter); $('maxPrice').addEventListener('input', refilter);
  document.querySelector('.sorts').addEventListener('click', e => {
    const b = e.target.closest('[data-sort]'); if (!b) return;
    state.sort = b.dataset.sort;
    document.querySelectorAll('.sorts button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    load(false);
  });
  $('moreBtn').addEventListener('click', () => load(true));
  await load(false);
  return () => clearTimeout(timer);
}
