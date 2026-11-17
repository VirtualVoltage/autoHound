// Every page people can open, built here as finished HTML (AGENTS.md: HTML first). The page's words, links,
// photos and forms are all in the HTML, so it works with JavaScript off and bots read it on the first visit.
// The browser's JavaScript then keeps this HTML and only adds the extras (site/js/app.js).
// Pages use the active profile's own views.js, the same file the browser uses, so there is one copy of each page.
// Forms post to the page addresses below and get a redirect back, like any plain website. With JavaScript on,
// the browser sends the same requests to /api/ instead and never reaches these.
import { handle } from './api.js';
import { pageMeta, fillMeta } from './pagemeta.js';
import { passwordProof, newClientSalt } from './auth.js';
import { LIMITS } from './config.js';
import { SITE_ORIGIN } from './sitemap.js';
import { setPage, esc } from '../site/js/util.js';
import { pageName, tabTitle, safeNext, minBid, SORTS, MAX_PHOTOS, ESTIMATES, blankDraft, previewCard, estimateOf, missingForSale, listingBody } from '../site/js/shared.js';
import * as p1d from '../site/profiles/profile1/desktop/views.js';
import * as p1m from '../site/profiles/profile1/mobile/views.js';
import * as p2d from '../site/profiles/profile2/desktop/views.js';
import * as p2m from '../site/profiles/profile2/mobile/views.js';
import * as p3d from '../site/profiles/profile3/desktop/views.js';
import * as p3m from '../site/profiles/profile3/mobile/views.js';

const VIEWS = { profile1: { desktop: p1d, mobile: p1m }, profile2: { desktop: p2d, mobile: p2m }, profile3: { desktop: p3d, mobile: p3m } };
// Dates and times on the page are shown in the site's own time zone (the browser uses its own once JavaScript runs).
const TIME_ZONE = 'America/Los_Angeles';
// Only public pages go to search engines.
const PUBLIC = /^\/($|map$|listing\/[^/]+$|seller\/[^/]+$)/;

// site/js/profile.js picks the profile and the phone test. Read it, so the server always agrees with the browser.
let profileRule = null;
async function readProfileRule(ctx) {
  if (profileRule) return profileRule;
  const text = new TextDecoder().decode(await ctx.assets.read('/js/profile.js'));
  const name = text.match(/DEFAULT_PROFILE = '([^']+)'/)?.[1] || 'profile3';
  const phone = text.match(/AUTOHOUND_DEVICE = \/(.+)\/(\w*)\.test\(navigator\.userAgent\)/);
  return (profileRule = { name: VIEWS[name] ? name : 'profile3', phone: phone ? new RegExp(phone[1], phone[2]) : /Mobile/i });
}

// The site's own API, called directly (no network). The visitor's cookie and address go along, so logins,
// permissions and rate limits work exactly as they do for the browser.
function apiFor(ctx, request) {
  const origin = new URL(request.url).origin;
  return async (path, { method, json, body, type } = {}) => {
    const headers = new Headers();
    for (const h of ['cookie', 'cf-connecting-ip', 'x-forwarded-for', 'user-agent', 'accept-language']) { const v = request.headers.get(h); if (v) headers.set(h, v); }
    let payload;
    if (json !== undefined) { headers.set('content-type', 'application/json'); payload = JSON.stringify(json); method ||= 'POST'; }
    else if (body !== undefined) { headers.set('content-type', type || 'application/octet-stream'); payload = body; method ||= 'POST'; }
    const r = await handle(new Request(`${origin}/api/${path}`, { method: method || 'GET', headers, body: payload }), ctx);
    let data = {}; try { data = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, data, cookie: r.headers.get('set-cookie') };
  };
}

