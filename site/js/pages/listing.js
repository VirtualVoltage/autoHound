import { $, esc, money, ph, townLine, timeLeft, toast, avatar, shortDate } from '../util.js';
import { api, session } from '../api.js';
import { meter, notFound } from '../components.js';
import { go, needLogin } from '../app.js';

const FEE_NOTE = 'Fee is charged once the sale is paid on the real site.';
function buyBox(l) {
  if (l.sell_type !== 'auction') return '';
  if (l.ended) return `<div class="panel"><div class="lab">${l.won ? 'You won this auction' : 'Auction closed'}</div><div class="lab">Final price</div><div class="big-price">${money(l.price)}</div>
    ${l.won ? '<p>Message the seller below to set up pickup.</p>' : ''}
    ${l.mine ? `<div class="result"><div><span>Autohound fee</span><b>${money(l.seller_fee || 0)}</b></div><div class="total"><span>You receive</span><b>${money(l.price - (l.seller_fee || 0))}</b></div></div><p class="note">${FEE_NOTE}</p>` : ''}</div>`;
  const inc = Math.max(5, Math.round(l.price * .025 / 5) * 5), min = l.price + inc;
  return `<div class="panel"><div class="lab">Current bid · ${l.bids} bids · <span data-end="${l.auction_ends}">${timeLeft(l.auction_ends - Date.now())}</span></div><div class="big-price">${money(l.price)}</div>
    ${l.mine ? '' : `<form id="bidForm" novalidate style="display:grid;gap:7px"><label class="field"><span>Your bid, ${money(min)} or more</span><input id="bidAmt" type="number" inputmode="numeric" min="${min}" value="${min}"></label><p class="err" id="bidErr" hidden></p><button class="btn full" type="submit">Place bid</button></form>`}</div>`;
}
function attrs(l) {
  const rows = [['Condition', l.condition], ...(l.kind === 'cars' ? [['Year', l.car.year], ['Odometer', l.car.miles.toLocaleString('en-US')], ['Title status', l.car.title_status], ['Tier', l.category]] : [['Fits', l.fits], ['Category', l.category]]), ['Handoff', l.handoff]];
  return `<div class="panel attrs">${rows.map(([a, b]) => `<div><span class="muted">${a}:</span> <b>${esc(b)}</b></div>`).join('')}</div>`;
}
export async function listingPage(id) {
  let data;
  try { data = await api('listings/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = notFound(e.message); return; }
  const l = data.listing, fav = session.favorites.has(l.id), closed = l.status !== 'live';
  const statusNote = l.status === 'sold' ? '<p class="err">This listing has sold.</p>' : l.status === 'draft' ? '<p class="err">This draft never finished publishing.</p>' : closed ? '<p class="err">This listing is no longer public.</p>' : '';
  $('main').innerHTML = `<div class="wrap page">
    <div class="crumb"><a href="/">Home</a> › ${esc(l.category)}</div>
    <div class="actions">
      ${l.mine ? (closed ? '' : `<button class="btn plain" id="soldBtn">Mark sold</button><button class="btn plain" id="deleteBtn">Delete listing</button>`) : `<button class="btn plain" data-act="favorite" data-id="${esc(l.id)}">${fav ? '★ Favorited' : '☆ Favorite'}</button>${closed ? '' : '<button class="btn plain" id="reportBtn">Report</button>'}`}
    </div>
    <div class="post-title">${esc(l.title)} <span class="money">${money(l.price)}</span> <span class="town">(${townLine(l.city)})</span></div>
    ${statusNote}
    <div class="post">
      <div class="gallery"><div id="mainPhoto">${ph(l.photos[0], false, l.title)}</div>${l.photos.length > 1 ? `<div class="thumbs">${l.photos.map((p, i) => `<button data-i="${i}" aria-label="Show photo ${i + 1}">${ph(p + '?size=thumb', true)}</button>`).join('')}</div>` : ''}
        <p class="body-text">${esc(l.description)}</p>
        <p class="meta-line">Posted ${shortDate(l.created)}</p>
      </div>
      <div class="side">
        ${buyBox(l)}
        ${l.sell_type === 'post' && l.market_value ? meter(l.price / l.market_value, l.market_value) : ''}
        ${attrs(l)}
        <div class="panel"><a class="seller-card" href="/seller/${esc(l.seller.id)}">${avatar(l.seller.photo, '')}<b>${esc(l.seller.username)}</b></a>
          ${l.mine || closed ? '' : `<form id="msgForm" novalidate style="display:grid;gap:7px"><label class="field"><span>Message the seller</span><textarea id="msgText" rows="3" maxlength="2000">Is this still available?</textarea></label><p class="err" id="msgErr" hidden></p><button class="btn" type="submit">Send message</button></form>`}
        </div>
      </div>
    </div></div>`;
  document.querySelector('.thumbs')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) $('mainPhoto').innerHTML = ph(l.photos[+b.dataset.i], false, l.title);
  });
  $('msgForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!session.account) return needLogin();
    const err = $('msgErr'), btn = e.target.querySelector('button'); btn.disabled = true; err.hidden = true;
    try { const d = await api(`listings/${l.id}/conversations`, { json: { text: $('msgText').value } }); go('/messages/' + d.id); }
    catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; }
  });
  $('bidForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!session.account) return needLogin();
    const err = $('bidErr'), v = +$('bidAmt').value, min = +$('bidAmt').min;
    if (!v || v < min) { err.textContent = `Enter ${money(min)} or more to lead this auction.`; err.hidden = false; return; }
    try { await api(`listings/${l.id}/bid`, { json: { amount: v } }); toast(`You lead at ${money(v)}`); go(location.pathname, true); }
    catch (er) { err.textContent = er.message; err.hidden = false; }
  });
  $('reportBtn')?.addEventListener('click', async e => {
    if (!session.account) return needLogin();
    e.target.disabled = true;
    try { await api(`listings/${l.id}/report`, { method: 'POST' }); toast('Thanks. Listings with several reports get hidden.'); } catch (er) { toast(er.message); }
  });
  const change = async (action, msg, then) => { try { await api('listings/' + l.id, { method: 'PATCH', json: { action } }); toast(msg); go(then); } catch (er) { toast(er.message); } };
  $('soldBtn')?.addEventListener('click', () => change('sold', 'Marked as sold', location.pathname));
  $('deleteBtn')?.addEventListener('click', e => {
    const b = e.target;
    if (b.dataset.sure) return change('delete', 'Listing deleted', '/account');
    b.dataset.sure = '1'; b.textContent = 'Press again to delete';
  });
}
