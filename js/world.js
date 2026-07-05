// The planet: a wrapping lat/lon grid of cells. Holds all per-cell state as
// flat typed arrays for speed, plus terrain generation.

import { GRID, TUNE, LIFE } from './config.js';
import { mulberry32, fbm } from './rng.js';

export class World {
  constructor(w = GRID.W, h = GRID.H) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.elevation = new Float32Array(n);  // -1..1, 0 == sea level
    this.temp = new Float32Array(n);       // °C
    this.moisture = new Float32Array(n);   // 0..1
    this.rainfall = new Float32Array(n);   // 0..1 (derived, for display)
    this.ice = new Float32Array(n);        // 0..1 ice coverage
    this.life = new Uint8Array(n);         // LIFE.* class
    this.biomass = new Float32Array(n);    // 0..1 how established life is
    this.plate = new Uint8Array(n);        // tectonic plate id
    this.plateVX = new Float32Array(8);    // per-plate drift (unused-lite)
    this.pollution = new Float32Array(n);  // 0..1 civ pollution
    this.city = new Uint8Array(n);         // 0/1 settlement present
    this.seed = 1;
  }

  idx(x, y) { return y * this.w + ((x % this.w) + this.w) % this.w; }

  // Latitude in degrees: +90 (north pole) .. -90 (south pole).
  latitude(y) { return 90 - (y / (this.h - 1)) * 180; }

  // Solar insolation factor by latitude (1 at equator -> ~0 at poles).
  insolation(y) {
    const lat = this.latitude(y) * Math.PI / 180;
    return Math.max(0.05, Math.cos(lat));
  }

  isOcean(i) { return this.elevation[i] < 0; }

  // ---- Terrain generation ------------------------------------------------
  generate(seed, seaLevelPct = TUNE.seaLevelPct) {
    this.seed = seed >>> 0;
    const rnd = mulberry32(this.seed);
    const { w, h } = this;

    // Raw fractal height field, periodic in X.
    const raw = new Float32Array(w * h);
    let min = Infinity, max = -Infinity;
    for (let y = 0; y < h; y++) {
      // Poles pulled down a touch, mid-lats lifted — encourages polar seas/caps.
      const latN = Math.abs(this.latitude(y)) / 90;
      for (let x = 0; x < w; x++) {
        let e = fbm(x, y, this.seed, 6, 1 / 10, w);
        // continental warp: a second low-freq field carves big landmasses
        const cont = fbm(x + 1000, y + 1000, this.seed ^ 0x9e37, 4, 1 / 22, w);
        e = e * 0.55 + cont * 0.55;
        e -= latN * 0.10;                    // slightly lower poles
        const i = y * w + x;
        raw[i] = e;
        if (e < min) min = e;
        if (e > max) max = e;
      }
    }

    // Normalize to 0..1, then find the sea-level threshold by percentile.
    const norm = new Float32Array(w * h);
    for (let i = 0; i < norm.length; i++) norm[i] = (raw[i] - min) / (max - min || 1);
    const sorted = Float32Array.from(norm).sort();
    const seaThresh = sorted[Math.floor(seaLevelPct * sorted.length)];

    // Map to elevation -1..1 around sea level.
    for (let i = 0; i < norm.length; i++) {
      const v = norm[i];
      this.elevation[i] = v < seaThresh
        ? -( (seaThresh - v) / (seaThresh || 1) )        // ocean depth
        : ((v - seaThresh) / (1 - seaThresh || 1));      // land height
      // Moisture: high near/over water and equator, low in continental interiors.
      const y = (i / w) | 0;
      this.moisture[i] = Math.min(1, 0.35 + this.insolation(y) * 0.4 + rnd() * 0.15);
      this.life[i] = LIFE.NONE;
      this.biomass[i] = 0;
      this.ice[i] = 0;
      this.pollution[i] = 0;
      this.city[i] = 0;
    }

    // Coarse tectonic plates via a low-freq region field (for volcano zones).
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = fbm(x + 500, y + 500, this.seed ^ 0x51ed, 2, 1 / 20, w);
        this.plate[y * w + x] = (p * 6) & 7;
      }
    }
    this._smoothMoisture();
  }

  _smoothMoisture() {
    const { w, h, moisture } = this;
    const out = new Float32Array(moisture.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            s += moisture[this.idx(x + dx, yy)]; c++;
          }
        }
        out[y * w + x] = s / c;
      }
    }
    this.moisture.set(out);
  }
}
