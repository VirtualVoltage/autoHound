// Page layouts for this profile. Each function only returns HTML. The element IDs and data-* attributes
// listed in site/profiles/README.md must stay, because the shared logic attaches to them.
import { esc, money, townLine, timeLeft, shortDate, clock, profileAsset } from '/js/util.js';

export const ph = (src, cover, alt = '') => src ? `<span class="ph ${cover ? 'cover' : ''}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></span>` : missingPhoto();
export const missingPhoto = () => `<span class="ph missing">Photo unavailable</span>`;
export const avatar = (src, alt = '') => `<img class="avatar" src="${esc(src || profileAsset('brand-profile.webp'))}" alt="${esc(alt)}">`;
export const notFound = (msg = 'That page isn\'t here.') => `<div class="wrap page"><div class="empty"><b>${esc(msg)}</b><a class="btn" href="/">Go home</a></div></div>`;
export const setupScreen = () => `<div class="setup"><h1 class="main-title">Setting up the demo</h1><div class="bar"><i id="setupBar" style="width:0"></i></div><p class="muted">This only happens once.</p></div>`;

/* ---------- frame around every page ---------- */
export const shell = () => `
<div class="demo-strip"><div class="wrap">Demo. The demo accounts and listings are made up, and anything you post is public. Nothing is charged.</div></div>
<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="/" aria-label="Autohound home"><img class="avatar" src="${profileAsset('brand-profile.webp')}" alt="" width="40" height="40"><b class="chrome">auto</b><span>hound</span></a>
    <form class="search" id="searchForm" role="search">
      <input id="searchInput" type="search" placeholder="Search coilovers, 3000GT, Lynden..." aria-label="Search listings">
      <button type="submit">Search</button>
    </form>
    <nav class="head-links" id="headLinks" aria-label="Account"></nav>
  </div>
</header>
<main id="main"></main>
<footer><div class="wrap foot-note">Sample photos came from public GitHub projects and belong to their owners. Replace them before a real launch.</div></footer>
<div id="toast" class="toast" role="status" hidden></div>`;
export function headerLinks({ account, unread }) {
  const badge = unread ? `<span class="badge-count">${unread}</span>` : '', name = account && ([...account.username].length > 16 ? [...account.username].slice(0, 15).join('') + '…' : account.username);
  return `<a class="btn" href="/sell">Sell</a>` + (account
    ? `<a href="/favorites">Favorites</a><a href="/messages">Messages${badge}</a><a href="/account">${esc(name)}</a>`
    : `<a href="/login">Log in</a><a href="/signup">Sign up</a>`);
}

