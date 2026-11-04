import { $, toast, shrink } from '../util.js';
import { view } from '../theme.js';
import { api, upload, session, getOptions } from '../api.js';
import { go, needLogin } from '../app.js';

const MAX = 8;
// Rough demo estimates, used for the price guide.
const ESTIMATES = [['Coilovers', 900, 'Suspension'], ['Clutch kit', 420, 'Drivetrain'], ['Wheels, set of 4', 1100, 'Wheels & Tires'], ['Turbocharger', 1250, 'Engine'], ['Standalone ECU', 700, 'Electrical'], ['Headlight pair', 260, 'Lighting'], ['Tires, set of 4', 520, 'Wheels & Tires'], ['Big brake kit', 980, 'Brakes'], ['Intake', 180, 'Engine'], ['Bucket seats, pair', 650, 'Interior'], ['Interior panels', 220, 'Interior']];
const COND_FACTOR = { New: 1.2, 'Like new': 1.05, Excellent: 1, Good: .9, Fair: .7, 'Parts only': .4 };
const blank = () => ({ kind: 'parts', part: 'other', category: 'Engine', tier: 'Daily', year: '', miles: '', title_status: 'Clean', condition: 'Good', sell_type: 'post', price: '', title: '', fits: '', city: 'Lynden', handoff: 'Meet up or pick up', description: '', photos: [] });
let D = blank();
const estimate = () => { if (D.kind !== 'parts' || D.part === 'other') return null; const e = ESTIMATES[+D.part]; return e ? Math.round(e[1] * COND_FACTOR[D.condition] / 5) * 5 : null; };
const category = () => D.kind === 'cars' ? D.tier : (D.part !== 'other' && ESTIMATES[+D.part]) ? ESTIMATES[+D.part][2] : D.category;
function read() {
  for (const [k, id] of Object.entries({ kind: 'sKind', part: 'sPart', category: 'sCategory', tier: 'sTier', year: 'sYear', miles: 'sMiles', title_status: 'sTitleS', condition: 'sCond', sell_type: 'sMode', price: 'sPrice', title: 'sTitle', fits: 'sFit', city: 'sCity', handoff: 'sHandoff', description: 'sDesc' })) { const el = $(id); if (el) D[k] = el.value; }
}
const photoGrid = () => view.sellPhotoGrid(D.photos, MAX);
function preview() {
  const price = Math.max(0, +D.price || 0);
  const card = { preview: true, id: 'x', title: D.title.trim() || 'Your listing title', description: D.description.trim() || 'Your description shows up here.', price, kind: D.kind, category: category(), city: D.city, photo: D.photos[0]?.url || null, sell_type: D.sell_type, auction_ends: 0 };
  return view.sellPreview({ card, value: estimate(), price });
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
  $('main').innerHTML = view.sellPage({ draft: D, options: o, estimates: ESTIMATES, max: MAX });
  refresh();
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
    const err = $('sellErr'), btn = $('pubBtn'), bad = [];
    if (!D.photos.length) bad.push('at least one photo');
    if (D.title.trim().length < 4) bad.push('a title');
    if (!(+D.price > 0)) bad.push('a price');
    if (D.kind === 'cars' && !(+D.year >= 1900)) bad.push('the year');
    if (D.kind === 'cars' && D.miles === '') bad.push('the miles');
    if (D.description.trim().length < 10) bad.push('a short description');
    if (bad.length) { err.textContent = `Add ${bad.join(', ')} to publish.`; err.hidden = false; return; }
    btn.disabled = true; err.hidden = true;
    try {
      btn.textContent = 'Creating listing...';
      const { id } = await api('listings', { json: { kind: D.kind, title: D.title, description: D.description, price: +D.price, category: category(), city: D.city, condition: D.condition, handoff: D.handoff, fits: D.fits, sell_type: D.sell_type, market_value: estimate(), year: +D.year, miles: +D.miles, title_status: D.title_status } });
      for (let i = 0; i < D.photos.length; i++) {
        btn.textContent = `Uploading photo ${i + 1} of ${D.photos.length}...`;
        const p = await upload(`listings/${id}/photos`, D.photos[i].full);
        await upload(`photos/${p.id}/thumb`, D.photos[i].thumb);
      }
      btn.textContent = 'Publishing...';
      await api(`listings/${id}/publish`, { method: 'POST' });
      D = blank(); toast('Your listing is live'); go('/listing/' + id);
    } catch (er) { err.textContent = er.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Publish listing'; }
  });
}
