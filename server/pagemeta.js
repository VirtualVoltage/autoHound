// What search engines and link previews read on listing and seller pages.
// The site builds its pages in the browser, so without this every page would reach a bot as the same blank "Autohound" page.
// This fills in the page's own title, description, preview photo and product details before index.html is sent.
// Titles and addresses come from the listing's title and the seller's username, never from an ID or folder name.
// Older addresses that used the ID are sent on to the new one. Only public details are used.
import { SITE_ORIGIN } from './sitemap.js';
import { readJsonFile } from './http.js';
import { isId, listingPath, listingIdFromKey, sellerPath } from './ids.js';
import { usernameKey } from './auth.js';

const SITE = 'Autohound';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const oneLine = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, max) => { s = oneLine(s); if ([...s].length <= max) return s; const cut = [...s].slice(0, max - 1).join(''); return (cut.replace(/\s+\S*$/, '') || cut) + '…'; };
const same = (a, b) => { try { return decodeURIComponent(a) === decodeURIComponent(b); } catch { return false; } };
const CONDITION = { New: 'NewCondition', 'Parts only': 'DamagedCondition' };

async function listingMeta({ db, store }, key, path) {
  const id = listingIdFromKey(key);
  if (!id) return { status: 404 };
  const r = await db.get('SELECT l.*, a.username FROM listings l JOIN accounts a ON a.id=l.account_id WHERE l.id=?', id);
  // Drafts, hidden and removed listings look the same as ones that never existed.
  if (!r || !['live', 'sold'].includes(r.status)) return { status: 404 };
  // One address per listing. Old ID links, and links from before a title change, are sent on to it.
  if (!same(path, listingPath(r))) return { redirect: listingPath(r) };
  const url = SITE_ORIGIN + listingPath(r), title = oneLine(r.title);
  if (r.status !== 'live') return { title, noindex: true };
  const l = await readJsonFile(store, `${r.path}/listing.json`).catch(() => null) || {};
  const photos = (l.photos?.length ? l.photos : r.photo ? [r.photo] : []).map(p => `${SITE_ORIGIN}/api/files/${p}`);
  const auction = r.sell_type === 'auction';
  const lead = `${auction ? 'Auction' : 'For sale'} in ${r.city}, WA:`;
  const description = clip(`${lead} ${r.description}`, 160);
  const data = {
    '@context': 'https://schema.org', '@type': r.kind === 'cars' ? ['Product', 'Car'] : 'Product',
    name: oneLine(r.title), description: clip(r.description, 5000), category: r.category, url,
    ...(photos.length ? { image: photos } : {}),
    ...(r.kind === 'cars' && l.car ? { vehicleModelDate: String(l.car.year), mileageFromOdometer: { '@type': 'QuantitativeValue', value: l.car.miles, unitCode: 'SMI' } } : {}),
    offers: {
      '@type': 'Offer', url, price: r.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock',
      ...(l.condition ? { itemCondition: `https://schema.org/${CONDITION[l.condition] || 'UsedCondition'}` } : {}),
      areaServed: { '@type': 'City', name: `${r.city}, WA` }, seller: { '@type': 'Person', name: r.username },
    },
  };
  // Plain text for bots that don't run the page's code. Browsers that do never show it.
  const plain = `<h1>${esc(oneLine(r.title))}</h1><p>${esc(money(r.price))}${auction ? ' (auction)' : ''}, ${esc(r.city)}, WA</p><p>${esc(r.description)}</p>${photos[0] ? `<img src="${esc(photos[0])}" alt="${esc(oneLine(r.title))}">` : ''}<p>Sold by <a href="${esc(sellerPath(r.username))}">${esc(r.username)}</a> on <a href="/">${SITE}</a></p>`;
  return { title, description, url, image: photos[0], type: 'product', data, plain };
}

async function sellerMeta({ db }, key, path) {
  const a = isId(key, 'A') ? await db.get('SELECT id, username FROM accounts WHERE id=?', key) : await db.get('SELECT id, username FROM accounts WHERE username_key=?', usernameKey(String(key)));
  if (!a) return { status: 404 };
  if (!same(path, sellerPath(a.username))) return { redirect: sellerPath(a.username) };
  const id = a.id;
  const rows = await db.all("SELECT id, title, price, city, photo FROM listings WHERE account_id=? AND status='live' ORDER BY created DESC LIMIT 100", id);
  const title = a.username;
  if (!rows.length) return { title, noindex: true };
  const description = clip(`${rows.length} listing${rows.length === 1 ? '' : 's'} from ${a.username} on ${SITE}: ${rows.map(r => oneLine(r.title)).join(', ')}`, 160);
  const plain = `<h1>${esc(a.username)}</h1><ul>${rows.map(r => `<li><a href="${esc(listingPath(r))}">${esc(oneLine(r.title))}</a> ${esc(money(r.price))}, ${esc(r.city)}</li>`).join('')}</ul>`;
  return { title, description, url: SITE_ORIGIN + sellerPath(a.username), image: rows.find(r => r.photo) ? `${SITE_ORIGIN}/api/files/${rows.find(r => r.photo).photo}` : null, type: 'profile', plain };
}

// Every tag added here carries data-page, so the browser can drop them when someone moves to another page (site/js/app.js).
function fill(html, m) {
  const tags = [];
  const meta = (attr, name, content) => { if (content) tags.push(`<meta ${attr}="${name}" content="${esc(content)}" data-page>`); };
  if (m.noindex || m.status === 404) meta('name', 'robots', 'noindex');
  if (m.url) tags.push(`<link rel="canonical" href="${esc(m.url)}" data-page>`);
  if (m.title && !m.noindex) {
    meta('property', 'og:site_name', SITE); meta('property', 'og:type', m.type); meta('property', 'og:title', m.title);
    meta('property', 'og:description', m.description); meta('property', 'og:url', m.url); meta('property', 'og:image', m.image);
    meta('name', 'twitter:card', m.image ? 'summary_large_image' : 'summary');
  }
  if (m.data) tags.push(`<script type="application/ld+json" data-page>${JSON.stringify(m.data).replace(/</g, '\\u003c')}</script>`);
  if (m.title) html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(m.title)} - ${SITE}</title>`);
  if (m.description) html = html.replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => a + esc(m.description) + b);
  if (tags.length) html = html.replace('</head>', () => tags.join('\n') + '\n</head>');
  if (m.plain) html = html.replace('<div id="app"></div>', s => `${s}\n<noscript>${m.plain}</noscript>`);
  return html;
}

// index.html for /listing/<id> and /seller/<id>, with that page's details filled in.
// If anything goes wrong the plain index.html is sent, so the page itself always opens.
export async function pageResponse(ctx, pathname, indexHtml, search = '') {
  let m = {};
  try {
    const hit = pathname.match(/^\/(listing|seller)\/([^/]+)\/?$/);
    if (hit) m = await (hit[1] === 'listing' ? listingMeta : sellerMeta)(ctx, decodeURIComponent(hit[2]), pathname);
  } catch (e) { console.error('pagemeta', e); m = {}; }
  if (m.redirect) return new Response(null, { status: 301, headers: { location: m.redirect + search, 'cache-control': 'no-cache' } });
  return new Response(fill(indexHtml, m), { status: m.status || 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
}
