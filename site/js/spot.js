import { $ } from './util.js';
import { makeMap, pinElement } from './maplib.js';

// The optional pickup pin on the sell and edit forms. Tap the map to drop it, drag to move it.
// onChange gets {lat, lng} or null. If the map can't load, the form still works without a pin.
export async function mountSpotPicker({ spot, town, options, onChange }) {
  const box = $('spotBox'); if (!box) return null;
  const townAt = name => options.town_spots?.[name] || [48.86, -122.48];
  let made;
  try { made = await makeMap(box, { center: spot ? [spot.lat, spot.lng] : townAt(town), zoom: spot ? 14 : 12, area: options.map_area }); }
  catch (e) { if ($('spotErr')) { $('spotErr').textContent = `${e.message} Your listing will show at its town.`; $('spotErr').hidden = false; } return null; }
  if (!box.isConnected) { made.map.remove(); return null; }
  const { ml, map } = made;
  let marker = null, cur = spot || null;
  const changed = () => { $('spotClear').hidden = !cur; onChange(cur); };
  const place = (lat, lng) => {
    cur = { lat, lng };
    if (!marker) {
      marker = new ml.Marker({ element: pinElement({ type: 'mine', label: 'Pickup spot' }), draggable: true }).setLngLat([lng, lat]).addTo(map);
      marker.on('dragend', () => { const p = marker.getLngLat(); cur = { lat: p.lat, lng: p.lng }; changed(); });
    } else marker.setLngLat([lng, lat]);
    changed();
  };
  if (spot) place(spot.lat, spot.lng);
  map.on('click', e => place(e.lngLat.lat, e.lngLat.lng));
  $('spotClear').addEventListener('click', () => { marker?.remove(); marker = null; cur = null; changed(); });
  return {
    get: () => cur,
    // When the town changes and there's no pin yet, show that town.
    town: name => { if (!cur) { const t = townAt(name); map.jumpTo({ center: [t[1], t[0]], zoom: 12 }); } },
    stop: () => map.remove(),
  };
}
