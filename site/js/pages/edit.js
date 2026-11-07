import { $, toast } from '../util.js';
import { view } from '../theme.js';
import { api, session, getOptions } from '../api.js';
import { go, needLogin } from '../app.js';

// Owners change the words, price and details of a live listing. Photos stay as they are.
export async function editListingPage(id) {
  if (!session.account) return needLogin();
  let d;
  try { d = await api('listings/' + encodeURIComponent(id)); } catch (e) { if (e.restart) throw e; $('main').innerHTML = view.notFound(e.message); return; }
  const l = d.listing;
  if (!l.mine) { $('main').innerHTML = view.notFound('That isn\'t your listing.'); return; }
  if (l.status !== 'live') { $('main').innerHTML = view.notFound('Only live listings can be edited.'); return; }
  const options = await getOptions(), priceLocked = l.sell_type === 'auction' && l.bids > 0;
  $('main').innerHTML = view.editListingPage({ listing: l, options, priceLocked });
  $('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('editErr'), btn = e.target.querySelector('button[type=submit]'), val = k => $(k) ? $(k).value : undefined;
    err.hidden = true; btn.disabled = true;
    const body = { action: 'edit', title: val('eTitle'), description: val('eDesc'), price: priceLocked ? undefined : +val('ePrice'), condition: val('eCond'), city: val('eCity'), handoff: val('eHandoff'),
      fits: val('eFit'), year: val('eYear'), miles: val('eMiles'), title_status: val('eTitleS') };
    try { await api('listings/' + encodeURIComponent(id), { method: 'PATCH', json: body }); toast('Listing updated'); go('/listing/' + id); }
    catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; }
  });
}
