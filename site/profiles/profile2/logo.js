// 3 or 4 times in every 30 seconds, at random moments, the logo changes for about a 20th of a second.
// Each time has an even chance of being a full flicker or a 25% dim.
const WINDOW_MS = 30000, BLINK_MS = 50, MIN_APART_MS = 200;

function blink() {
  const logo = document.querySelector('.logo');
  if (!logo || document.hidden) return;
  const effect = Math.random() < .5 ? 'blink' : 'dim';
  logo.classList.add(effect);
  setTimeout(() => logo.classList.remove(effect), BLINK_MS);
}
function randomMoments(count) {
  const moments = [];
  while (moments.length < count) {
    const t = Math.random() * WINDOW_MS;
    if (moments.every(m => Math.abs(m - t) >= MIN_APART_MS)) moments.push(t);
  }
  return moments;
}
function planWindow() {
  randomMoments(3 + Math.floor(Math.random() * 2)).forEach(t => setTimeout(blink, t));
  setTimeout(planWindow, WINDOW_MS);
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) planWindow();
