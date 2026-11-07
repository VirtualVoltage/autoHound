import { $, money, toast } from '../util.js';
import { view } from '../theme.js';
import { api, session, passwordProof } from '../api.js';
import { go, needLogin } from '../app.js';
import { mountChat } from '../chat.js';

export async function listingPage(id) {
  let data;
  try { data = await api('listings/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  const l = data.listing, closed = l.status !== 'live', minBid = l.price + Math.max(5, Math.round(l.price * .025 / 5) * 5);
  $('main').innerHTML = view.listingPage({ listing: l, favorite: session.favorites.has(l.id), closed, minBid, admin: !!session.account?.admin });
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
  // Photos: thumbnails, arrow buttons, the arrow keys, dragging with the mouse or swiping with a finger,
  // and a full screen viewer (the button on desktop, a tap on phones). Escape leaves full screen.
  let at = 0;
  const n = l.photos.length, viewer = $('photoViewer');
  const fillViewer = () => { if (!viewer || viewer.hidden) return; $('pvStage').innerHTML = view.viewerPhoto(l.photos[at], l.title); if ($('pvCount')) $('pvCount').textContent = n > 1 ? `${at + 1} / ${n}` : ''; };
  const show = i => {
    if (n < 2) return;
    at = (i + n) % n;
    $('mainPhoto').innerHTML = view.ph(l.photos[at], false, l.title);
    document.querySelectorAll('#thumbs [data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === at));
    if ($('photoCount')) $('photoCount').textContent = `${at + 1} / ${n}`;
    fillViewer();
  };
  const openViewer = full => {
    if (!viewer || !n) return;
    viewer.hidden = false; document.body.classList.add('viewer-open'); fillViewer(); $('pvExit').focus();
    if (full && viewer.requestFullscreen) viewer.requestFullscreen().catch(() => {});
  };
  const closeViewer = () => {
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true; document.body.classList.remove('viewer-open');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $('photoFull')?.focus();
  };
  // The browser's own full screen ends with Escape too, so the viewer closes with it.
  const onFullscreen = () => { if (!document.fullscreenElement) closeViewer(); };
  document.addEventListener('fullscreenchange', onFullscreen);
  // Drag with the mouse or swipe with a finger: far enough sideways changes the photo.
  let swiped = false;
  const swipe = el => {
    if (!el) return;
    let x0 = null, y0 = 0;
    el.addEventListener('pointerdown', e => { if (e.button > 0 || e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; swiped = false; });
    el.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; show(at + (dx < 0 ? 1 : -1)); }
    });
    el.addEventListener('pointercancel', () => { x0 = null; });
    el.addEventListener('dragstart', e => e.preventDefault());
  };
  swipe(document.querySelector('.photo-frame')); swipe(viewer);
  // On phones a tap on the photo opens full screen. A swipe doesn't count as a tap.
  $('mainPhoto')?.addEventListener('click', () => { if (swiped) { swiped = false; return; } if (matchMedia('(hover: none)').matches) openViewer(false); });
  $('photoFull')?.addEventListener('click', () => openViewer(true));
  $('pvExit')?.addEventListener('click', closeViewer);
  $('pvPrev')?.addEventListener('click', () => show(at - 1));
  $('pvNext')?.addEventListener('click', () => show(at + 1));
  $('thumbs')?.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
  $('photoPrev')?.addEventListener('click', () => show(at - 1));
  $('photoNext')?.addEventListener('click', () => show(at + 1));
  const onKey = e => {
    if (e.key === 'Escape' && viewer && !viewer.hidden) { e.preventDefault(); closeViewer(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  };
  document.addEventListener('keydown', onKey);
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
  // Admins can remove anyone's listing after typing their own password.
  $('adminDeleteBtn')?.addEventListener('click', () => { $('adminDeleteBtn').hidden = true; $('adminDeleteForm').hidden = false; $('adminPw').focus(); });
  $('adminDeleteCancel')?.addEventListener('click', () => { $('adminDeleteForm').hidden = true; $('adminDeleteBtn').hidden = false; $('adminPw').value = ''; $('adminDeleteErr').hidden = true; });
  $('adminDeleteForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('adminDeleteErr'), btn = e.target.querySelector('button[type=submit]'), password = $('adminPw').value;
    if (!password) { err.textContent = 'Type your password.'; err.hidden = false; return; }
    err.hidden = true; btn.disabled = true;
    try {
      const me = session.account, { salt } = await api('login/salt', { json: { login: me.email || me.username } });
      await api(`listings/${l.id}/admin-delete`, { json: { proof: await passwordProof(salt, password) } });
      toast('Listing removed'); go('/');
    } catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; $('adminPw').value = ''; }
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
  return () => { chat?.stop(); document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFullscreen); closeViewer(); };
}