// Small helpers for filling a page's HTML by element ID, so they work with every profile's layout.
const tagRe = id => new RegExp(`<([a-z]+)\\b([^>]*\\bid="${id}"[^>]*)>`);
// Puts a message into an error line (like #authErr) and shows it.
export function showMessage(html, id, msg) {
  const m = html.match(tagRe(id));
  if (!m) return html;
  const open = `<${m[1]}${m[2].replace(/\s+hidden(?=[\s>]|$)/, '')}>`, at = m.index, close = html.indexOf(`</${m[1]}>`, at);
  return html.slice(0, at) + open + esc(msg) + html.slice(close);
}
// Refills a text box after a form comes back with an error.
function setValue(html, id, value) {
  if (value === undefined || value === null) return html;
  return html.replace(tagRe(id), (all, tag, attrs) => tag === 'input' ? `<${tag}${attrs.replace(/\svalue="[^"]*"/, '')} value="${esc(value)}">` : all);
}
// Fills an empty element of the profile's frame (header links, side menu, main).
const fillEmpty = (html, id, inner) => html.replace(new RegExp(`(<([a-z]+)\\b[^>]*\\bid="${id}"[^>]*>)(</\\2>)`), (_, open, tag, close) => open + inner + close);

const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const homeHref = ({ q, min, max, sort, offset }) => {
  const p = new URLSearchParams();
  if (q) p.set('q', q); if (min !== '' && min != null) p.set('min', min); if (max !== '' && max != null) p.set('max', max);
  if (sort && sort !== 'popular') p.set('sort', sort); if (offset) p.set('offset', offset);
  const s = p.toString(); return s ? `/?${s}` : '/';
};
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const needLogin = c => ({ redirect: '/login?next=' + encodeURIComponent(c.path + c.url.search) });
const notFound = (c, msg) => ({ main: c.V.notFound(msg), status: 404 });

