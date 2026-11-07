// The map's look: OpenFreeMap's free OpenStreetMap tiles, recolored to Autohound's black and neon green.
// Layer names follow the OpenMapTiles schema that OpenFreeMap serves.
const C = {
  ground: '#030603', land: '#060c06', park: '#071a09', wood: '#061407', water: '#04141a', waterLine: '#0b3a44', building: '#0b130b', buildingEdge: '#1b2c1b',
  minor: '#1a2a1a', street: '#245c27', main: '#2aff32', glow: 'rgba(42,255,50,.35)', border: '#3d4f3d', label: '#e8ffe8', subLabel: '#8fb58f', roadLabel: '#a8e8a8', halo: '#000',
};
const FONT = ['Noto Sans Regular'], BOLD = ['Noto Sans Bold'];
const width = (base, stops) => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flatMap(([z, w]) => [z, w * base])];
const roads = classes => ['match', ['get', 'class'], classes, true, false];

export function mapStyle() {
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector', url: 'https://tiles.openfreemap.org/planet',
        attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': C.ground } },
      { id: 'landcover', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', paint: { 'fill-color': ['match', ['get', 'class'], 'wood', C.wood, C.land], 'fill-opacity': 0.8 } },
      { id: 'landuse', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['match', ['get', 'class'], ['residential', 'commercial', 'industrial'], true, false], paint: { 'fill-color': C.land } },
      { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': C.park, 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': C.water } },
      { id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', paint: { 'line-color': C.waterLine, 'line-width': width(1, [[8, 0.5], [14, 2]]) } },
      { id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': C.building, 'fill-outline-color': C.buildingEdge } },
      { id: 'boundary', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary', filter: ['<=', ['get', 'admin_level'], 6], paint: { 'line-color': C.border, 'line-width': 1, 'line-dasharray': [3, 2] } },
      { id: 'road-minor', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 11, filter: roads(['minor', 'service', 'track']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.minor, 'line-width': width(1, [[11, 0.5], [16, 6]]) } },
      { id: 'road-street', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: roads(['primary', 'secondary', 'tertiary']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.street, 'line-width': width(1, [[7, 0.5], [16, 10]]) } },
      { id: 'road-main-glow', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: roads(['motorway', 'trunk']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.glow, 'line-width': width(1, [[5, 3], [16, 22]]), 'line-blur': 4 } },
      { id: 'road-main', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: roads(['motorway', 'trunk']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.main, 'line-width': width(1, [[5, 0.8], [16, 7]]) } },
      { id: 'road-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name', minzoom: 13, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11 }, paint: { 'text-color': C.roadLabel, 'text-halo-color': C.halo, 'text-halo-width': 1.5 } },
      { id: 'water-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'water_name', layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12 }, paint: { 'text-color': '#4fa7b5', 'text-halo-color': C.halo, 'text-halo-width': 1.5 } },
      { id: 'place-small', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', minzoom: 10, filter: ['match', ['get', 'class'], ['village', 'hamlet', 'suburb', 'neighbourhood'], true, false], layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12 }, paint: { 'text-color': C.subLabel, 'text-halo-color': C.halo, 'text-halo-width': 1.5 } },
      { id: 'place-town', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', filter: ['match', ['get', 'class'], ['city', 'town'], true, false], layout: { 'text-field': ['get', 'name'], 'text-font': BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 12, 16], 'text-transform': 'uppercase', 'text-letter-spacing': 0.08 }, paint: { 'text-color': C.label, 'text-halo-color': C.halo, 'text-halo-width': 2 } },
    ],
  };
}