/* ---------- listing window ---------- */
export const star = (id, on) => `<button class="star ${on ? 'on' : ''}" data-act="favorite" data-style="star" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Remove from favorites' : 'Add to favorites'}">${on ? '★' : '☆'}</button>`;
export const favoriteButton = (id, on) => `<button class="btn plain" data-act="favorite" data-style="button" data-id="${esc(id)}">${on ? '★ Favorited' : '☆ Favorite'}</button>`;
export function windowCard(l, favorite) {
  const live = l.sell_type === 'auction' && l.auction_ends > Date.now();
  const flag = live ? '<span class="flag">AUCTION</span>' : l.kind === 'cars' ? `<span class="flag dark">${esc(l.category.toUpperCase())}</span>` : '';
  const photo = l.photo ? (l.photo.startsWith('blob:') ? l.photo : l.photo + '?size=thumb') : null;
  return `<article class="window">${l.preview ? '' : star(l.id, favorite)}${flag}${ph(photo, l.kind === 'cars', l.title)}
    <div class="window-body"><div class="money">${money(l.price)}</div><h3><a href="/listing/${esc(l.id)}">${esc(l.title)}</a></h3><p class="desc">${esc(l.description)}</p>
    ${live ? `<div class="muted" data-end="${l.auction_ends}">${timeLeft(l.auction_ends - Date.now())}</div>` : ''}
    <div class="town">${townLine(l.city)}</div></div></article>`;
}
const dealOf = r => r <= .9 ? { k: 'great', t: 'Great price' } : r <= 1.1 ? { k: 'fair', t: 'Fair price' } : { k: 'high', t: 'High price' };
const pct = r => { const p = Math.round(Math.abs(1 - r) * 100); return p === 0 ? 'At market' : `${p}% ${r < 1 ? 'under' : 'over'} market`; };
export function meter(ratio, value) {
  const lo = .6, hi = 1.4, pos = Math.min(100, Math.max(0, (ratio - lo) / (hi - lo) * 100)), d = dealOf(ratio);
  let leds = '';
  for (let i = 0; i < 16; i++) { const c = lo + (i + .5) * .05, lit = c <= ratio + .025; leds += `<i class="led ${lit ? (c <= .9 ? 'g' : c <= 1.1 ? 'a' : 'r') : ''}"></i>`; }
  return `<div class="meter" aria-label="Price compared with market value"><div class="meter-top"><b class="pill ${d.k}">${d.t}</b><span class="muted">${pct(ratio)}${value ? ` · est. value ${money(value)}` : ''}</span></div>
    <div class="leds">${leds}<i class="needle" style="left:${pos}%"></i></div>
    <div class="scale"><span style="left:0">60%</span><span style="left:37.5%">90%</span><span style="left:50%">Market</span><span style="left:62.5%">110%</span><span style="left:100%">140%</span></div></div>`;
}
const grid = (list, empty, favorites) => list.length ? `<div class="windows">${list.map(l => windowCard(l, favorites.has(l.id))).join('')}</div>` : `<div class="empty"><b>${empty}</b></div>`;

/* ---------- home ---------- */
function ticker(list) {
  const items = list.slice(0, 8).map(l => `<span class="tk-i">${esc(l.title.toUpperCase())} <span class="money">${money(l.price)}</span> <span class="town">${esc(l.city.toUpperCase())}</span></span>`).join('');
  return items ? `<div class="ticker" aria-hidden="true"><div class="ticker-in">${items}${items}</div></div>` : '';
}
export const homePage = ({ q, min, max, sort, sorts, tickerListings }) => `<div class="banner"><img src="${profileAsset('brand-banner.webp')}" alt="Autohound: a dog carrying a wrench in its mouth"></div>${ticker(tickerListings)}
  <div class="wrap page">
    <h1 class="main-title center">${q ? `Results for ${esc(q)}` : 'Popular listings'}</h1>
    <div class="filters">
      <div class="price-range"><b>Price</b><input id="minPrice" type="number" min="0" inputmode="numeric" placeholder="min" aria-label="Minimum price" value="${esc(min)}"><span>to</span><input id="maxPrice" type="number" min="0" inputmode="numeric" placeholder="max" aria-label="Maximum price" value="${esc(max)}"></div>
      <div class="sorts" role="group" aria-label="Sort listings">${sorts.map(([k, t]) => `<button data-sort="${k}" class="${sort === k ? 'on' : ''}" aria-pressed="${sort === k}">${t}</button>`).join('')}</div>
    </div>
    <div id="windows" class="windows"></div>
    <div id="emptyMsg" class="empty" hidden><b>Nothing matches that.</b><span>Try a different search or price.</span></div>
    <div class="center" style="margin-top:14px;width:fit-content"><button id="moreBtn" class="btn plain" hidden>Show more</button></div>
  </div>`;

