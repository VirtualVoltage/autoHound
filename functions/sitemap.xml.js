// /sitemap.xml on Cloudflare Pages. Built live from the D1 search index (server/sitemap.js).
import { sitemapResponse } from '../server/sitemap.js';
import { cloudflareContext } from '../server/adapters/cloudflare.js';

export const onRequestGet = context => sitemapResponse(cloudflareContext(context));
