import { esc, money, ph, townLine, timeLeft } from './util.js';
import { session } from './api.js';

export function star(id) {
  const on = session.favorites.has(id);
  return `<button class="star ${on ? 'on' : ''}" data-act="favorite" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Remove from favorites' : 'Add to favorites'}">${on ? '★' : '☆'}</button>`;
}
export function windowCard(l) {
  const flag = l.sell_type === 'auction' && l.auction_ends > Date.now() ? '<span class="flag">AUCTION</span>' : l.kind === 'cars' ? `<span class="flag dark">${esc(l.category.toUpperCase())}</span>` : '';
  const photo = l.photo ? (l.photo.startsWith('blob:') ? l.photo : l.photo + '?size=thumb') : null;
  return `<article class="window">${l.preview ? '' : star(l.id)}${flag}${ph(photo, l.kind === 'cars', l.title)}
    <div class="window-body"><div class="money">${money(l.price)}</div><h3><a href="/listing/${esc(l.id)}">${esc(l.title)}</a></h3><p class="desc">${esc(l.description)}</p>
    ${l.sell_type === 'auction' && l.auction_ends > Date.now() ? `<div class="muted" data-end="${l.auction_ends}">${timeLeft(l.auction_ends - Date.now())}</div>` : ''}
    <div class="town">${townLine(l.city)}</div></div></article>`;
}
const dealOf = r => r <= .9 ? { k: 'great', t: 'Great price' } : r <= 1.1 ? { k: 'fair', t: 'Fair price' } : { k: 'high', t: 'High price' };
const pct = r => { const p = Math.round(Math.abs(1 - r) * 100); return p === 0 ? 'At market' : `${p}% ${r < 1 ? 'under' : 'over'} market`; };
export function meter(ratio, value) {
  const lo = .6, hi = 1.4, pos = Math.min(100, Math.max(0, (ratio - lo) / (hi - lo) * 100)), d = dealOf(ratio);
  let leds = '';
  for (let i = 0; i < 16; i++) { const c = lo + (i + .5) * .05, lit = c <= ratio + .025; leds += `<i class="led ${lit ? (c <= .9 ? 'g' : c <= 1.1 ? 'a' : 'r') : ''}"></i>`; }
  return `<div class="meter" aria-label="Price compared with market value"><div class="meter-top"><b class="pill ${d.k}">${d.t}</b><span class="muted">${pct(ratio)}${value ? ` · est. value ${money(value)}` : ''}</span></div>
    <div class="leds">${leds}<i class="needle" style="left:${pos}%"></i></div>
    <div class="scale"><span style="left:0">60%</span><span style="left:37.5%">90%</span><span style="left:50%">Market</span><span style="left:62.5%">110%</span><span style="left:100%">140%</span></div></div>`;
}
export const loading = `<div class="wrap page"><div class="empty"><b>Loading...</b></div></div>`;
export const notFound = (msg = 'That page isn\'t here.') => `<div class="wrap page"><div class="empty"><b>${esc(msg)}</b><a class="btn" href="/">Go home</a></div></div>`;
