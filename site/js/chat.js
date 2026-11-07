import { $, toast, shrink } from './util.js';
import { view } from './theme.js';
import { api, upload, session } from './api.js';
import { needLogin } from './app.js';

// One chat box: #thread, #attachPreview, #composer, #attachInput, #msgText.
// Used on the listing page and on the chat page. With no chat yet, the first message starts one for listingId.
export function mountChat({ id = null, listingId = null, onStart } = {}) {
  let convId = id, me = session.account?.id, poll = null;
  const pending = [], seen = new Set(), thread = $('thread'), box = $('msgText');
  // The chat opens at the newest message. It stays pinned there unless you scroll up to read, and photos
  // that finish loading later keep it pinned too.
  let pinned = true;
  const toBottom = () => { thread.scrollTop = thread.scrollHeight; };
  thread.addEventListener('scroll', () => { pinned = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 60; });
  thread.addEventListener('load', () => { if (pinned) toBottom(); }, true);
  const add = m => { if (seen.has(m.id)) return; seen.add(m.id); thread.insertAdjacentHTML('beforeend', view.bubble(m, me)); if (pinned || m.from === me) toBottom(); };
  const load = async () => {
    if (!convId) return;
    const d = await api('conversations/' + encodeURIComponent(convId));
    me = d.me; d.messages.forEach(add);
  };
  const startPolling = () => { if (!poll && convId) poll = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 5000); };
  $('attachInput')?.addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!session.account) return needLogin();
    if (!convId) { toast('Send a message first, then attach photos.'); return; }
    try {
      if (f.type.startsWith('image/')) {
        const full = await shrink(f, 1280, .8, 650 * 1024), thumb = await shrink(f, 480, .7, 140 * 1024);
        const r = await upload(`conversations/${convId}/photos`, full); await upload(`photos/${r.id}/thumb`, thumb);
        pending.push(r.id);
        $('attachPreview').insertAdjacentHTML('beforeend', view.pendingPhoto(URL.createObjectURL(thumb)));
      } else {
        toast('Uploading...');
        const r = await upload(`conversations/${convId}/photos`, f);
        pending.push(r.id);
        $('attachPreview').insertAdjacentHTML('beforeend', view.pendingFile(f.name));
      }
    } catch (er) { toast(er.message); }
  });
  $('composer')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!session.account) return needLogin();
    const text = box.value.trim(), btn = e.target.querySelector('button[type=submit]');
    if (!text && !pending.length) return;
    btn.disabled = true;
    try {
      if (!convId) {
        const r = await api(`listings/${listingId}/conversations`, { json: { text } });
        convId = r.id; box.value = ''; await load(); startPolling(); onStart?.(convId);
      } else {
        const r = await api(`conversations/${convId}/messages`, { json: { text, attachments: pending } });
        box.value = ''; pending.length = 0; $('attachPreview').innerHTML = ''; pinned = true; r.messages.forEach(add);
      }
    } catch (er) { toast(er.message); }
    btn.disabled = false; box.focus();
  });
  box?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });
  const ready = load().then(startPolling).catch(er => toast(er.message));
  return { ready, stop: () => clearInterval(poll) };
}
