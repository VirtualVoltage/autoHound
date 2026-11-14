// /sitemap.xml for search engines, built live from the search index so it never needs a rebuild step.
// Public pages only: home, map, live listings and the seller pages of accounts with live listings.
// Nothing private goes in it (no emails, chats, drafts, sold, removed or backed-up listings).

export const SITE_ORIGIN = 'https://autohound.online';
const MAX_URLS = 50000; // the sitemap format's limit for one file
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const day = t => { const d = new Date(t); return isNaN(d) ? null : d.toISOString().slice(0, 10); };

export async function sitemapXml({ db }) {
  let listings = [];
  try {
    listings = await db.all("SELECT l.id, l.account_id, l.created FROM listings l JOIN accounts a ON a.id=l.account_id WHERE l.status='live' AND l.path NOT LIKE 'records/backups/%' ORDER BY l.created DESC LIMIT ?", MAX_URLS - 2);
  } catch (e) { console.error('sitemap', e); } // index not set up yet: still list the fixed pages
  const sellers = new Map();
  for (const l of listings) { const d = day(l.created); if (!sellers.has(l.account_id) || d > sellers.get(l.account_id)) sellers.set(l.account_id, d); }
  const urls = [
    { loc: '/', lastmod: listings.length ? day(listings[0].created) : null },
    { loc: '/map', lastmod: null },
    ...listings.map(l => ({ loc: `/listing/${encodeURIComponent(l.id)}`, lastmod: day(l.created) })),
    ...[...sellers].map(([id, d]) => ({ loc: `/seller/${encodeURIComponent(id)}`, lastmod: d })),
  ].slice(0, MAX_URLS);
  const body = urls.map(u => `  <url><loc>${esc(SITE_ORIGIN + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
export async function sitemapResponse(ctx) {
  return new Response(await sitemapXml(ctx), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
