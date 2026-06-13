/* =====================================================================
 * utils.js — math helpers, seeded RNG, value-noise terrain generator
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});

  const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  // Mulberry32 — small fast seeded PRNG
  function makeRNG(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Value noise over a wrapping (cylindrical) grid -> elevation field.
  // Octaves of interpolated lattice noise; x wraps, y clamps.
  function valueNoiseField(w, h, rng, opts) {
    opts = opts || {};
    const octaves = opts.octaves || 5;
    const persistence = opts.persistence || 0.55;
    const baseFreq = opts.baseFreq || 4;
    const field = new Float32Array(w * h);

    // precompute per-octave lattices
    const layers = [];
    let freq = baseFreq, amp = 1, totalAmp = 0;
    for (let o = 0; o < octaves; o++) {
      const gw = Math.max(2, Math.round(freq));
      const gh = Math.max(2, Math.round(freq * h / w) + 1);
      const lat = new Float32Array(gw * gh);
      for (let i = 0; i < lat.length; i++) lat[i] = rng();
      layers.push({ gw, gh, lat, amp });
      totalAmp += amp;
      freq *= 2; amp *= persistence;
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let o = 0; o < octaves; o++) {
          const L = layers[o];
          const fx = (x / w) * L.gw;
          const fy = (y / h) * (L.gh - 1);
          const x0 = Math.floor(fx) % L.gw;
          const x1 = (x0 + 1) % L.gw;
          const y0 = clamp(Math.floor(fy), 0, L.gh - 1);
          const y1 = clamp(y0 + 1, 0, L.gh - 1);
          const tx = smooth(fx - Math.floor(fx));
          const ty = smooth(fy - Math.floor(fy));
          const v00 = L.lat[y0 * L.gw + x0], v10 = L.lat[y0 * L.gw + x1];
          const v01 = L.lat[y1 * L.gw + x0], v11 = L.lat[y1 * L.gw + x1];
          const top = lerp(v00, v10, tx);
          const bot = lerp(v01, v11, tx);
          sum += lerp(top, bot, ty) * L.amp;
        }
        field[y * w + x] = sum / totalAmp; // 0..1
      }
    }
    return field;
  }

  // HSL -> CSS string helper for gradient overlays
  function hsl(h, s, l) { return `hsl(${h|0},${s|0}%,${l|0}%)`; }

  // Blend two hex colors by t (0..1)
  function mix(c1, c2, t) {
    const a = hex2rgb(c1), b = hex2rgb(c2);
    return `rgb(${(a[0]+(b[0]-a[0])*t)|0},${(a[1]+(b[1]-a[1])*t)|0},${(a[2]+(b[2]-a[2])*t)|0})`;
  }
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
  }

  GAIA.util = { clamp, lerp, smooth, makeRNG, valueNoiseField, hsl, mix, hex2rgb };

})(typeof window !== 'undefined' ? window : globalThis);
