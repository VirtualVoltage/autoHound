export const profileAsset = name => `/profiles/${window.AUTOHOUND_PROFILE}/img/${name}`;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => '$' + Math.round(n).toLocaleString('en-US');
export const $ = id => document.getElementById(id);
export const MILES = { Lynden: 2, Everson: 6, Sumas: 11, Ferndale: 11, Blaine: 14, Bellingham: 15, Burlington: 38, 'Mount Vernon': 43, Anacortes: 50, Arlington: 60, Marysville: 72, Everett: 78 };
export const townLine = city => `${esc(city)}${MILES[city] !== undefined ? `, ${MILES[city]} mi` : ''}`;
export function timeLeft(ms) {
  if (ms <= 0) return 'ended';
  const m = Math.floor(ms / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h left` : h > 0 ? `${h}h ${m % 60}m left` : `${m}m ${Math.floor(ms / 1e3) % 60}s left`;
}
export const shortDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const clock = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
let toastTimer;
export function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
}
export const countChars = s => [...s].length;
// Shrinks a photo in the browser. Saves storage and uploads faster.
export function shrink(file, maxSide, quality, maxBytes) {
  return new Promise((res, rej) => {
    if (!file.type.startsWith('image/')) return rej(new Error(`${file.name} isn't an image.`));
    if (file.size > 30e6) return rej(new Error(`${file.name} is over 30 MB.`));
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      let q = quality, side = maxSide;
      const encode = () => {
        const k = Math.min(1, side / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(b => {
          if (b && b.size > maxBytes && q > 0.45) { q -= 0.12; side = Math.round(side * 0.85); return encode(); }
          URL.revokeObjectURL(u); b ? res(b) : rej(new Error(`Couldn't read ${file.name}.`));
        }, 'image/jpeg', q);
      };
      encode();
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error(`Couldn't read ${file.name}. Try a JPG or PNG.`)); };
    im.src = u;
  });
}
