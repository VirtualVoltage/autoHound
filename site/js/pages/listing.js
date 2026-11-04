import { $, money, toast } from '../util.js';
import { view } from '../theme.js';
import { api, session } from '../api.js';
import { go, needLogin } from '../app.js';

export async function listingPage(id) {
  let data;
  try { data = await api('listings/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  const l = data.listing, closed = l.status !== 'live', minBid = l.price + Math.max(5, Math.round(l.price * .025 / 5) * 5);
  $('main').innerHTML = view.listingPage({ listing: l, favorite: session.favorites.has(l.id), closed, minBid });
  $('thumbs')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) $('mainPhoto').innerHTML = view.ph(l.photos[+b.dataset.i], false, l.title);
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