/* ---------- sign up and log in ---------- */
export const authPage = ({ signup, limits: L, otherLink }) => `<div class="wrap page"><form class="panel auth" id="authForm" novalidate>
    <h1 class="main-title">${signup ? 'Make an account' : 'Log in'}</h1>
    <label class="field"><span>Username</span><input id="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="80"></label>
    ${signup ? `<label class="field"><span>Email</span><input id="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="254"></label>` : ''}
    <label class="field"><span>Password</span><input id="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" maxlength="40"></label>
    ${signup ? `<p class="note">Username: ${L.usernameMin} to ${L.usernameMax} characters, with spaces allowed but no underscores. Password: ${L.passwordMin} to ${L.passwordMax} characters. Your email stays private. Password resets by email are coming soon.</p>` : ''}
    <p class="err" id="authErr" role="alert" hidden></p>
    <button class="btn" type="submit">${signup ? 'Sign up' : 'Log in'}</button>
    <p class="note">${signup ? 'Already have an account?' : 'New here?'} <a href="${esc(otherLink)}">${signup ? 'Log in' : 'Sign up'}</a></p>
  </form></div>`;

/* ---------- listing ---------- */
function buyBox(l, minBid) {
  if (l.sell_type !== 'auction') return '';
  if (l.ended) return `<div class="panel"><div class="lab">${l.won ? 'You won this auction' : 'Auction closed'}</div><div class="lab">Final price</div><div class="big-price">${money(l.price)}</div>
    ${l.won ? '<p>Message the seller below to set up pickup.</p>' : ''}
    ${l.mine ? `<div class="result"><div><span>Autohound fee</span><b>${money(l.seller_fee || 0)}</b></div><div class="total"><span>You receive</span><b>${money(l.price - (l.seller_fee || 0))}</b></div></div><p class="note">Fee is charged once the sale is paid on the real site.</p>` : ''}</div>`;
  return `<div class="panel"><div class="lab">Current bid · ${l.bids} bids · <span data-end="${l.auction_ends}">${timeLeft(l.auction_ends - Date.now())}</span></div><div class="big-price">${money(l.price)}</div>
    ${l.mine ? '' : `<form id="bidForm" novalidate style="display:grid;gap:7px"><label class="field"><span>Your bid, ${money(minBid)} or more</span><input id="bidAmt" type="number" inputmode="numeric" min="${minBid}" value="${minBid}"></label><p class="err" id="bidErr" hidden></p><button class="btn full" type="submit">Place bid</button></form>`}</div>`;
}
function attrs(l) {
  const rows = [['Condition', l.condition], ...(l.kind === 'cars' ? [['Year', l.car.year], ['Odometer', l.car.miles.toLocaleString('en-US')], ['Title status', l.car.title_status], ['Tier', l.category]] : [['Fits', l.fits], ['Category', l.category]]), ['Handoff', l.handoff]];
  return `<div class="panel attrs">${rows.map(([a, b]) => `<div><span class="muted">${a}:</span> <b>${esc(b)}</b></div>`).join('')}</div>`;
}
export function listingPage({ listing: l, favorite, closed, minBid }) {
  const statusNote = l.status === 'sold' ? '<p class="err">This listing has sold.</p>' : l.status === 'draft' ? '<p class="err">This draft never finished publishing.</p>' : closed ? '<p class="err">This listing is no longer public.</p>' : '';
  return `<div class="wrap page">
    <div class="crumb"><a href="/">Home</a> › ${esc(l.category)}</div>
    <div class="actions">
      ${l.mine ? (closed ? '' : `<button class="btn plain" id="soldBtn">Mark sold</button><button class="btn plain" id="deleteBtn">Delete listing</button>`) : `${favoriteButton(l.id, favorite)}${closed ? '' : '<button class="btn plain" id="reportBtn">Report</button>'}`}
    </div>
    <div class="post-title">${esc(l.title)} <span class="money">${money(l.price)}</span> <span class="town">(${townLine(l.city)})</span></div>
    ${statusNote}
    <div class="post">
      <div class="gallery"><div id="mainPhoto">${ph(l.photos[0], false, l.title)}</div>${l.photos.length > 1 ? `<div class="thumbs" id="thumbs">${l.photos.map((p, i) => `<button data-i="${i}" aria-label="Show photo ${i + 1}">${ph(p + '?size=thumb', true)}</button>`).join('')}</div>` : ''}
        <p class="body-text">${esc(l.description)}</p>
        <p class="meta-line">Posted ${shortDate(l.created)}</p>
      </div>
      <div class="side">
        ${buyBox(l, minBid)}
        ${l.sell_type === 'post' && l.market_value ? meter(l.price / l.market_value, l.market_value) : ''}
        ${attrs(l)}
        <div class="panel"><a class="seller-card" href="/seller/${esc(l.seller.id)}">${avatar(l.seller.photo, '')}<b>${esc(l.seller.username)}</b></a>
          ${l.mine || closed ? '' : `<form id="msgForm" novalidate style="display:grid;gap:7px"><label class="field"><span>Message the seller</span><textarea id="msgText" rows="3" maxlength="2000">Is this still available?</textarea></label><p class="err" id="msgErr" hidden></p><button class="btn" type="submit">Send message</button></form>`}
        </div>
      </div>
    </div></div>`;
}

/* ---------- sell ---------- */
const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
export const sellPhotoGrid = (photos, max) => photos.map((p, i) => `<div class="up-photo">${ph(p.url, true, `Photo ${i + 1}`)}${i === 0 ? '<span class="flag">COVER</span>' : `<button type="button" class="up-cover" data-cover="${i}">make cover</button>`}<button type="button" class="up-x" data-remove="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join('') + (photos.length < max ? `<label class="up-add" for="sPhotos"><b>+ Add photos</b><span>${photos.length} of ${max}. Drop files here or click.</span></label>` : '');
export function sellPreview({ card, value, price }) {
  const guide = value ? `<div class="lab">Estimated market value</div><div class="big-price">${money(value * .9)} to ${money(value * 1.1)}</div>${price ? meter(price / value, value) : ''}<button class="btn plain" type="button" id="useEst" data-v="${value}">Use ${money(value)}</button>` : '';
  return `<div class="lab">How it will look</div><div class="preview-win">${windowCard(card, false)}</div>${guide}`;
}
export const sellPage = ({ draft: D, options: o, estimates, max }) => `<div class="wrap page"><div class="sec-head"><h1 class="main-title">Sell it on Autohound</h1><span class="muted">Everyone can see what you post. No personal info, and nothing illegal or stolen.</span></div>
    <div class="sell-grid"><form class="panel" id="sellForm" novalidate>
      <div class="field"><span>Photos</span><div class="up-grid" id="upGrid">${sellPhotoGrid(D.photos, max)}</div><input id="sPhotos" class="sr" type="file" accept="image/*" multiple><p class="err" id="photoErr" hidden></p></div>
      <div class="two"><label class="field"><span>What are you selling?</span><select id="sKind">${opt('parts', 'A part', D.kind)}${opt('cars', 'A car or truck', D.kind)}</select></label>
        <label class="field" data-for="parts"><span>Part type</span><select id="sPart">${opt('other', 'Something else', D.part)}${estimates.map((e, i) => opt(i, e[0], D.part)).join('')}</select></label>
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

/* ---------- messages ---------- */
export const inboxPage = list => `<div class="wrap page"><h1 class="main-title" style="margin-bottom:12px">Messages</h1>
    ${list.length ? list.map(c => `<a class="inbox-row ${c.unread ? 'unread' : ''}" href="/messages/${esc(c.id)}">${ph(c.listing.photo ? c.listing.photo + '?size=thumb' : null, true, '')}
      <div style="min-width:0"><b>${esc(c.listing.title)}</b> <span class="money">${money(c.listing.price)}</span><div class="muted">${c.role === 'selling' ? 'Buyer' : 'Seller'}: ${esc(c.with.username)}${c.listing.status !== 'live' ? ` · ${c.listing.status === 'sold' ? 'sold' : 'listing removed'}` : ''}</div><div class="last">${c.last_from_me ? 'You: ' : ''}${esc(c.last_text)}</div></div>
      ${c.unread ? '<span class="badge-count">New</span>' : ''}</a>`).join('') : `<div class="empty"><b>No messages yet.</b><span>Find a listing and message the seller. Chats clear after 7 days with no new messages.</span><a class="btn" href="/">Browse listings</a></div>`}</div>`;
function attachmentHtml(a) {
  if (!a) return '';
  if (a.type === 'video') return `<video src="${esc(a.url)}" controls preload="metadata"></video>`;
  if (a.type === 'document') return `<a class="btn plain" href="${esc(a.url)}" target="_blank" rel="noopener">Open PDF</a>`;
  return `<a href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.url)}?size=thumb" alt="Attached photo"></a>`;
}
export const bubble = (m, me) => `<div class="bubble ${m.from === me ? 'me' : ''}" data-mid="${esc(m.id)}">${attachmentHtml(m.attachment)}${m.text ? `<p>${esc(m.text)}</p>` : ''}<time>${esc(clock(m.time))}</time></div>`;
export const pendingPhoto = url => ph(url, true, 'Photo to send');
export const pendingFile = name => `<span class="chip">${esc(name)}</span>`;
export const threadPage = (d, days) => `<div class="wrap page">
    <div class="crumb"><a href="/messages">Messages</a></div>
    <div class="thread-head">${ph(d.listing.photo ? d.listing.photo + '?size=thumb' : null, true, '')}<div style="min-width:0"><a href="/listing/${esc(d.listing.id)}"><b>${esc(d.listing.title)}</b></a> <span class="money">${money(d.listing.price)}</span>
      <div class="seller-card" style="margin-top:3px"><a href="/seller/${esc(d.with.id)}">${esc(d.with.username)}</a><span class="muted">· chat clears after ${days} days without a message</span></div></div></div>
    <div class="thread" id="thread">${d.messages.map(m => bubble(m, d.me)).join('')}</div>
    <div class="attach-preview" id="attachPreview"></div>
    <form class="composer" id="composer" novalidate>
      <label class="btn plain" for="attachInput" aria-label="Attach a photo, video or PDF">Attach</label><input id="attachInput" class="sr" type="file" accept="image/*,video/mp4,video/webm,application/pdf">
      <textarea id="msgText" rows="2" maxlength="2000" placeholder="Write a message" aria-label="Message"></textarea>
      <button class="btn" type="submit">Send</button>
    </form><p class="note" style="margin-top:7px">Meet in a public place, inspect before you pay, and never wire money.</p></div>`;

