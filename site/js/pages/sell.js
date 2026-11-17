import { $, toast, shrink } from '../util.js';
import { view } from '../theme.js';
import { api, upload, session, getOptions } from '../api.js';
import { go, needLogin, paint } from '../app.js';
import { mountSpotPicker } from '../spot.js';
import { MAX_PHOTOS, ESTIMATES, blankDraft, estimateOf, previewCard, missingForSale, listingBody } from '../shared.js';

const MAX = MAX_PHOTOS;
let D = blankDraft();
const estimate = () => estimateOf(D);
function read() {
  for (const [k, id] of Object.entries({ kind: 'sKind', part: 'sPart', category: 'sCategory', tier: 'sTier', year: 'sYear', miles: 'sMiles', title_status: 'sTitleS', condition: 'sCond', sell_type: 'sMode', price: 'sPrice', title: 'sTitle', fits: 'sFit', city: 'sCity', handoff: 'sHandoff', description: 'sDesc' })) { const el = $(id); if (el) D[k] = el.value; }
}
const photoGrid = () => view.sellPhotoGrid(D.photos, MAX);
function preview() {
  const card = previewCard(D);
  return view.sellPreview({ card, value: estimate(), price: card.price });
}
const refresh = () => { read(); $('sellPreview').innerHTML = preview(); document.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== D.kind; }); if ($('sCategoryField')) $('sCategoryField').hidden = D.kind === 'cars' || D.part !== 'other'; if ($('sPriceLabel')) $('sPriceLabel').textContent = D.sell_type === 'auction' ? 'Starting bid' : 'Price'; };
async function addFiles(files) {
  const err = $('photoErr'), msgs = [], room = MAX - D.photos.length, list = [...files];
  err.hidden = true;
  if (list.length > room) msgs.push(`Only ${MAX} photos fit, so the extras were left out.`);
  for (const f of list.slice(0, room)) {
    try { const full = await shrink(f, 1280, .8, 650 * 1024), thumb = await shrink(f, 480, .7, 140 * 1024); D.photos.push({ full, thumb, url: URL.createObjectURL(full) }); }
    catch (e) { msgs.push(e.message); }
  }
  if (!$('upGrid')) return;
  $('upGrid').innerHTML = photoGrid(); refresh();
  if (msgs.length) { err.textContent = msgs.join(' '); err.hidden = false; }
}
export async function sellPage() {
  if (!session.account) return needLogin();
  const o = await getOptions();
  paint(view.sellPage({ draft: D, options: o, estimates: ESTIMATES, max: MAX }));
  refresh();
  // Optional pickup pin. The map loads in the background.
  let picker = null;
  mountSpotPicker({ spot: D.spot, town: D.city, options: o, onChange: s => { D.spot = s; } }).then(p => { picker = p; });
  $('sCity')?.addEventListener('change', e => picker?.town(e.target.value));
  const form = $('sellForm');
  form.addEventListener('input', () => { $('sellErr').hidden = true; refresh(); });
  $('sPhotos').addEventListener('change', e => { addFiles(e.target.files).then(() => { e.target.value = ''; }); });
  $('sellPreview').addEventListener('click', e => { if (e.target.id === 'useEst') { $('sPrice').value = e.target.dataset.v; refresh(); } });
  $('upGrid').addEventListener('click', e => {
    const r = e.target.dataset.remove, c = e.target.dataset.cover;
    if (r !== undefined) D.photos.splice(+r, 1);
    else if (c !== undefined) D.photos.unshift(D.photos.splice(+c, 1)[0]);
    else return;
    $('upGrid').innerHTML = photoGrid(); refresh();
  });
  const grid = $('upGrid');
  grid.addEventListener('dragover', e => { e.preventDefault(); grid.classList.add('drag'); });
  grid.addEventListener('dragleave', () => grid.classList.remove('drag'));
  grid.addEventListener('drop', e => { e.preventDefault(); grid.classList.remove('drag'); addFiles(e.dataTransfer.files); });
  form.addEventListener('submit', async e => {
    e.preventDefault(); read();
    const err = $('sellErr'), btn = $('pubBtn'), bad = missingForSale(D, D.photos.length);
    if (bad.length) { err.textContent = `Add ${bad.join(', ')} to publish.`; err.hidden = false; return; }
    btn.disabled = true; err.hidden = true;
    try {
      btn.textContent = 'Creating listing...';
      const { id } = await api('listings', { json: listingBody(D) });
      for (let i = 0; i < D.photos.length; i++) {
        btn.textContent = `Uploading photo ${i + 1} of ${D.photos.length}...`;
        const p = await upload(`listings/${id}/photos`, D.photos[i].full);
        await upload(`photos/${p.id}/thumb`, D.photos[i].thumb);
      }
      btn.textContent = 'Publishing...';
      await api(`listings/${id}/publish`, { method: 'POST' });
      D = blankDraft(); toast('Your listing is live'); go('/listing/' + id);
    } catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Publish listing'; }
  });
  return () => picker?.stop();
}
