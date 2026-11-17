// Plain rules and lists used both by the browser (site/js) and by the server when it builds a page (server/pages.js).
// Nothing here touches the page, so it runs in either place.

// Each page's tab title. Listing, seller, chat and email pages name themselves from their content.
const NAMES = [[/^\/map$/, 'Map'], [/^\/sell$/, 'Sell'], [/^\/messages/, 'Messages'], [/^\/account$/, 'Account settings'], [/^\/my-listings$/, 'My listings'],
  [/^\/saved$/, 'Saved'], [/^\/login$/, 'Log in'], [/^\/signup$/, 'Sign up'], [/^\/verify$/, 'Confirm email'], [/^\/admin/, 'Site inbox'], [/\/edit$/, 'Edit']];
export const pageName = (path, q) => q || NAMES.find(([re]) => re.test(path))?.[1] || '';
export const tabTitle = name => name ? `${name} - Autohound` : 'Autohound';

// Where to go after logging in or confirming an email. Only addresses on this site.
export const safeNext = next => typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';

// The lowest bid that leads an auction.
export const minBid = price => price + Math.max(5, Math.round(price * .025 / 5) * 5);

// Home page sort buttons.
export const SORTS = [['popular', 'Popular'], ['new', 'Newest'], ['low', 'Price low'], ['high', 'Price high']];

// Sell form: rough estimates for the price guide, and a blank listing.
export const MAX_PHOTOS = 8;
export const ESTIMATES = [['Coilovers', 900, 'Suspension'], ['Clutch kit', 420, 'Drivetrain'], ['Wheels, set of 4', 1100, 'Wheels & Tires'], ['Turbocharger', 1250, 'Engine'], ['Standalone ECU', 700, 'Electrical'], ['Headlight pair', 260, 'Lighting'], ['Tires, set of 4', 520, 'Wheels & Tires'], ['Big brake kit', 980, 'Brakes'], ['Intake', 180, 'Engine'], ['Bucket seats, pair', 650, 'Interior'], ['Interior panels', 220, 'Interior']];
export const COND_FACTOR = { New: 1.2, 'Like new': 1.05, Excellent: 1, Good: .9, Fair: .7, 'Parts only': .4 };
export const blankDraft = () => ({ kind: 'parts', part: 'other', category: 'Engine', tier: 'Daily', year: '', miles: '', title_status: 'Clean', condition: 'Good', sell_type: 'post', price: '', title: '', fits: '', city: 'Lynden', handoff: 'Meet up or pick up', description: '', photos: [], spot: null });
export const estimateOf = D => { if (D.kind !== 'parts' || D.part === 'other') return null; const e = ESTIMATES[+D.part]; return e ? Math.round(e[1] * COND_FACTOR[D.condition] / 5) * 5 : null; };
export const categoryOf = D => D.kind === 'cars' ? D.tier : (D.part !== 'other' && ESTIMATES[+D.part]) ? ESTIMATES[+D.part][2] : D.category;
// What's missing before a listing can be published. Empty when it's ready.
export function missingForSale(D, photoCount) {
  const bad = [];
  if (!photoCount) bad.push('at least one photo');
  if (String(D.title).trim().length < 4) bad.push('a title');
  if (!(+D.price > 0)) bad.push('a price');
  if (D.kind === 'cars' && !(+D.year >= 1900)) bad.push('the year');
  if (D.kind === 'cars' && D.miles === '') bad.push('the miles');
  if (String(D.description).trim().length < 10) bad.push('a short description');
  return bad;
}
// The sell form's preview window.
export const previewCard = D => ({ preview: true, id: 'x', title: String(D.title).trim() || 'Your listing title', description: String(D.description).trim() || 'Your description shows up here.', price: Math.max(0, +D.price || 0), kind: D.kind, category: categoryOf(D), city: D.city, photo: D.photos?.[0]?.url || null, sell_type: D.sell_type, auction_ends: 0 });
// The body sent to create a listing.
export const listingBody = D => ({ kind: D.kind, title: D.title, description: D.description, price: +D.price, category: categoryOf(D), city: D.city, condition: D.condition, handoff: D.handoff, fits: D.fits, sell_type: D.sell_type, market_value: estimateOf(D), year: +D.year, miles: +D.miles, title_status: D.title_status, spot: D.spot });
