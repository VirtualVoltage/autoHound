import { LIMITS, CITIES, PART_CATEGORIES, CAR_CATEGORIES, CONDITIONS, HANDOFFS, BID_TEMPLATE, AUCTION } from './config.js';
import { ApiError, fail, hit, json, readJson, readImage, readJsonFile, writeJsonFile, appendLine, moveTree } from './http.js';
import { nextId, folderName, isId, cleanWords, dayFolder } from './ids.js';
import { requireAccount, publicAccount } from './auth.js';
import { saveImage } from './files.js';
import { closeListingConversations } from './conversations.js';
import { checkWords } from './wordfilter.js';

const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };

export function searchText(l, username) {
  return [l.title, l.category, l.city, l.description, l.fits, l.condition, username, l.car?.year].filter(Boolean).join(' ').toLowerCase();
}
export function indexRow(l, a, path, dataPath, extra = {}) {
  return [l.id, l.account, l.title, l.kind, l.category, l.city, extra.price ?? l.price, l.description, l.photos[0] || null, l.sell_type, l.auction_ends || null, extra.bids || 0, extra.top_bidder || null, l.status, l.created, path, dataPath, searchText(l, a.username)];
}
export const INSERT_LISTING = 'INSERT OR REPLACE INTO listings(id,account_id,title,kind,category,city,price,description,photo,sell_type,auction_ends,bids,top_bidder,status,created,path,data_path,search) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

