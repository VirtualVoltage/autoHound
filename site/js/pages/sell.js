import { $, esc, money, ph, toast, shrink } from '../util.js';
import { api, upload, session, getOptions } from '../api.js';
import { windowCard, meter } from '../components.js';
import { go, needLogin } from '../app.js';

const MAX = 8;
// Rough demo estimates, used for the price guide.
const ESTIMATES = [['Coilovers', 900, 'Suspension'], ['Clutch kit', 420, 'Drivetrain'], ['Wheels, set of 4', 1100, 'Wheels & Tires'], ['Turbocharger', 1250, 'Engine'], ['Standalone ECU', 700, 'Electrical'], ['Headlight pair', 260, 'Lighting'], ['Tires, set of 4', 520, 'Wheels & Tires'], ['Big brake kit', 980, 'Brakes'], ['Intake', 180, 'Engine'], ['Bucket seats, pair', 650, 'Interior'], ['Interior panels', 220, 'Interior']];
const COND_FACTOR = { New: 1.2, 'Like new': 1.05, Excellent: 1, Good: .9, Fair: .7, 'Parts only': .4 };
const blank = () => ({ kind: 'parts', part: 'other', category: 'Engine', tier: 'Daily', year: '', miles: '', title_status: 'Clean', condition: 'Good', sell_type: 'post', price: '', title: '', fits: '', city: 'Lynden', handoff: 'Meet up or pick up', description: '', photos: [] });
let D = blank();
const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
const estimate = () => { if (D.kind !== 'parts' || D.part === 'other') return null; const e = ESTIMATES[+D.part]; return e ? Math.round(e[1] * COND_FACTOR[D.condition] / 5) * 5 : null; };
const category = () => D.kind === 'cars' ? D.tier : (D.part !== 'other' && ESTIMATES[+D.part]) ? ESTIMATES[+D.part][2] : D.category;
function read() {
  for (const [k, id] of Object.entries({ kind: 'sKind', part: 'sPart', category: 'sCategory', tier: 'sTier', year: 'sYear', miles: 'sMiles', title_status: 'sTitleS', condition: 'sCond', sell_type: 'sMode', price: 'sPrice', title: 'sTitle', fits: 'sFit', city: 'sCity', handoff: 'sHandoff', description: 'sDesc' })) { const el = $(id); if (el) D[k] = el.value; }
}
function photoGrid() {
  return D.photos.map((p, i) => `<div class="up-photo">${ph(p.url, true, `Photo ${i + 1}`)}${i === 0 ? '<span class="flag">COVER</span>' : `<button type="button" class="up-cover" data-cover="${i}">make cover</button>`}<button type="button" class="up-x" data-remove="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join('') + (D.photos.length < MAX ? `<label class="up-add" for="sPhotos"><b>+ Add photos</b><span>${D.photos.length} of ${MAX}. Drop files here or click.</span></label>` : '');
}
function preview() {
  const value = estimate(), price = Math.max(0, +D.price || 0);
  const card = windowCard({ preview: true, id: 'x', title: D.title.trim() || 'Your listing title', description: D.description.trim() || 'Your description shows up here.', price, kind: D.kind, category: category(), city: D.city, photo: D.photos[0]?.url || null, sell_type: D.sell_type, auction_ends: 0 });
  let guide = '';
  if (value) guide = `<div class="lab">Estimated market value</div><div class="big-price">${money(value * .9)} to ${money(value * 1.1)}</div>${price ? meter(price / value, value) : ''}<button class="btn plain" type="button" id="useEst" data-v="${value}">Use ${money(value)}</button>`;
  return `<div class="lab">How it will look</div><div class="preview-win">${card}</div>${guide}`;
}
const refresh = () => { read(); $('sellPreview').innerHTML = preview(); document.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== D.kind; }); $('sCategoryField').hidden = D.kind === 'cars' || D.part !== 'other'; $('sPriceLabel').textContent = D.sell_type === 'auction' ? 'Starting bid' : 'Price'; };
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
  $('main').innerHTML = `<div class="wrap page"><div class="sec-head"><h1 class="main-title">Sell it on Autohound</h1><span class="muted">Everyone can see what you post. No personal info, and nothing illegal or stolen.</span></div>
    <div class="sell-grid"><form class="panel" id="sellForm" novalidate>
      <div class="field"><span>Photos</span><div class="up-grid" id="upGrid">${photoGrid()}</div><input id="sPhotos" class="sr" type="file" accept="image/*" multiple><p class="err" id="photoErr" hidden></p></div>
      <div class="two"><label class="field"><span>What are you selling?</span><select id="sKind">${opt('parts', 'A part', D.kind)}${opt('cars', 'A car or truck', D.kind)}</select></label>
        <label class="field" data-for="parts"><span>Part type</span><select id="sPart">${opt('other', 'Something else', D.part)}${ESTIMATES.map((e, i) => opt(i, e[0], D.part)).join('')}</select></label>
        <label class="field" data-for="cars"><span>Car tier</span><select id="sTier">${o.car_categories.map(c => opt(c, c, D.tier)).join('')}</select></label></div>
      <label class="field" id="sCategoryField"><span>Category</span><select id="sCategory">${o.part_categories.map(c => opt(c, c, D.category)).join('')}</select></label>
      <label class="field"><span>Title</span><input id="sTitle" type="text" maxlength="70" placeholder="Blue coilovers, about 10k miles" value="${esc(D.title)}"></label>
      <div class="two" data-for="cars"><label class="field"><span>Year</span><input id="sYear" type="number" placeholder="1995" value="${esc(D.year)}"></label><label class="field"><span>Miles</span><input id="sMiles" type="number" min="0" placeholder="120000" value="${esc(D.miles)}"></label></div>
      <div class="two"><label class="field"><span>Condition</span><select id="sCond">${o.conditions.map(c => opt(c, c, D.condition)).join('')}</select></label>
        <label class="field" data-for="parts"><span>Fits</span><input id="sFit" type="text" maxlength="60" placeholder="1G and 2G DSM" value="${esc(D.fits)}"></label>
        <label class="field" data-for="cars"><span>Title status</span><select id="sTitleS">${['Clean', 'Rebuilt', 'Salvage'].map(c => opt(c, c, D.title_status)).join('')}</select></label></div>
      <div class="two"><label class="field"><span>Sell it as</span><select id="sMode">${opt('post', 'Regular post', D.sell_type)}${opt('auction', 'Auction, 3 days', D.sell_type)}</select></label>
        <label class="field"><span id="sPriceLabel">Price</span><input id="sPrice" type="number" min="1" inputmode="numeric" placeholder="450" value="${esc(D.price)}"></label></div>
      <div class="two"><label class="field"><span>City</span><select id="sCity">${o.cities.map(c => opt(c, c, D.city)).join('')}</select></label>
        <label class="field"><span>Handoff</span><select id="sHandoff">${o.handoffs.map(c => opt(c, c, D.handoff)).join('')}</select></label></div>
      <label class="field"><span>Description</span><textarea id="sDesc" rows="5" maxlength="1500" placeholder="What is it, what did it come off of, and is anything wrong with it?">${esc(D.description)}</textarea></label>
      <p class="err" id="sellErr" role="alert" hidden></p><button class="btn" type="submit" id="pubBtn">Publish listing</button>
    </form><div class="panel" id="sellPreview"></div></div></div>`;
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