/* ---------- pages ---------- */
async function home(c) {
  const sp = c.url.searchParams, q = (sp.get('q') || '').trim().slice(0, 200), min = sp.get('min') ?? '', max = sp.get('max') ?? '';
  const sort = SORTS.some(([k]) => k === sp.get('sort')) ? sp.get('sort') : 'popular', offset = int(sp.get('offset'), 0, 100000) || 0;
  const p = new URLSearchParams();
  if (q) p.set('q', q); if (min !== '') p.set('min', min); if (max !== '') p.set('max', max);
  if (sort === 'low' || sort === 'high') p.set('sort', sort);
  p.set('limit', sort === 'popular' ? 100 : 48); p.set('offset', offset);
  const d = (await c.api('listings?' + p)).data, found = d.listings || [];
  const listings = sort === 'popular' ? shuffle(found) : found;
  const moreHref = d.more ? homeHref({ q, min, max, sort, offset: offset + found.length }) : null;
  return { main: c.V.homePage({ q, min, max, sort, sorts: SORTS, listings, favorites: c.session.favorites, moreHref, tickerListings: listings, adminInbox: null, account: c.session.account }), q, noindex: !!(q || sp.toString()) };
}
async function listing(c, key) {
  const r = await c.api('listings/' + encodeURIComponent(key));
  if (!r.ok) return notFound(c, r.data.error);
  const l = r.data.listing, sp = c.url.searchParams, n = l.photos.length;
  const at = Math.min(Math.max(int(sp.get('photo'), 0, 99) || 0, 0), Math.max(n - 1, 0));
  // The chat box: buyers see their own chat, sellers pick a buyer (?chat=).
  const chat = { action: `${l.url}/message` };
  const open = l.mine ? ((l.chats || []).find(x => x.id === sp.get('chat')) || (l.chats || [])[0])?.id : l.chat;
  if (open) {
    const d = await c.api('conversations/' + encodeURIComponent(open));
    if (d.ok) Object.assign(chat, { active: open, messages: d.data.messages, me: d.data.me, action: `/messages/${open}` });
  }
  return { main: c.V.listingPage({ listing: l, favorite: c.session.favorites.has(l.id), closed: l.status !== 'live', minBid: minBid(l.price), admin: !!c.session.account?.admin, at, chat, confirmDelete: !!c.confirmDelete, adminOpen: !!c.adminOpen || sp.has('admin-delete') }), name: l.title };
}
async function editPage(c, key) {
  if (!c.session.account) return needLogin(c);
  const r = await c.api('listings/' + encodeURIComponent(key));
  if (!r.ok) return notFound(c, r.data.error);
  const l = r.data.listing;
  if (!l.mine) return notFound(c, 'That isn\'t your listing.');
  if (l.status !== 'live') return notFound(c, 'Only live listings can be edited.');
  const options = (await c.api('options')).data, shown = c.values ? { ...l, ...c.values, car: l.car && { ...l.car, ...c.values.car } } : l;
  return { main: c.V.editListingPage({ listing: shown, options, priceLocked: l.sell_type === 'auction' && l.bids > 0 }) };
}
async function sellPage(c) {
  if (!c.session.account) return needLogin(c);
  const options = (await c.api('options')).data, D = c.draft || blankDraft(), card = previewCard(D);
  const preview = c.V.sellPreview({ card, value: estimateOf(D), price: card.price });
  return { main: c.V.sellPage({ draft: D, options, estimates: ESTIMATES, max: MAX_PHOTOS, preview }) };
}
async function mapPage(c) {
  const d = await c.api('map');
  return { main: c.V.mapPage(d.ok ? d.data : null) };
}
const authPage = mode => async c => {
  const next = safeNext(c.url.searchParams.get('next'));
  if (c.session.account) return { redirect: next };
  const signup = mode === 'signup', limits = (await c.api('options')).data.limits;
  return { main: c.V.authPage({ signup, limits, otherLink: `/${signup ? 'login' : 'signup'}${c.url.search}`, action: `/${mode}${c.url.search}` }) };
};
async function inboxPage(c) {
  if (!c.session.account) return needLogin(c);
  return { main: c.V.inboxPage((await c.api('conversations')).data.conversations || []) };
}
async function threadPage(c, id) {
  if (!c.session.account) return needLogin(c);
  const r = await c.api('conversations/' + encodeURIComponent(id));
  if (!r.ok) return notFound(c, r.data.error);
  const d = r.data;
  if (c.V.chatOnListing && d.listing.status === 'live') return { redirect: `${d.listing.url}?chat=${encodeURIComponent(d.id)}` };
  return { main: c.V.threadPage(d, Math.max(1, Math.ceil((d.expires - Date.now()) / 864e5))), name: d.listing.title };
}
async function accountPage(c) {
  const a = c.session.account; if (!a) return needLogin(c);
  const d = (await c.api('accounts/' + a.id)).data, security = (await c.api('me/email')).data;
  return { main: c.V.accountPage({ account: a, photo: d.account?.photo, listings: d.listings || [], favorites: c.session.favorites, security }) };
}
async function myListingsPage(c) {
  const a = c.session.account; if (!a) return needLogin(c);
  return { main: c.V.myListingsPage({ listings: (await c.api('accounts/' + a.id)).data.listings || [], favorites: c.session.favorites }) };
}
async function savedPage(c) {
  if (!c.session.account) return needLogin(c);
  return { main: c.V.favoritesPage({ listings: (await c.api('favorites')).data.listings || [], favorites: c.session.favorites }) };
}
async function sellerPage(c, key) {
  const r = await c.api('accounts/' + encodeURIComponent(key));
  if (!r.ok) return notFound(c, r.data.error);
  return { main: c.V.sellerPage({ account: r.data.account, listings: r.data.listings, favorites: c.session.favorites }), name: r.data.account.username };
}
async function verifyPage(c) {
  if (!c.session.account) return needLogin(c);
  const next = safeNext(c.url.searchParams.get('next')), s = (await c.api('me/email')).data;
  if (s.verified || !s.email) return { redirect: next };
  return { main: c.V.verifyPage({ email: s.email, ready: s.ready, sent: c.url.searchParams.get('sent') === '1', next }) };
}
async function adminInboxPage(c) {
  if (!c.session.account) return needLogin(c);
  const r = await c.api('admin/inbox');
  return r.ok ? { main: c.V.adminInboxPage({ messages: r.data.messages, waiting: r.data.waiting }) } : notFound(c);
}
async function adminMessagePage(c, id) {
  if (!c.session.account) return needLogin(c);
  const r = await c.api('admin/inbox/' + encodeURIComponent(id));
  return r.ok ? { main: c.V.adminMessagePage({ message: r.data.message, rawUrl: `/api/admin/inbox/${encodeURIComponent(id)}/raw` }), name: r.data.message.subject || 'Email' } : notFound(c, r.data.error);
}
const PAGES = [
  [/^\/$/, home], [/^\/listing\/([^/]+)$/, listing], [/^\/listing\/([^/]+)\/edit$/, editPage], [/^\/sell$/, sellPage], [/^\/map$/, mapPage],
  [/^\/signup$/, authPage('signup')], [/^\/login$/, authPage('login')],
  [/^\/messages$/, inboxPage], [/^\/messages\/([^/]+)$/, threadPage],
  [/^\/account$/, accountPage], [/^\/my-listings$/, myListingsPage], [/^\/saved$/, savedPage], [/^\/favorites$/, c => ({ redirect: '/saved' + c.url.search, status: 301 })],
  [/^\/seller\/([^/]+)$/, sellerPage], [/^\/verify$/, verifyPage], [/^\/admin$/, adminInboxPage], [/^\/admin\/([^/]+)$/, adminMessagePage],
];

