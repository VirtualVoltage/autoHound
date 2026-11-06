import { ApiError, json, fail, sha256Hex } from './http.js';
import { signup, login, logout, currentAccount, requireAccount, publicAccount } from './auth.js';
import { browse, createDraft, addPhoto, addThumb, publish, getListing, changeStatus, placeBid, report, sellerPage, favorites, setProfilePhoto, sweepClosedListings } from './listings.js';
import { sweepIdle, startConversation, inbox, openConversation, sendMessage, addAttachment, unreadCount } from './conversations.js';
import { serveFile } from './files.js';
import { isReady, setupStep } from './setup.js';
import { rebuildStep } from './rebuild.js';
import { CITIES, PART_CATEGORIES, CAR_CATEGORIES, CONDITIONS, HANDOFFS, LIMITS } from './config.js';
import { isId } from './ids.js';

let readyUntil = 0;
const routes = [
  ['POST', /^setup$/, ctx => setupStep(ctx)],
  ['GET', /^options$/, () => json({ cities: CITIES, part_categories: PART_CATEGORIES, car_categories: CAR_CATEGORIES, conditions: CONDITIONS, handoffs: HANDOFFS, limits: { usernameMin: LIMITS.usernameMin, usernameMax: LIMITS.usernameMax, passwordMin: LIMITS.passwordMin, passwordMax: LIMITS.passwordMax, photos: LIMITS.photosPerListing } })],
  ['POST', /^signup$/, signup], ['POST', /^login$/, login], ['POST', /^logout$/, logout],
  ['GET', /^me$/, async ctx => { await sweepIdle(ctx, 1); await sweepClosedListings(ctx, 1); const a = await currentAccount(ctx.db, ctx.request); return json({ account: publicAccount(a), unread: a ? await unreadCount(ctx, a) : 0 }); }],
  ['POST', /^me\/photo$/, setProfilePhoto],
  ['GET', /^favorites$/, favorites], ['POST', /^favorites$/, favorites],
  ['GET', /^listings$/, browse], ['POST', /^listings$/, createDraft],
  ['GET', /^listings\/([^/]+)$/, async (ctx, id) => getListing(ctx, id, await currentAccount(ctx.db, ctx.request))],
  ['PATCH', /^listings\/([^/]+)$/, changeStatus],
  ['POST', /^listings\/([^/]+)\/photos$/, addPhoto], ['POST', /^listings\/([^/]+)\/publish$/, publish],
  ['POST', /^listings\/([^/]+)\/bid$/, placeBid], ['POST', /^listings\/([^/]+)\/report$/, report],
  ['POST', /^listings\/([^/]+)\/conversations$/, startConversation],
  ['POST', /^photos\/([^/]+)\/thumb$/, addThumb],
  ['GET', /^conversations$/, inbox], ['GET', /^conversations\/([^/]+)$/, openConversation],
  ['POST', /^conversations\/([^/]+)\/messages$/, sendMessage], ['POST', /^conversations\/([^/]+)\/photos$/, addAttachment],
  ['GET', /^accounts\/([^/]+)$/, sellerPage],
  ['GET', /^files\/([^/]+)$/, async (ctx, id) => serveFile(ctx, id, ctx.url.searchParams.get('size'), await currentAccount(ctx.db, ctx.request))],
  ['POST', /^admin\/rebuild$/, async ctx => {
    const key = ctx.env?.ADMIN_KEY;
    if (!key || ctx.request.headers.get('x-admin-key') !== key) fail(403, 'Not allowed.');
    const b = await ctx.request.json().catch(() => ({}));
    return json(await rebuildStep(ctx, b.cursor ?? null, []));
  }],
];
export async function handle(request, base) {
  const url = new URL(request.url), route = url.pathname.replace(/^\/api\//, '').replace(/\/$/, ''), ctx = { ...base, request, url };
  try {
    // Blocks other sites from sending requests with someone's login.
    if (request.method !== 'GET') {
      const origin = request.headers.get('origin');
      if (origin && new URL(origin).host !== url.host) fail(403, 'Not allowed.');
    }
    const match = routes.map(([m, re, fn]) => ({ m, fn, hit: route.match(re) })).filter(r => r.hit);
    if (!match.length) fail(404, 'Not found.');
    const r = match.find(x => x.m === request.method);
    if (!r) fail(405, 'Not allowed.');
    if (route !== 'setup') {
      if (Date.now() > readyUntil) {
        if (!await isReady(base.db)) return json({ setup: true, error: 'Setting up the demo.' }, 503);
        readyUntil = Date.now() + 30000;
      }
    }
    const args = r.hit.slice(1).map(decodeURIComponent);
    for (const a of args) if (!isId(a)) fail(404, 'Not found.');
    return await r.fn(ctx, ...args);
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'The server had a problem. Try again in a minute.' }, 500);
  }
}
