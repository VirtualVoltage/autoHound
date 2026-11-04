import { $, esc, money, ph, toast, clock, shrink, avatar } from '../util.js';
import { api, upload, session } from '../api.js';
import { notFound } from '../components.js';
import { needLogin, renderHeader } from '../app.js';

export async function inboxPage() {
  if (!session.account) return needLogin();
  const { conversations: list } = await api('conversations');
  session.unread = list.filter(c => c.unread).length; renderHeader();
  $('main').innerHTML = `<div class="wrap page"><h1 class="main-title" style="margin-bottom:12px">Messages</h1>
    ${list.length ? list.map(c => `<a class="inbox-row ${c.unread ? 'unread' : ''}" href="/messages/${esc(c.id)}">${ph(c.listing.photo ? c.listing.photo + '?size=thumb' : null, true, '')}
      <div style="min-width:0"><b>${esc(c.listing.title)}</b> <span class="money">${money(c.listing.price)}</span><div class="muted">${c.role === 'selling' ? 'Buyer' : 'Seller'}: ${esc(c.with.username)}${c.listing.status !== 'live' ? ` · ${c.listing.status === 'sold' ? 'sold' : 'listing removed'}` : ''}</div><div class="last">${c.last_from_me ? 'You: ' : ''}${esc(c.last_text)}</div></div>
      ${c.unread ? '<span class="badge-count">New</span>' : ''}</a>`).join('') : `<div class="empty"><b>No messages yet.</b><span>Find a listing and message the seller. Chats clear after 7 days with no new messages.</span><a class="btn" href="/">Browse listings</a></div>`}</div>`;
}
function attachmentHtml(a) {
  if (!a) return '';
  if (a.type === 'video') return `<video src="${esc(a.url)}" controls preload="metadata"></video>`;
  if (a.type === 'document') return `<a class="btn plain" href="${esc(a.url)}" target="_blank" rel="noopener">Open PDF</a>`;
  return `<a href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.url)}?size=thumb" alt="Attached photo"></a>`;
}
const bubble = (m, me) => `<div class="bubble ${m.from === me ? 'me' : ''}" data-mid="${esc(m.id)}">${attachmentHtml(m.attachment)}${m.text ? `<p>${esc(m.text)}</p>` : ''}<time>${esc(clock(m.time))}</time></div>`;
export async function threadPage(id) {
  if (!session.account) return needLogin();
  let d;
  try { d = await api('conversations/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = notFound(e.message); return; }
  const pending = [];
  const days = () => Math.max(1, Math.ceil((d.expires - Date.now()) / 864e5));
  $('main').innerHTML = `<div class="wrap page">
    <div class="crumb"><a href="/messages">Messages</a></div>
    <div class="thread-head">${ph(d.listing.photo ? d.listing.photo + '?size=thumb' : null, true, '')}<div style="min-width:0"><a href="/listing/${esc(d.listing.id)}"><b>${esc(d.listing.title)}</b></a> <span class="money">${money(d.listing.price)}</span>
      <div class="seller-card" style="margin-top:3px"><a href="/seller/${esc(d.with.id)}">${esc(d.with.username)}</a><span class="muted" id="expiry">· chat clears after ${days()} days without a message</span></div></div></div>
    <div class="thread" id="thread">${d.messages.map(m => bubble(m, d.me)).join('')}</div>
    <div class="attach-preview" id="attachPreview"></div>
    <form class="composer" id="composer" novalidate>
      <label class="btn plain" for="attachInput" aria-label="Attach a photo, video or PDF">Attach</label><input id="attachInput" class="sr" type="file" accept="image/*,video/mp4,video/webm,application/pdf">
      <textarea id="msgText" rows="2" maxlength="2000" placeholder="Write a message" aria-label="Message"></textarea>
      <button class="btn" type="submit">Send</button>
    </form><p class="note" style="margin-top:7px">Meet in a public place, inspect before you pay, and never wire money.</p></div>`;
  const thread = $('thread'); thread.scrollTop = thread.scrollHeight;
  const seen = new Set(d.messages.map(m => m.id));
  const add = m => { if (seen.has(m.id)) return; seen.add(m.id); thread.insertAdjacentHTML('beforeend', bubble(m, d.me)); thread.scrollTop = thread.scrollHeight; };
  $('attachInput').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      if (f.type.startsWith('image/')) {
        const full = await shrink(f, 1280, .8, 650 * 1024), thumb = await shrink(f, 480, .7, 140 * 1024);
        const r = await upload(`conversations/${d.id}/photos`, full); await upload(`photos/${r.id}/thumb`, thumb);
        pending.push(r.id);
        $('attachPreview').insertAdjacentHTML('beforeend', ph(URL.createObjectURL(thumb), true, 'Photo to send'));
      } else {
        toast('Uploading...');
        const r = await upload(`conversations/${d.id}/photos`, f);
        pending.push(r.id);
        $('attachPreview').insertAdjacentHTML('beforeend', `<span class="chip">${esc(f.name)}</span>`);
      }
    } catch (er) { toast(er.message); }
  });
  $('composer').addEventListener('submit', async e => {
    e.preventDefault();
    const box = $('msgText'), text = box.value.trim(), btn = e.target.querySelector('button');
    if (!text && !pending.length) return;
    btn.disabled = true;
    try {
      const r = await api(`conversations/${d.id}/messages`, { json: { text, attachments: pending } });
      box.value = ''; pending.length = 0; $('attachPreview').innerHTML = ''; r.messages.forEach(add);
    } catch (er) { toast(er.message); }
    btn.disabled = false; box.focus();
  });
  $('msgText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });
  const poll = setInterval(async () => {
    if (document.hidden) return;
    try { const n = await api('conversations/' + d.id); n.messages.forEach(add); } catch {}
  }, 5000);
  return () => clearInterval(poll);
}