/* ---------- forms sent without JavaScript ---------- */
// Each returns { redirect } when it worked, or { page, message: [elementId, text] } to show the form again.
const text = (f, k) => String(f.get(k) ?? '');
const fileOf = (f, k) => { const v = f.get(k); return v && typeof v === 'object' && v.size > 0 ? v : null; };
const back = c => { const r = c.request.headers.get('referer'); try { const u = new URL(r); if (u.origin === c.url.origin) return u.pathname + u.search; } catch {} return '/'; };
const fail = (page, id, msg, extra = {}) => ({ page, message: [id, msg], ...extra });
// The listing an address points to (any listing action needs its ID for the API).
async function listingFor(c, key) { const r = await c.api('listings/' + encodeURIComponent(key)); return r.ok ? r.data.listing : null; }
async function upload(c, path, file) { return c.api(path, { body: new Uint8Array(await file.arrayBuffer()), type: file.type || 'application/octet-stream' }); }

async function loginAction(c, f) {
  const login = text(f, 'login').trim(), password = text(f, 'password'), next = safeNext(c.url.searchParams.get('next'));
  const again = msg => fail(c.path + c.url.search, 'authErr', msg, { fields: { login } });
  if (!login || !password) return again('Enter your email or username and your password.');
  const s = await c.api('login/salt', { json: { login } });
  if (!s.ok) return again(s.data.error);
  const r = await c.api('login', { json: { login, proof: await passwordProof(s.data.salt, password) } });
  if (!r.ok) return again(r.data.error);
  if (r.data.code_required) return { main: c.V.loginCodePage({ emailHint: r.data.email_hint, ticket: r.data.ticket, action: `/login/code${c.url.search}` }), name: 'Login code' };
  return { redirect: next, cookie: r.cookie };
}
async function loginCodeAction(c, f) {
  const ticket = text(f, 'ticket'), r = await c.api('login/code', { json: { ticket, code: text(f, 'code') } });
  if (r.ok) return { redirect: safeNext(c.url.searchParams.get('next')), cookie: r.cookie };
  return { main: showMessage(c.V.loginCodePage({ emailHint: 'your email', ticket, action: `/login/code${c.url.search}` }), 'codeErr', r.data.error), name: 'Login code', status: r.status };
}
async function signupAction(c, f) {
  const username = text(f, 'username').trim(), email = text(f, 'email').trim(), password = text(f, 'password');
  const again = msg => fail(c.path + c.url.search, 'authErr', msg, { fields: { username, email } });
  const n = [...password].length;
  if (n < LIMITS.passwordMin || n > LIMITS.passwordMax) return again(`Passwords must be ${LIMITS.passwordMin} to ${LIMITS.passwordMax} characters.`);
  if (!email) return again('Add your email address.');
  const client_salt = newClientSalt();
  const r = await c.api('signup', { json: { username, email, client_salt, proof: await passwordProof(`autohound:acct:${client_salt}`, password) } });
  if (!r.ok) return again(r.data.error);
  return { redirect: `/verify?next=${encodeURIComponent(safeNext(c.url.searchParams.get('next')))}${r.data.code?.sent ? '&sent=1' : ''}`, cookie: r.cookie };
}
async function logoutAction(c) { const r = await c.api('logout', { method: 'POST' }); return { redirect: '/', cookie: r.cookie }; }
async function verifyAction(c, f) {
  const r = await c.api('me/email/verify', { json: { code: text(f, 'code') } });
  return r.ok ? { redirect: safeNext(c.url.searchParams.get('next')) } : fail('/verify' + c.url.search, 'verifyErr', r.data.error);
}
async function resendAction(c) {
  const r = await c.api('me/email/code', { method: 'POST' }), next = safeNext(c.url.searchParams.get('next'));
  const again = msg => fail(`/verify?next=${encodeURIComponent(next)}`, 'verifyErr', msg);
  if (!r.ok) return again(r.data.error);
  return r.data.sent ? { redirect: `/verify?next=${encodeURIComponent(next)}&sent=1` } : again('Email sending isn\'t set up yet.');
}
async function saveAction(c, f) {
  if (!c.session.account) return { redirect: '/login?next=' + encodeURIComponent(back(c)) };
  const r = await c.api('favorites', { json: { id: text(f, 'id') } });
  return r.ok ? { redirect: back(c) } : fail(back(c), 'toast', r.data.error);
}
async function messageAction(c, f, key) {
  if (!c.session.account) return needLogin({ ...c, path: '/listing/' + key, url: new URL(c.url.origin) });
  const l = await listingFor(c, key); if (!l) return fail('/', 'toast', 'That listing isn\'t here anymore.');
  const r = await c.api(`listings/${l.id}/conversations`, { json: { text: text(f, 'text') } });
  if (!r.ok) return fail(l.url, 'toast', r.data.error);
  const file = fileOf(f, 'file');
  if (file) await sendInChat(c, r.data.id, '', file);
  return { redirect: `${l.url}?chat=${encodeURIComponent(r.data.id)}` };
}
async function sendInChat(c, id, words, file) {
  const attachments = [];
  if (file) { const u = await upload(c, `conversations/${id}/photos`, file); if (!u.ok) return u; attachments.push(u.data.id); }
  if (!words.trim() && !attachments.length) return { ok: true };
  return c.api(`conversations/${id}/messages`, { json: { text: words, attachments } });
}
async function chatAction(c, f, id) {
  if (!c.session.account) return needLogin(c);
  const r = await sendInChat(c, id, text(f, 'text'), fileOf(f, 'file'));
  const d = await c.api('conversations/' + encodeURIComponent(id));
  const page = d.ok && c.V.chatOnListing && d.data.listing.status === 'live' ? `${d.data.listing.url}?chat=${encodeURIComponent(id)}` : `/messages/${id}`;
  return r.ok ? { redirect: page } : fail(page, 'toast', r.data.error);
}
async function bidAction(c, f, key) {
  if (!c.session.account) return needLogin({ ...c, path: '/listing/' + key, url: new URL(c.url.origin) });
  const l = await listingFor(c, key); if (!l) return fail('/', 'toast', 'That listing isn\'t here anymore.');
  const amount = Number(text(f, 'amount')), least = minBid(l.price);
  if (!amount || amount < least) return fail(l.url, 'bidErr', `Enter $${least.toLocaleString('en-US')} or more to lead this auction.`);
  const r = await c.api(`listings/${l.id}/bid`, { json: { amount } });
  return r.ok ? { redirect: l.url } : fail(l.url, 'bidErr', r.data.error);
}
const statusAction = action => async (c, f, key) => {
  if (!c.session.account) return needLogin(c);
  const l = await listingFor(c, key); if (!l) return fail('/', 'toast', 'That listing isn\'t here anymore.');
  // Deleting asks twice: the first press shows "Press again to delete".
  if (action === 'delete' && text(f, 'sure') !== '1') return { page: l.url, confirmDelete: true };
  const r = await c.api('listings/' + l.id, { method: 'PATCH', json: { action } });
  return r.ok ? { redirect: action === 'delete' ? '/account' : l.url } : fail(l.url, 'toast', r.data.error);
};
async function adminDeleteAction(c, f, key) {
  const a = c.session.account; if (!a) return needLogin(c);
  const l = await listingFor(c, key); if (!l) return fail('/', 'toast', 'That listing isn\'t here anymore.');
  const password = text(f, 'password');
  if (!password) return fail(l.url, 'adminDeleteErr', 'Type your password.', { adminOpen: true });
  const s = await c.api('login/salt', { json: { login: a.email || a.username } });
  const r = s.ok ? await c.api(`listings/${l.id}/admin-delete`, { json: { proof: await passwordProof(s.data.salt, password) } }) : s;
  return r.ok ? { redirect: '/' } : fail(l.url, 'adminDeleteErr', r.data.error, { adminOpen: true });
}
async function editAction(c, f, key) {
  if (!c.session.account) return needLogin(c);
  const l = await listingFor(c, key); if (!l || !l.mine) return fail('/', 'toast', 'That isn\'t your listing.');
  const v = k => f.has(k) ? text(f, k) : undefined, locked = l.sell_type === 'auction' && l.bids > 0;
  const body = { action: 'edit', title: v('title'), description: v('description'), price: locked || v('price') === undefined ? undefined : +v('price'), condition: v('condition'), city: v('city'), handoff: v('handoff'), fits: v('fits'), year: v('year'), miles: v('miles'), title_status: v('title_status') };
  const r = await c.api('listings/' + l.id, { method: 'PATCH', json: body });
  if (r.ok) return { redirect: (await listingFor(c, l.id))?.url || '/my-listings' };
  const values = Object.fromEntries(Object.entries(body).filter(([k, x]) => x !== undefined && k !== 'action' && !['year', 'miles', 'title_status'].includes(k)));
  values.car = { year: body.year, miles: body.miles, title_status: body.title_status };
  return fail(c.path.replace(/\/edit$/, '') + '/edit', 'editErr', r.data.error, { values });
}
async function sellAction(c, f) {
  if (!c.session.account) return needLogin(c);
  const D = blankDraft();
  for (const k of ['kind', 'part', 'category', 'tier', 'year', 'miles', 'title_status', 'condition', 'sell_type', 'price', 'title', 'fits', 'city', 'handoff', 'description']) if (f.has(k)) D[k] = text(f, k);
  const files = f.getAll('photos').filter(x => x && typeof x === 'object' && x.size > 0).slice(0, MAX_PHOTOS);
  const again = msg => fail('/sell', 'sellErr', msg, { draft: D });
  const bad = missingForSale(D, files.length);
  if (bad.length) return again(`Add ${bad.join(', ')} to publish.`);
  // Without JavaScript photos can't be shrunk first, so each one has to fit the upload limit as it is.
  const big = files.find(x => x.size > LIMITS.photoBytes);
  if (big) return again(`${big.name || 'A photo'} is over ${Math.round(LIMITS.photoBytes / 1024)} KB. With JavaScript on, photos shrink to fit automatically.`);
  const made = await c.api('listings', { json: listingBody(D) });
  if (!made.ok) return again(made.data.error);
  for (const file of files) { const u = await upload(c, `listings/${made.data.id}/photos`, file); if (!u.ok) return again(u.data.error); }
  const pub = await c.api(`listings/${made.data.id}/publish`, { method: 'POST' });
  if (!pub.ok) return again(pub.data.error);
  return { redirect: (await listingFor(c, made.data.id))?.url || '/my-listings' };
}
async function photoAction(c, f) {
  if (!c.session.account) return needLogin(c);
  const file = fileOf(f, 'photo'); if (!file) return { redirect: '/account' };
  if (file.size > LIMITS.photoBytes) return fail('/account', 'toast', `That picture is over ${Math.round(LIMITS.photoBytes / 1024)} KB. With JavaScript on, pictures shrink to fit automatically.`);
  const r = await upload(c, 'me/photo', file);
  return r.ok ? { redirect: '/account' } : fail('/account', 'toast', r.data.error);
}
async function emailAction(c, f) {
  if (!c.session.account) return needLogin(c);
  const r = await c.api('me/email', { method: 'PUT', json: { email: text(f, 'email') } });
  if (!r.ok) return fail('/account', 'securityErr', r.data.error);
  return { redirect: r.data.verified ? '/account' : `/verify?next=${encodeURIComponent('/account')}${r.data.sent ? '&sent=1' : ''}` };
}
async function loginCodesAction(c, f) {
  if (!c.session.account) return needLogin(c);
  const r = await c.api('me/login-codes', { json: { on: text(f, 'on') === '1' } });
  return r.ok ? { redirect: '/account' } : fail('/account', 'securityErr', r.data.error);
}
const ACTIONS = [
  [/^\/login$/, loginAction], [/^\/login\/code$/, loginCodeAction], [/^\/signup$/, signupAction], [/^\/logout$/, logoutAction],
  [/^\/verify$/, verifyAction], [/^\/verify\/resend$/, resendAction], [/^\/saved$/, saveAction],
  [/^\/listing\/([^/]+)\/message$/, messageAction], [/^\/messages\/([^/]+)$/, chatAction],
  [/^\/listing\/([^/]+)\/bid$/, bidAction], [/^\/listing\/([^/]+)\/sold$/, statusAction('sold')], [/^\/listing\/([^/]+)\/delete$/, statusAction('delete')],
  [/^\/listing\/([^/]+)\/admin-delete$/, adminDeleteAction], [/^\/listing\/([^/]+)\/edit$/, editAction], [/^\/sell$/, sellAction],
  [/^\/account\/photo$/, photoAction], [/^\/account\/email$/, emailAction], [/^\/account\/login-codes$/, loginCodesAction],
];

