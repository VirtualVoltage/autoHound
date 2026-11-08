// Scrolling the mouse wheel inside a box (the chat frame) never scrolls the page behind it. So people can
// tell they're scrolling a box and the site isn't stuck, scrolling past the end pulls the box's contents
// a little way and they spring back once the wheel stops, like scrolling past the end on an iPhone.
// This only sets the --pull variable and a "pulling" class on the box; each profile's CSS moves the contents.
const MAX = 46;      // furthest the contents can be pulled, in pixels
const EASE = 160;    // how quickly the pull stiffens

// Can a scroll box between the pointer and the frame still scroll this way? Then the browser scrolls it.
const canScroll = (from, frame, dy) => {
  for (let el = from; el && el !== frame.parentElement; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && el.tagName !== 'TEXTAREA') continue;
    if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
  }
  return false;
};

export function springWheel(frame) {
  if (!frame || frame.dataset.spring) return;
  frame.dataset.spring = '1';
  let raw = 0, release = null;
  frame.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const dy = e.deltaMode ? e.deltaY * 40 : e.deltaY;
    if (!dy || (!raw && canScroll(e.target, frame, dy))) return;
    // Turning the wheel back while pulled eases the pull off first, then scrolls normally.
    const before = raw;
    raw += dy;
    if (before && Math.sign(raw) !== Math.sign(before)) raw = 0;
    e.preventDefault();
    const pull = -Math.sign(raw) * MAX * (1 - Math.exp(-Math.abs(raw) / EASE));
    frame.classList.add('pulling');
    frame.style.setProperty('--pull', pull.toFixed(1) + 'px');
    clearTimeout(release);
    release = setTimeout(() => { raw = 0; frame.classList.remove('pulling'); frame.style.setProperty('--pull', '0px'); }, 110);
  }, { passive: false });
}