function cleanFields(b) {
  const kind = b.kind === 'cars' ? 'cars' : 'parts', title = cleanWords(str(b.title, 70)), description = str(b.description, 1500), price = int(b.price, 1, 10000000);
  if (title.length < 4) fail(400, 'Add a title.');
  if (description.length < 10) fail(400, 'Add a short description.');
  if (!price) fail(400, 'Add a price between $1 and $10,000,000.');
  const cats = kind === 'cars' ? CAR_CATEGORIES : PART_CATEGORIES;
  if (!cats.includes(b.category)) fail(400, 'Pick a category.');
  if (!CITIES.includes(b.city)) fail(400, 'Pick a city.');
  if (!CONDITIONS.includes(b.condition)) fail(400, 'Pick a condition.');
  if (!HANDOFFS.includes(b.handoff)) fail(400, 'Pick a handoff.');
  const l = { kind, title, description, price, category: b.category, city: b.city, condition: b.condition, handoff: b.handoff, fits: kind === 'parts' ? (str(b.fits, 60) || 'Universal') : null, market_value: int(b.market_value, 1, 20000000), sell_type: b.sell_type === 'auction' ? 'auction' : 'post' };
  checkWords('listing', l.title, l.description, l.fits);
  if (kind === 'cars') {
    const year = int(b.year, 1900, 2100), miles = int(b.miles, 0, 5000000);
    if (!year || miles === null) fail(400, 'Add the year and miles.');
    l.car = { year, miles, title_status: ['Clean', 'Rebuilt', 'Salvage'].includes(b.title_status) ? b.title_status : 'Clean' };
  }
  return l;
}
export function cardOf(r, sellerName) {
  return { id: r.id, title: r.title, kind: r.kind, category: r.category, city: r.city, price: r.price, description: r.description, photo: r.photo ? `/api/files/${r.photo}` : null, sell_type: r.sell_type, auction_ends: r.auction_ends, bids: r.bids, status: r.status, created: r.created, seller: { id: r.account_id, username: sellerName ?? r.username } };
}
export async function browse({ db, url }) {
  const q = url.searchParams, words = (q.get('q') || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const where = ["l.status='live'"], params = [];
  for (const w of words) { where.push("l.search LIKE ? ESCAPE '\\'"); params.push('%' + w.replace(/[\\%_]/g, '\\$&') + '%'); }
  const min = int(q.get('min'), 0, 1e9), max = int(q.get('max'), 0, 1e9);
  if (min !== null && q.get('min') !== '' && q.get('min') !== null) { where.push('l.price>=?'); params.push(min); }
  if (max !== null && q.get('max') !== '' && q.get('max') !== null) { where.push('l.price<=?'); params.push(max); }
  if (isId(q.get('seller'), 'A')) { where.push('l.account_id=?'); params.push(q.get('seller')); }
  const order = { low: 'l.price ASC, l.id', high: 'l.price DESC, l.id' }[q.get('sort')] || 'l.created DESC, l.id DESC';
  const limit = Math.min(int(q.get('limit'), 1, 100) || 60, 100), offset = int(q.get('offset'), 0, 100000) || 0;
  const rows = await db.all(`SELECT l.*, a.username FROM listings l JOIN accounts a ON a.id=l.account_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, limit + 1, offset);
  return json({ listings: rows.slice(0, limit).map(r => cardOf(r)), more: rows.length > limit });
}
export async function createDraft({ db, store, request }) {
  const a = await requireAccount(db, request), f = cleanFields(await readJson(request));
  if (!await hit(db, 'post:' + a.id, LIMITS.listingsPerHour, 3600e3)) fail(429, `You can post ${LIMITS.listingsPerHour} listings an hour. Try again later.`);
  const live = await db.get("SELECT COUNT(*) n FROM listings WHERE status='live'");
  if (live.n >= LIMITS.totalLiveListings) fail(409, 'The demo is full right now.');
  const id = await nextId(db, 'L'), folder = folderName(id, f.title, 'listing'), path = `${a.path}/listings/${folder}`, dataPath = `${a.data_path}/listings/${folder}`;
  const created = new Date().toISOString();
  const l = { id, account: a.id, ...f, photos: [], status: 'draft', created, auction_ends: f.sell_type === 'auction' ? Date.now() + LIMITS.auctionMs : null };
  if (f.sell_type === 'auction') l.bid_template = BID_TEMPLATE;
  await writeJsonFile(store, `${path}/listing.json`, l);
  await db.run(INSERT_LISTING, ...indexRow(l, a, path, dataPath));
  return json({ id });
}
async function ownListing(db, request, id) {
  const a = await requireAccount(db, request), r = await db.get('SELECT * FROM listings WHERE id=?', id);
  if (!r || r.account_id !== a.id) fail(403, 'That isn\'t your listing.');
  return { a, r };
}
export async function addPhoto(ctx, id) {
  const { db, store, request } = ctx, { a, r } = await ownListing(db, request, id);
  if (r.status !== 'draft') fail(409, 'This listing can no longer take photos.');
  const l = await readJsonFile(store, `${r.path}/listing.json`);
  if (l.photos.length >= LIMITS.photosPerListing) fail(409, 'That\'s the most photos a listing can have.');
  const pid = await saveImage(ctx, r.data_path, await readImage(request, LIMITS.photoBytes), 'photo', { account: a.id, listing: id });
  l.photos.push(pid);
  await writeJsonFile(store, `${r.path}/listing.json`, l);
  return json({ id: pid });
}
export async function addThumb(ctx, pid) {
  const { db, store, request } = ctx, a = await requireAccount(db, request), f = await db.get('SELECT * FROM files WHERE id=?', pid);
  if (!f || f.owner_account !== a.id) fail(403, 'That isn\'t your photo.');
  const image = await readImage(request, LIMITS.thumbBytes);
  await store.writeBytes(`${f.path}/thumb.${image.ext}`, image.bytes);
  return json({ ok: true });
}
export async function publish({ db, store, request }, id) {
  const { a, r } = await ownListing(db, request, id), l = await readJsonFile(store, `${r.path}/listing.json`);
  if (!l.photos.length) fail(400, 'Add at least one photo.');
  l.status = 'live';
  await writeJsonFile(store, `${r.path}/listing.json`, l);
  await db.run(INSERT_LISTING, ...indexRow(l, a, r.path, r.data_path));
  return json({ id });
}
export async function getListing({ db, store, request }, id, account) {
  const r = await db.get('SELECT l.*, a.username, a.photo seller_photo FROM listings l JOIN accounts a ON a.id=l.account_id WHERE l.id=?', id);
  const mine = account?.id === r?.account_id;
  if (!r || ((r.status === 'hidden' || r.status === 'deleted' || r.status === 'draft') && !mine)) fail(404, 'That listing isn\'t here anymore.');
  const l = await readJsonFile(store, `${r.path}/listing.json`);
  const ended = r.sell_type === 'auction' && r.auction_ends <= Date.now();
  const out = { ...cardOf(r), photos: l.photos.map(p => `/api/files/${p}`), condition: l.condition, fits: l.fits, handoff: l.handoff, car: l.car || null, market_value: r.sell_type === 'post' ? l.market_value : null, mine, ended };
  out.seller.photo = r.seller_photo ? `/api/files/${r.seller_photo}` : null;
  if (ended) {
    out.won = !!account && account.id === r.top_bidder;
    if (mine) { const fee = l.market_value && r.price >= l.market_value * AUCTION.thresholdShare ? r.price * AUCTION.feeRate : 0; out.seller_fee = fee; }
  }
  // Chats happen in a box on the listing page. Buyers get their chat; sellers get one per buyer.
  if (account) {
    const since = Date.now() - LIMITS.conversationIdleMs;
    if (mine) {
      const rows = await db.all(`SELECT c.id, c.buyer_id, c.last_text, c.last_from, c.last_id, c.seller_read, b.username FROM conversations c JOIN accounts b ON b.id=c.buyer_id
        WHERE c.listing_id=? AND c.status IN ('live','closed') AND c.last_activity>=? ORDER BY c.last_activity DESC LIMIT 50`, id, since);
      out.chats = rows.map(c => ({ id: c.id, with: { id: c.buyer_id, username: c.username }, last_text: c.last_text, unread: !!c.last_id && c.last_from !== account.id && c.last_id !== c.seller_read }));
    } else {
      const c = await db.get("SELECT id FROM conversations WHERE listing_id=? AND buyer_id=? AND status IN ('live','closed') AND last_activity>=?", id, account.id, since);
      out.chat = c ? c.id : null;
    }
  }
  return json({ listing: out });
}
export async function changeStatus(ctx, id) {
  const { db, store, request } = ctx, { a, r } = await ownListing(db, request, id), b = await readJson(request);
  if (b.action === 'edit') return editListing(ctx, a, r, b);
  const status = { sold: 'sold', delete: 'deleted' }[b.action];
  if (!status) fail(400, 'Unknown action.');
  const l = await readJsonFile(store, `${r.path}/listing.json`);
  l.status = status;
  await writeJsonFile(store, `${r.path}/listing.json`, l);
  await db.run('UPDATE listings SET status=? WHERE id=?', status, id);
  await closeListingConversations(ctx, l);
  await archiveListing(ctx, { ...r, status });
  return json({ ok: true, status });
}
// Owners can change the words, price and details of a live listing. Photos, type and category stay.
// A new title renames the folder (ID__Title), and its chats and photos move with it.
const EDITABLE = ['title', 'description', 'price', 'condition', 'fits', 'city', 'handoff', 'year', 'miles', 'title_status'];
async function editListing(ctx, a, r, b) {
  const { db, store } = ctx;
  if (r.status !== 'live') fail(400, 'Only live listings can be edited.');
  const l = await readJsonFile(store, `${r.path}/listing.json`);
  if (!l) fail(404, 'That listing isn\'t here anymore.');
  const merged = { ...l, year: l.car?.year, miles: l.car?.miles, title_status: l.car?.title_status };
  for (const k of EDITABLE) if (b[k] !== undefined) merged[k] = b[k];
  const f = cleanFields(merged), lockedPrice = l.sell_type === 'auction' && r.bids > 0;
  if (lockedPrice && f.price !== l.price) fail(400, 'The price can\'t change after bids come in.');
  const next = { ...l, title: f.title, description: f.description, price: f.price, condition: f.condition, fits: f.fits, city: f.city, handoff: f.handoff, edited: new Date().toISOString() };
  if (l.kind === 'cars') next.car = f.car;
  let path = r.path, dataPath = r.data_path;
  const folder = folderName(r.id, next.title, 'listing');
  if (folder !== r.path.split('/').pop()) ({ path, dataPath } = await renameListingFolder(ctx, r, folder));
  await writeJsonFile(store, `${path}/listing.json`, next);
  await db.run(INSERT_LISTING, ...indexRow(next, a, path, dataPath, { price: lockedPrice ? r.price : next.price, bids: r.bids, top_bidder: r.top_bidder }));
  return json({ ok: true });
}
async function renameListingFolder(ctx, r, folder) {
  const { db, store } = ctx, path = `${r.path.slice(0, r.path.lastIndexOf('/'))}/${folder}`, dataPath = `${r.data_path.slice(0, r.data_path.lastIndexOf('/'))}/${folder}`;
  await moveTree(store, r.path, path);
  await moveTree(store, r.data_path, dataPath);
  const swap = (p, from, to) => p && (p === from || p.startsWith(from + '/')) ? to + p.slice(from.length) : p;
  for (const f of await db.all('SELECT id,path FROM files WHERE path >= ? AND path < ?', r.data_path + '/', r.data_path + '0'))
    await db.run('UPDATE files SET path=? WHERE id=?', swap(f.path, r.data_path, dataPath), f.id);
  for (const c of await db.all('SELECT id,path,data_path FROM conversations WHERE listing_id=?', r.id))
    await db.run('UPDATE conversations SET path=?, data_path=? WHERE id=?', swap(c.path, r.path, path), swap(c.data_path, r.data_path, dataPath), c.id);
  return { path, dataPath };
}
// Sold or removed listings move out of the account into backups/listings, sorted by the listing's date.
// Its chats move first (closeListingConversations), so only the listing and its photos travel here.
export const listingBackupRoot = r => `backups/listings/${dayFolder(r.id, 'listings')}/${r.path.split('/').pop()}`;
export async function archiveListing(ctx, r) {
  if (r.path.startsWith('records/backups/')) return;
  const root = listingBackupRoot(r), to = `records/${root}`, dataTo = `data/${root}`;
  // Each step can safely run again. The listing row changes last, so a cut-off request is finished on a later visit.
  await moveTree(ctx.store, r.path, to);
  if (r.data_path) await moveTree(ctx.store, r.data_path, dataTo);
  // Every file that was under the folder, including anything a chat left behind.
  if (r.data_path) for (const f of await ctx.db.all('SELECT id,path FROM files WHERE path >= ? AND path < ?', r.data_path + '/', r.data_path + '0'))
    await ctx.db.run('UPDATE files SET path=? WHERE id=?', dataTo + f.path.slice(r.data_path.length), f.id);
  await ctx.db.run('UPDATE listings SET path=?, data_path=? WHERE id=?', to, dataTo, r.id);
}
// Moves listings that were sold or removed before backups existed, a few per visit.
export async function sweepClosedListings(ctx, limit = 1) {
  const rows = await ctx.db.all("SELECT * FROM listings WHERE status IN ('sold','deleted') AND path NOT LIKE 'records/backups/%' LIMIT ?", limit);
  for (const r of rows) {
    const l = await readJsonFile(ctx.store, `${r.path}/listing.json`);
    if (l) await closeListingConversations(ctx, l);
    await archiveListing(ctx, r);
  }
}
export async function placeBid({ db, store, request }, id) {
  const a = await requireAccount(db, request), amount = int((await readJson(request)).amount, 1, 10000000);
  if (!amount) fail(400, 'Enter a real amount.');
  const r = await db.get('SELECT * FROM listings WHERE id=?', id);
  if (!r || r.sell_type !== 'auction') fail(404, 'That auction isn\'t here anymore.');
  if (r.account_id === a.id) fail(400, 'You can\'t bid on your own listing.');
  const done = await db.run("UPDATE listings SET price=?, bids=bids+1, top_bidder=? WHERE id=? AND status='live' AND auction_ends>? AND price<?", amount, a.id, id, Date.now(), amount);
  if (!done.changes) fail(409, 'Someone bid higher, or this auction has ended. Refresh to see the latest.');
  await appendLine(store, `${r.path}/bids.jsonl`, [a.id, amount, new Date().toISOString()]);
  return json({ price: amount });
}
export async function report({ db, store, request }, id) {
  const a = await requireAccount(db, request), r = await db.get("SELECT * FROM listings WHERE id=? AND status='live'", id);
  if (!r) fail(404, 'That listing isn\'t here anymore.');
  if (r.account_id === a.id) fail(400, 'That\'s your own listing.');
  const added = await db.run('INSERT OR IGNORE INTO reports(listing_id,account_id) VALUES(?,?)', id, a.id);
  if (added.changes) await appendLine(store, `${r.path}/reports.jsonl`, [a.id, new Date().toISOString()]);
  const n = await db.get('SELECT COUNT(*) n FROM reports WHERE listing_id=?', id);
  if (n.n >= LIMITS.reportsToHide) {
    const l = await readJsonFile(store, `${r.path}/listing.json`); l.status = 'hidden';
    await writeJsonFile(store, `${r.path}/listing.json`, l);
    await db.run("UPDATE listings SET status='hidden' WHERE id=?", id);
  }
  return json({ ok: true });
}
export async function sellerPage({ db }, id) {
  const a = await db.get('SELECT * FROM accounts WHERE id=?', id);
  if (!a) fail(404, 'That account isn\'t here.');
  const rows = await db.all("SELECT * FROM listings WHERE account_id=? AND status='live' ORDER BY created DESC LIMIT 100", id);
  return json({ account: publicAccount(a), listings: rows.map(r => cardOf(r, a.username)) });
}
export async function favorites({ db, store, request }) {
  const a = await requireAccount(db, request), path = `${a.path}/favorites.json`, ids = (await readJsonFile(store, path)) || [];
  if (request.method === 'POST') {
    const b = await readJson(request);
    if (!isId(b.id, 'L')) fail(400, 'Unknown listing.');
    const i = ids.indexOf(b.id); if (i >= 0) ids.splice(i, 1); else ids.push(b.id);
    if (ids.length > 500) ids.shift();
    await writeJsonFile(store, path, ids);
  }
  const rows = ids.length ? await db.all(`SELECT l.*, u.username FROM listings l JOIN accounts u ON u.id=l.account_id WHERE l.status='live' AND l.id IN (${ids.map(() => '?').join(',')})`, ...ids) : [];
  return json({ ids, listings: rows.map(r => cardOf(r)) });
}
export async function setProfilePhoto(ctx) {
  const { db, store, request } = ctx, a = await requireAccount(db, request), image = await readImage(request, LIMITS.photoBytes);
  const acct = await readJsonFile(store, `${a.path}/account.json`);
  if (acct.profile_photo) {
    const old = await db.get('SELECT path FROM files WHERE id=?', acct.profile_photo);
    if (old) for (const k of await store.listAll(old.path + '/')) await store.remove(k);
    await db.run('DELETE FROM files WHERE id=?', acct.profile_photo);
  }
  const id = await saveImage(ctx, a.data_path, image, 'profile', { account: a.id });
  acct.profile_photo = id;
  await writeJsonFile(store, `${a.path}/account.json`, acct);
  await db.run('UPDATE accounts SET photo=? WHERE id=?', id, a.id);
  return json({ photo: `/api/files/${id}` });
}
