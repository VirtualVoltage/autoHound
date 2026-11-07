import { view } from './theme.js';

// The map library (MapLibre, saved in site/vendor) loads the first time a page needs a map.
const LIB = () => `${window.AUTOHOUND_BASE || ''}/vendor/maplibre-gl-4.7.1`;
let loading = null;
export function loadMapLib() {
  return loading ||= new Promise((ok, bad) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = `${LIB()}/maplibre-gl.css`;
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = `${LIB()}/maplibre-gl.js`;
    s.onload = () => ok(window.maplibregl);
    s.onerror = () => { loading = null; bad(new Error('The map couldn\'t load. Try again in a minute.')); };
    document.head.appendChild(s);
  });
}

// A map in the active profile's colors. center is [latitude, longitude].
export async function makeMap(el, { center, zoom = 10, area }) {
  const ml = await loadMapLib();
  const map = new ml.Map({
    container: el, style: view.mapStyle(), center: [center[1], center[0]], zoom, dragRotate: false, pitchWithRotate: false,
    attributionControl: { compact: true },
    maxBounds: area ? [[area.west - 0.8, area.south - 0.5], [area.east + 0.8, area.north + 0.5]] : undefined,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
  return { ml, map };
}

// Turns a pin from the profile's view into an element the map can place.
export function pinElement(opts) {
  const box = document.createElement('div');
  box.innerHTML = view.mapPin(opts);
  return box.firstElementChild;
}
