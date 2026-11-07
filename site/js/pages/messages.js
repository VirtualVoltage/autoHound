import { $ } from '../util.js';
import { view } from '../theme.js';
import { api, session } from '../api.js';
import { mountChat } from '../chat.js';
import { go, needLogin, renderHeader } from '../app.js';

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
  // Profiles that keep chats in the box on the listing page open live listings there.
  if (view.chatOnListing && d.listing.status === 'live') { go(`/listing/${d.listing.id}?chat=${encodeURIComponent(d.id)}`, true); return; }
  const days = Math.max(1, Math.ceil((d.expires - Date.now()) / 864e5));
  $('main').innerHTML = view.threadPage(d, days);
  const chat = mountChat({ id: d.id });
  return chat.stop;
}
