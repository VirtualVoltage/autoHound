import { $ } from '../util.js';
import { view } from '../theme.js';
import { api, session } from '../api.js';
import { needLogin, renderHeader } from '../app.js';

// Only accounts with "admin": true in account.json get anything back from these. Everyone else sees "not found".
export async function adminInboxPage() {
  if (!session.account) return needLogin();
  let d;
  try { d = await api('admin/inbox'); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(); return; }
  if (session.adminInbox) { session.adminInbox.unread = d.messages.filter(m => m.unread).length; renderHeader(); }
  $('main').innerHTML = view.adminInboxPage({ messages: d.messages, waiting: d.waiting });
}
export async function adminMessagePage(id) {
  if (!session.account) return needLogin();
  let d;
  try { d = await api('admin/inbox/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  if (session.adminInbox && session.adminInbox.unread > 0) { try { session.adminInbox = (await api('me')).admin_inbox; } catch {} renderHeader(); }
  $('main').innerHTML = view.adminMessagePage({ message: d.message, rawUrl: `/api/admin/inbox/${encodeURIComponent(id)}/raw` });
}