/* ---------- profile pages ---------- */
export const accountPage = ({ account: a, photo, listings, favorites }) => `<div class="wrap page">
    <div class="profile">${avatar(photo, 'Your profile picture')}<div style="display:grid;gap:6px"><h1 class="main-title">${esc(a.username)}</h1><span class="muted">Joined ${shortDate(a.joined)}</span>${a.email ? `<span class="muted">${esc(a.email)}</span>` : ''}
      <div class="actions" style="margin:0"><label class="btn plain" for="photoInput">Change picture</label><input id="photoInput" class="sr" type="file" accept="image/*"><button class="btn plain" id="logoutBtn">Log out</button></div></div></div>
    <h2 style="margin-bottom:10px">Your listings</h2>${grid(listings, 'You have no live listings.', favorites)}</div>`;
export const sellerPage = ({ account: a, listings, favorites }) => `<div class="wrap page"><div class="profile">${avatar(a.photo, '')}<div style="display:grid;gap:6px"><h1 class="main-title">${esc(a.username)}</h1><span class="muted">Joined ${shortDate(a.joined)} · ${listings.length} live listings</span></div></div>${grid(listings, 'No live listings.', favorites)}</div>`;
export const favoritesPage = ({ listings, favorites }) => `<div class="wrap page"><h1 class="main-title" style="margin-bottom:12px">Favorites</h1>${grid(listings, 'Press the star on any listing to save it here.', favorites)}</div>`;
