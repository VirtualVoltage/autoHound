import { $, money, toast } from '../util.js';
import { view } from '../theme.js';
import { api, session } from '../api.js';
import { go, needLogin } from '../app.js';
import { mountChat } from '../chat.js';

export async function listingPage(id) {
  let data;
  try { data = await api('listings/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  const l = data.listing, closed = l.status !== 'live', minBid = l.price + Math.max(5, Math.round(l.price * .025 / 5) * 5);
  $('main').innerHTML = view.listingPage({ listing: l, favorite: session.favorites.has(l.id), closed, minBid });
  // Profiles with a chat box on the listing page (#chatBox): buyers chat here, sellers pick a buyer.
  let chat = null;
  if ($('chatBox')) {
    const wanted = new URLSearchParams(location.search).get('chat');
    const open = cid => { chat?.stop(); $('thread').innerHTML = ''; $('attachPreview').innerHTML = ''; chat = mountChat({ id: cid }); document.querySelectorAll('[data-chat]').forEach(b => { b.classList.toggle('on', b.dataset.chat === cid); b.setAttribute('aria-pressed', b.dataset.chat === cid); }); };
    if (l.mine) {
      const first = (l.chats || []).find(c => c.id === wanted) || (l.chats || [])[0];
      if (first) open(first.id);
      $('chatTabs')?.addEventListener('click', e => { const b = e.target.closest('[data-chat]'); if (b) open(b.dataset.chat); });
    } else chat = mountChat({ id: l.chat || null, listingId: l.id });
  }
  // Photos: thumbnails, the arrow buttons on the big photo, and the left and right arrow keys.
  let at = 0;
  const show = i => {
    const n = l.photos.length; if (n < 2) return;
    at = (i + n) % n;
    $('mainPhoto').innerHTML = view.ph(l.photos[at], false, l.title);
    document.querySelectorAll('#thumbs [data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === at));
    if ($('photoCount')) $('photoCount').textContent = `${at + 1} / ${n}`;
  };
  $('thumbs')?.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
  $('photoPrev')?.addEventListener('click', () => show(at - 1));
  $('photoNext')?.addEventListener('click', () => show(at + 1));
  const onKey = e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  };
  if (l.photos.length > 1) document.addEventListener('keydown', onKey);
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
  return () => { chat?.stop(); document.removeEventListener('keydown', onKey); };
}
