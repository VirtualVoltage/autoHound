import { $, toast, shrink } from '../util.js';
import { view } from '../theme.js';
import { api, upload, session } from '../api.js';
import { needLogin, renderHeader } from '../app.js';

export async function inboxPage() {
  if (!session.account) return needLogin();
  const { conversations: list } = await api('conversations');
  session.unread = list.filter(c => c.unread).length; renderHeader();
  $('main').innerHTML = view.inboxPage(list);
}
export async function threadPage(id) {
  if (!session.account) return needLogin();
  let d;
  try { d = await api('conversations/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  const pending = [], days = Math.max(1, Math.ceil((d.expires - Date.now()) / 864e5));
  $('main').innerHTML = view.threadPage(d, days);
  const thread = $('thread'); thread.scrollTop = thread.scrollHeight;
  const seen = new Set(d.messages.map(m => m.id));
  const add = m => { if (seen.has(m.id)) return; seen.add(m.id); thread.insertAdjacentHTML('beforeend', view.bubble(m, d.me)); thread.scrollTop = thread.scrollHeight; };
  $('attachInput').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      if (f.type.startsWith('image/')) {
        const full = await shrink(f, 1280, .8, 650 * 1024), thumb = await shrink(f, 480, .7, 140 * 1024);
        const r = await upload(`conversations/${d.id}/photos`, full); await upload(`photos/${r.id}/thumb`, thumb);
        pending.push(r.id);
        $('attachPreview').insertAdjacentHTML('beforeend', view.pendingPhoto(URL.createObjectURL(thumb)));
      } else {
        toast('Uploading...');
        const r = await upload(`conversations/${d.id}/photos`, f);
        pending.push(r.id);
        $('attachPreview').insertAdjacentHTML('beforeend', view.pendingFile(f.name));
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
