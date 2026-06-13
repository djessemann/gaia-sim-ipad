/* =====================================================================
 * world.js — the planetary grid: cells, terrain generation, tectonics
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { CONFIG, BIOME } = GAIA;
  const U = GAIA.util;

  // A Cell holds every per-tile state the simulation tracks.
  function makeCell() {
    return {
      alt: 0,        // elevation -1 (deep sea) .. +1 (high mountain)
      temp: 15,      // °C
      rain: 30,      // 0..100 rainfall index
      vapor: 0,      // local humidity contribution
      cloud: 0,      // 0..1 cloud cover
      biome: 'OCEAN',
      biomass: 0,    // 0..1 vegetation density (drifts toward climate target)
      life: null,    // life class id present (animal)
      lifeLevel: 0,  // 0..1 evolution progress within class
      lifePop: 0,    // 0..1 population density
      sentient: false,
      city: null,    // { tech, pop } if a settlement is here
      plate: 0       // plate id for tectonics
    };
  }

  class World {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.cells = new Array(w * h);
      for (let i = 0; i < this.cells.length; i++) this.cells[i] = makeCell();
      this.driftPhase = 0;
    }

    idx(x, y) { return y * this.w + x; }
    wrapX(x) { const w = this.w; return ((x % w) + w) % w; }
    get(x, y) {
      if (y < 0 || y >= this.h) return null;
      return this.cells[this.idx(this.wrapX(x), y)];
    }
    // latitude in -1..1 (0 = equator), used for insolation
    lat(y) { return (y / (this.h - 1)) * 2 - 1; }

    forEach(fn) {
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++)
          fn(this.cells[this.idx(x, y)], x, y);
    }

    // --- Terrain generation -------------------------------------------
    generate(rng, opts) {
      opts = opts || {};
      const seaFrac = opts.seaFrac != null ? opts.seaFrac : 0.62;
      const field = U.valueNoiseField(this.w, this.h, rng, {
        octaves: 6, persistence: 0.54, baseFreq: 4
      });

      // Determine sea level threshold so ~seaFrac of tiles are ocean.
      const sorted = Float32Array.from(field).sort();
      const thr = sorted[Math.floor(seaFrac * sorted.length)];

      this.forEach((c, x, y) => {
        let n = field[this.idx(x, y)];
        // taper elevation toward the poles a touch (continents cluster mid)
        const latAbs = Math.abs(this.lat(y));
        let alt;
        if (n < thr) {
          alt = -((thr - n) / (thr + 1e-6));        // -1..0 ocean depth
        } else {
          alt = ((n - thr) / (1 - thr + 1e-6));      // 0..1 land height
          alt = Math.pow(alt, 0.85);
        }
        c.alt = U.clamp(alt, -1, 1);
        // assign a tectonic plate by coarse region
        c.plate = (Math.floor(x / (this.w / 6)) + Math.floor(y / (this.h / 4)) * 6) | 0;
        c.biome = c.alt > CONFIG.SEA_LEVEL ? 'ROCK' : (c.alt > -0.25 ? 'SHALLOWS' : 'OCEAN');
        c.biomass = 0;
        c.life = null; c.lifeLevel = 0; c.lifePop = 0; c.sentient = false; c.city = null;
        // crude initial climate so the first frame looks sensible
        c.temp = 30 - 55 * latAbs - Math.max(0, c.alt) * 30;
        c.rain = U.clamp(60 - 40 * latAbs, 5, 95);
      });
    }

    isLand(c) { return c.alt > CONFIG.SEA_LEVEL; }

    // --- Plate tectonics ----------------------------------------------
    // Slowly drift the elevation field horizontally and let plate
    // boundaries push up mountains / open rifts.
    drift(rng, rate) {
      this.driftPhase += rate;
      if (this.driftPhase < 1) return;
      this.driftPhase -= 1;

      const w = this.w, h = this.h;
      const next = new Float32Array(w * h);
      // shear: each latitude band drifts at a slightly different rate
      for (let y = 0; y < h; y++) {
        const dir = (y % 2 === 0) ? 1 : -1;
        for (let x = 0; x < w; x++) {
          const src = this.get(x - dir, y);
          next[this.idx(x, y)] = src.alt;
        }
      }
      // apply with boundary uplift where plates of differing drift meet
      this.forEach((c, x, y) => {
        let a = next[this.idx(x, y)];
        const left = this.get(x - 1, y), right = this.get(x + 1, y);
        if (left && right && left.plate !== right.plate) {
          // convergent boundary -> uplift, divergent -> subsidence (alternate)
          a += (rng() < 0.5 ? 0.04 : -0.03);
        }
        c.alt = U.clamp(a, -1, 1);
        if (!this.isLand(c) && c.biome !== 'OCEAN' && c.biome !== 'SHALLOWS') {
          // drowned land
          c.biome = c.alt > -0.25 ? 'SHALLOWS' : 'OCEAN';
          c.life = null; c.biomass = 0; c.city = null; c.sentient = false;
        } else if (this.isLand(c) && (c.biome === 'OCEAN' || c.biome === 'SHALLOWS')) {
          c.biome = 'ROCK';
        }
      });
    }

    // raise/lower a region (terraform tools)
    deform(x, y, delta, radius) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > radius) continue;
          const c = this.get(x + dx, y + dy);
          if (!c) continue;
          const f = 1 - d / (radius + 0.001);
          c.alt = U.clamp(c.alt + delta * f, -1, 1);
          if (this.isLand(c) && (c.biome === 'OCEAN' || c.biome === 'SHALLOWS')) c.biome = 'ROCK';
          if (!this.isLand(c)) {
            c.biome = c.alt > -0.25 ? 'SHALLOWS' : 'OCEAN';
            c.life = c.life && GAIA.LIFE_BY_ID[c.life].habit === 'sea' ? c.life : null;
            c.city = null; c.sentient = false; c.biomass = 0;
          }
        }
      }
    }
  }

  GAIA.World = World;
  GAIA.makeCell = makeCell;

})(typeof window !== 'undefined' ? window : globalThis);
