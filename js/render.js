// Renderer: draws the planet to a low-res pixel buffer with ordered (Bayer)
// dithering for that authentic early-90s VGA gradient look, then scales it up
// with nearest-neighbour. Supports five data-layer view modes.

import { PAL, LIFE, LIFE_TRAITS } from './config.js';

const CELL = 8; // pixels per grid cell in the buffer (scaled up by CSS)

// 4x4 Bayer matrix, normalized 0..1 — thresholds for ordered dithering.
const BAYER = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
].map(r => r.map(v => (v + 0.5) / 16));

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Pre-parse palette to rgb once.
const RGB = {};
for (const k in PAL) RGB[k] = hexToRgb(PAL[k]);

export class Renderer {
  constructor(canvas, sim) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.sim = sim;
    this.view = 'terrain';
    const w = sim.world.w, h = sim.world.h;
    this.buf = document.createElement('canvas');
    this.buf.width = w * CELL;
    this.buf.height = h * CELL;
    this.bctx = this.buf.getContext('2d');
    this.img = this.bctx.createImageData(this.buf.width, this.buf.height);
    this.data = this.img.data;
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255; // opaque
  }

  setView(v) { this.view = v; }

  // Returns [colorA, colorB, mix] for a cell under the current view mode.
  cellColors(i) {
    const w = this.sim.world;
    const el = w.elevation[i];
    switch (this.view) {
      case 'temp': {
        const t = w.temp[i];
        // cold (blue) -> temperate (green) -> hot (red)
        if (t < 0) return [RGB.ice, RGB.cold, clamp01((t + 30) / 30)];
        if (t < 18) return [RGB.cold, RGB.life, clamp01(t / 18)];
        if (t < 35) return [RGB.life, RGB.warn, clamp01((t - 18) / 17)];
        return [RGB.warn, RGB.hot, clamp01((t - 35) / 20)];
      }
      case 'rain': {
        const r = w.rainfall[i];
        if (el < 0) return [RGB.deepOcean, RGB.ocean, 0.5];
        return [RGB.desert, RGB.forest, r];
      }
      case 'biome': {
        if (w.life[i] === LIFE.NONE) {
          return el < 0 ? [RGB.deepOcean, RGB.ocean, 0.4] : [RGB.tundra, RGB.desert, 0.3];
        }
        const tint = hexToRgb(LIFE_TRAITS[w.life[i]].tint);
        const base = el < 0 ? RGB.ocean : RGB.lowland;
        return [base, tint, 0.4 + w.biomass[i] * 0.6];
      }
      case 'civ': {
        if (w.city[i]) return [RGB.hot, RGB.warn, 0.5];
        const p = w.pollution[i];
        if (p > 0.02) return [RGB.tundra, RGB.panelShadow, clamp01(p)];
        return el < 0 ? [RGB.deepOcean, RGB.ocean, 0.4]
                      : [RGB.lowland, RGB.forest, 0.3];
      }
      default: return this.terrainColors(i);
    }
  }

  terrainColors(i) {
    const w = this.sim.world;
    const el = w.elevation[i];
    if (el < 0) {
      // Ocean by depth.
      const d = clamp01(-el);
      if (d > 0.5) return [RGB.deepOcean, RGB.ocean, (d - 0.5) * 2];
      return [RGB.ocean, RGB.shallow, 1 - d * 2];
    }
    // Land by height, tinted by rainfall (green vs desert).
    const r = w.rainfall[i];
    if (el < 0.03) return [RGB.beach, RGB.coast, 0.5];
    if (el < 0.25) return r > 0.4 ? [RGB.grass, RGB.forest, r] : [RGB.lowland, RGB.desert, 1 - r];
    if (el < 0.5) return [RGB.hills, RGB.forest, r * 0.6];
    if (el < 0.75) return [RGB.mountain, RGB.hills, 0.5];
    return [RGB.peak, RGB.snow, clamp01((el - 0.75) * 4)];
  }

  render() {
    const w = this.sim.world;
    const data = this.data;
    const bw = this.buf.width;
    for (let cy = 0; cy < w.h; cy++) {
      for (let cx = 0; cx < w.w; cx++) {
        const i = cy * w.w + cx;
        let [ca, cb, mix] = this.cellColors(i);
        mix = clamp01(mix);

        // Overlays that modify the two candidate colors before dithering.
        const ice = this.view === 'terrain' || this.view === 'temp' ? w.ice[i] : 0;
        if (ice > 0.15) {
          const iceRgb = w.elevation[i] < 0 ? RGB.seaIce : RGB.snow;
          ca = mixRgb(ca, iceRgb, Math.min(1, ice));
          cb = mixRgb(cb, iceRgb, Math.min(1, ice));
        }

        // Fresh eruption glow.
        if (this.sim.lastEruption && this.sim.lastEruption.i === i &&
            this.sim.tick - this.sim.lastEruption.t < 6) {
          ca = RGB.lava; cb = RGB.magma; mix = 0.5;
        }

        // Paint the CELLxCELL block with ordered dithering between ca/cb.
        for (let py = 0; py < CELL; py++) {
          const yy = cy * CELL + py;
          const row = BAYER[yy & 3];
          let p = (yy * bw + cx * CELL) * 4;
          for (let px = 0; px < CELL; px++) {
            const c = mix > row[(cx * CELL + px) & 3] ? cb : ca;
            data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2];
            p += 4;
          }
        }

        // City markers: a bright dot in the block center (civ + terrain views).
        if (w.city[i] && (this.view === 'civ' || this.view === 'terrain')) {
          const cypx = cy * CELL + (CELL >> 1);
          const cxpx = cx * CELL + (CELL >> 1);
          const p = (cypx * bw + cxpx) * 4;
          data[p] = 240; data[p + 1] = 220; data[p + 2] = 90;
        }
      }
    }
    this.bctx.putImageData(this.img, 0, 0);

    // Scale buffer to the display canvas, nearest-neighbour for crisp pixels.
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PAL.screen;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.buf, 0, 0, this.canvas.width, this.canvas.height);
  }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
