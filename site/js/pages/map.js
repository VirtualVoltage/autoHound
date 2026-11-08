import { $ } from '../util.js';
import { view } from '../theme.js';
import { api } from '../api.js';
import { makeMap, pinElement } from '../maplib.js';

// The map page: sellers' pins, a pin per town for listings without one, and businesses.
export async function mapPage() {
  $('main').innerHTML = view.mapPage();
  const box = $('mapBox');
  let data, made;
  const fail = e => { if ($('mapErr')) { $('mapErr').textContent = e.message; $('mapErr').hidden = false; } };
  try { data = await api('map'); } catch (e) { if (e.restart) throw e; fail(e); return; }
  if (!box.isConnected) return;
  // The map fills the window below the heading: from the menu (or the left edge) to the right edge,
  // and down to the bottom of the screen or the phone's bottom bar.
  const fit = () => {
    if (!box.isConnected) return;
    box.style.marginLeft = box.style.width = '';
    const side = $('sideNav'), s = side && getComputedStyle(side), r = box.getBoundingClientRect();
    const sr = side?.getBoundingClientRect(), left = s && s.position !== 'fixed' && sr.width && sr.right <= r.left + 1 ? sr.right : 0;
    const bar = s && s.position === 'fixed' && side.offsetHeight ? side.offsetHeight : 0;
    box.style.marginLeft = `${left - r.left}px`;
    box.style.width = `${document.documentElement.clientWidth - left}px`;
    // The space kept under the page for the phone's bottom bar matches the bar exactly here, so nothing scrolls.
    document.body.style.paddingBottom = bar ? `${bar}px` : '';
    box.style.height = `${Math.max(180, innerHeight - (r.top + scrollY) - bar)}px`;
    made?.map.resize();
  };
  fit();
  addEventListener('resize', fit);
  try { made = await makeMap(box, { center: [48.86, -122.48], zoom: 9.5, area: data.area }); } catch (e) { removeEventListener('resize', fit); fail(e); return; }
  if (!box.isConnected) { removeEventListener('resize', fit); document.body.style.paddingBottom = ''; made.map.remove(); return; }
  const { ml, map } = made, points = [];
  const add = (lat, lng, pin, popup) => {
    points.push([lng, lat]);
    new ml.Marker({ element: pinElement(pin) }).setLngLat([lng, lat]).setPopup(new ml.Popup({ offset: 18, maxWidth: '300px' }).setHTML(view.mapPopup(popup))).addTo(map);
  };
  // Listings with the seller's own pin.
  for (const l of data.listings.filter(l => l.exact))
    add(l.lat, l.lng, { type: 'listing', label: l.title }, { heading: l.title, sub: l.city, listings: [l] });
  // Everything else, grouped by town.
  const towns = {};
  for (const l of data.listings.filter(l => !l.exact)) (towns[l.city] ||= []).push(l);
  for (const [city, list] of Object.entries(towns))
    add(list[0].lat, list[0].lng, { type: 'town', count: list.length, label: `${list.length} listings in ${city}` }, { heading: city, sub: `${list.length} ${list.length === 1 ? 'listing' : 'listings'}`, listings: list });
  for (const b of data.businesses)
    add(b.lat, b.lng, { type: 'business', label: `${b.name}, ${b.city}` }, { heading: b.name, sub: b.city });
  if (points.length) {
    const bounds = points.reduce((bb, p) => bb.extend(p), new ml.LngLatBounds(points[0], points[0]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
  }
  return () => { removeEventListener('resize', fit); document.body.style.paddingBottom = ''; map.remove(); };
}
