// 1-bit style monochrome icons (classic Mac / vintage-toolbar feel), drawn as
// inline SVG that inherits the current text color. No emoji anywhere.

const P = {
  // Tools
  examine: '<path d="M7 2a5 5 0 0 1 3.9 8.1l3.5 3.5-1.4 1.4-3.5-3.5A5 5 0 1 1 7 2zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
  raise:   '<path d="M8 2l5 6h-3v6H6V8H3z"/>',
  lower:   '<path d="M8 14L3 8h3V2h4v6h3z"/>',
  water:   '<path d="M8 2s5 6 5 9a5 5 0 0 1-10 0c0-3 5-9 5-9z"/>',
  seed:    '<path d="M7 14V9a4 4 0 0 0-4-4 4 4 0 0 0 4 4zM9 14V9a4 4 0 0 1 4-4 4 4 0 0 1-4 4z"/><rect x="7" y="9" width="2" height="5"/>',
  forest:  '<path d="M8 1l4 6H9.5l2.5 4H9v4H7v-4H4l2.5-4H4z"/>',
  volcano: '<path d="M1 15l4-6h1l2 3 2-3h1l4 6z"/><path d="M6 9l2-6 2 6z"/>',
  meteor:  '<circle cx="11" cy="5" r="3"/><path d="M1 15l6-5M2 11l3 .5M5 14l.5-3" stroke="currentColor" stroke-width="1.3" fill="none"/>',
  warm:    '<circle cx="8" cy="8" r="3"/><g stroke="currentColor" stroke-width="1.4"><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13"/></g>',
  cool:    '<g stroke="currentColor" stroke-width="1.3" fill="none"><path d="M8 1v14M2 4.5l12 7M14 4.5l-12 7"/><path d="M8 4L6 2M8 4l2-2M8 12l-2 2M8 12l2 2"/></g>',
  // Speed / time
  pause:   '<rect x="4" y="3" width="3" height="10"/><rect x="9" y="3" width="3" height="10"/>',
  play:    '<path d="M4 3l9 5-9 5z"/>',
  fast:    '<path d="M2 3l6 5-6 5zM8 3l6 5-6 5z"/>',
  turbo:   '<path d="M1 4l4 4-4 4zM6 4l4 4-4 4zM11 4l4 4-4 4z"/>',
  clock:   '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v4l3 2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  menu:    '<rect x="2" y="4" width="12" height="1.8"/><rect x="2" y="7.1" width="12" height="1.8"/><rect x="2" y="10.2" width="12" height="1.8"/>',
  dice:    '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5.5" cy="5.5" r="1.1"/><circle cx="10.5" cy="10.5" r="1.1"/><circle cx="8" cy="8" r="1.1"/>',
  city:    '<path d="M1 15V8l3-2 3 2V5l4-3 4 3v10z"/>',
  bolt:    '<path d="M9 1L3 9h4l-1 6 7-9H9z"/>',
};

// Return a full <svg> element string for the named icon.
export function iconSVG(name, size = 18) {
  const inner = P[name] || '';
  return `<svg class="ic" viewBox="0 0 16 16" width="${size}" height="${size}" ` +
         `fill="currentColor" aria-hidden="true">${inner}</svg>`;
}

export const ICON_NAMES = Object.keys(P);