/* ---------- putting a page together ---------- */
async function loadSession(api) {
  const me = await api('me');
  if (me.status === 503) return null; // the site is still being set up: the browser's code runs setup
  const s = { account: me.data.account || null, unread: me.data.unread || 0, adminInbox: me.data.admin_inbox || null, favorites: new Set() };
  if (s.account) s.favorites = new Set((await api('favorites')).data.ids || []);
  return s;
}
const route = (table, path) => { for (const [re, fn] of table) { const m = path.match(re); if (m) return { fn, args: m.slice(1).map(x => { try { return decodeURIComponent(x); } catch { return x; } }) }; } return null; };

// Views read the look (for image addresses) and the page address (for the menu). Each view call runs start to finish
// without waiting, so setting them right before every call keeps pages built at the same time from mixing.
const viewsFor = (V, look, pathOf) => new Proxy(V, { get: (t, k) => typeof t[k] !== 'function' ? t[k] : (...a) => { setPage(look, pathOf(), TIME_ZONE); try { return t[k](...a); } finally { setPage(null, null, undefined); } } });
async function buildPage(c, template) {
  c = { ...c, V: viewsFor(c.raw, c.look, () => c.path) };
  const { V, path, session } = c;
  if (session.account?.must_verify && !/^\/(verify|account|login|signup)$/.test(path)) return { redirect: '/verify?next=' + encodeURIComponent(path + c.url.search) };
  const meta = c.request.method === 'GET' ? await pageMeta(c.ctx, path) : {};
  if (meta.redirect) return { redirect: meta.redirect + c.url.search, status: 301 };
  const hit = route(PAGES, path);
  let page = c.pageOverride || (hit ? await hit.fn(c, ...hit.args) : notFound(c));
  if (page.redirect) return page;
  if (meta.status === 404 && !page.status) page.status = 404;
  // The frame: header, side menu and slide-out menu, with this page inside.
  const nav = { account: session.account, path, unread: session.unread, adminUnread: session.adminInbox?.unread || 0 };
  let shell = V.shell();
  shell = fillEmpty(shell, 'headLinks', V.headerLinks({ ...nav }));
  if (V.sideNav) shell = fillEmpty(shell, 'sideNav', V.sideNav(nav));
  if (V.drawerNav) shell = fillEmpty(shell, 'drawerNav', V.drawerNav(nav));
  shell = fillEmpty(shell, 'main', page.main);
  shell = setValue(shell, 'searchInput', path === '/' ? c.url.searchParams.get('q') : null);
  if (c.message) shell = showMessage(shell, c.message[0], c.message[1]);
  for (const [id, v] of Object.entries(c.fields || {})) shell = setValue(shell, id, v);
  // The document: index.html with this look's stylesheet, the page's title and search engine details, and the page itself.
  let html = template;
  const name = page.name || pageName(path, page.q);
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(tabTitle(name))}</title>`);
  html = html.replace('<script>window.AUTOHOUND_BASE', () => `<link rel="icon" href="${c.look}/img/brand-profile.webp"><link rel="stylesheet" href="${c.look}/site.css" data-look>\n<script>window.AUTOHOUND_BASE`);
  if (meta.title) html = fillMeta(html, meta);
  else if (!PUBLIC.test(path) || page.noindex || page.status === 404) html = html.replace('</head>', '<meta name="robots" content="noindex" data-page>\n</head>');
  else if (path === '/' || path === '/map') html = html.replace('</head>', `<link rel="canonical" href="${SITE_ORIGIN}${path}" data-page>\n</head>`);
  const sessionData = JSON.stringify({ account: session.account, unread: session.unread, admin_inbox: session.adminInbox, favorites: [...session.favorites] }).replace(/</g, '\\u003c');
  html = html.replace('<div id="app"></div>', () => `<div id="app" data-ssr="${esc(path)}">${shell}</div>\n<script type="application/json" id="sessionData">${sessionData}</script>`);
  return { html, status: page.status || 200 };
}

// Answers any page address (GET, HEAD or a form POST). template is site/index.html as text.
export async function pageResponse(ctx, request, template) {
  const url = new URL(request.url), path = url.pathname.replace(/(.)\/$/, '$1');
  // One address per page: a trailing slash is sent on to the address without it.
  if (path !== url.pathname && request.method !== 'POST') return new Response(null, { status: 301, headers: { location: path + url.search } });
  const rule = await readProfileRule(ctx), device = rule.phone.test(request.headers.get('user-agent') || '') ? 'mobile' : 'desktop';
  const base = template.match(/window\.AUTOHOUND_BASE = '([^']*)'/)?.[1] || '';
  const api = apiFor(ctx, request);
  const session = await loadSession(api);
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', vary: 'cookie' };
  if (!session) return request.method === 'POST' ? new Response(null, { status: 303, headers: { location: path } }) : new Response(template, { headers });
  const look = `${base}/profiles/${rule.name}/${device}`;
  const raw = VIEWS[rule.name][device], c = { ctx, request, url, path, api, session, raw, V: viewsFor(raw, look, () => path), look };
  let result;
  if (request.method === 'POST') {
    // Forms only count when they come from this site (the browser says where a form came from).
    const origin = request.headers.get('origin');
    if (origin && (origin === 'null' || new URL(origin).host !== url.host)) return new Response('Not allowed.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const hit = route(ACTIONS, path);
    if (!hit) return new Response(null, { status: 303, headers: { location: path } });
    let form; try { form = await request.formData(); } catch { form = new FormData(); }
    result = await hit.fn(c, form, ...hit.args);
    if (result.page) {
      // Show the form again with its message. The page is built for its own address.
      const target = new URL(result.page, url);
      result = { ...(await buildPage({ ...c, url: target, path: target.pathname, message: result.message, fields: result.fields, values: result.values, draft: result.draft, confirmDelete: result.confirmDelete, adminOpen: result.adminOpen }, template)), status: result.message ? 400 : 200 };
    } else if (result.main) result = await buildPage({ ...c, pageOverride: result }, template);
  } else result = await buildPage(c, template);
  if (result.redirect) {
    const h = { location: result.redirect, 'cache-control': 'no-cache' };
    if (result.cookie) h['set-cookie'] = result.cookie;
    return new Response(null, { status: result.status || (request.method === 'POST' ? 303 : 302), headers: h });
  }
  return new Response(request.method === 'HEAD' ? null : result.html, { status: result.status, headers });
}
