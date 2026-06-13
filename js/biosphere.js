/* =====================================================================
 * biosphere.js — biomes (Whittaker-style climate classification),
 * vegetation growth, animal life spread & evolution, and sentience.
 * Life consumes CO2 and produces O2 — a core Gaia feedback.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { CONFIG, BIOME, LIFE_BY_ID, LIFE } = GAIA;
  const U = GAIA.util;

  // Choose the natural biome for a land cell given its climate.
  function classify(temp, rain) {
    if (temp <= -4) return 'ICE';
    if (temp < 4) return rain > 25 ? 'BOREAL' : 'TUNDRA';
    if (temp < 22) {
      if (rain < 18) return 'DESERT';
      if (rain < 45) return 'GRASS';
      return 'FOREST';
    }
    // hot
    if (rain < 16) return 'DESERT';
    if (rain < 38) return 'GRASS';
    if (rain < 72) return 'FOREST';
    return rain > 88 ? 'SWAMP' : 'JUNGLE';
  }

  class Biosphere {
    constructor() {
      this.totalBiomass = 0;
      this.diversity = 0;       // distinct life classes present
      this.dominant = null;     // most widespread life class
    }

    step(world, atmo, rng, opts) {
      opts = opts || {};
      const evoRate = opts.evoRate != null ? opts.evoRate : 1;
      const w = world.w, h = world.h;

      let biomass = 0;
      const counts = {};
      let o2Production = 0, co2Draw = 0, co2Vent = 0;

      // --- biomes drift toward their climate target -------------------
      world.forEach((c, x, y) => {
        if (!world.isLand(c)) {
          c.biome = c.alt > -0.25 ? 'SHALLOWS' : 'OCEAN';
          c.biomass = 0;
          return;
        }
        if (c.city) return; // cities hold their tile
        const target = classify(c.temp, c.rain);
        const tb = BIOME[target];
        // move current biome toward target occasionally (succession)
        if (c.biome === 'ROCK' || c.biome === 'OCEAN' || c.biome === 'SHALLOWS') {
          // bare rock greens up only if some seed life/biomass nearby
          if (this._nearVeg(world, x, y) || rng() < 0.02) c.biome = target;
        } else if (c.biome !== target && rng() < 0.04 * evoRate) {
          c.biome = target;
        }
        const cur = BIOME[c.biome];
        const cap = cur.biomass != null ? cur.biomass : 0;
        c.biomass += (cap - c.biomass) * 0.1;
        biomass += c.biomass;
        // photosynthesis: vegetation draws CO2, makes O2
        co2Draw += c.biomass;
      });

      // --- animal life: spread, grow, evolve --------------------------
      world.forEach((c, x, y) => {
        if (!c.life) return;
        const def = LIFE_BY_ID[c.life];
        // habitat check
        const ok = (def.habit === 'sea') ? !world.isLand(c) : world.isLand(c);
        if (!ok) { c.life = null; c.lifePop = 0; c.sentient = false; return; }

        // carrying capacity from biomass (land) or warmth (sea)
        const cap = (def.habit === 'land')
          ? U.clamp(c.biomass + 0.1, 0.05, 1)
          : U.clamp((c.temp + 5) / 35, 0.05, 1);
        c.lifePop += (cap - c.lifePop) * 0.15;
        c.lifePop = U.clamp(c.lifePop, 0, 1);

        // temperature stress -> die-off
        if (c.temp < -8 || c.temp > 55) c.lifePop -= 0.05;
        if (c.lifePop <= 0.02) { c.life = null; c.sentient = false; c.lifePop = 0; return; }

        counts[c.life] = (counts[c.life] || 0) + 1;
        o2Production += c.lifePop * 0.4;

        // evolution within the class
        c.lifeLevel = U.clamp(c.lifeLevel + 0.004 * evoRate * c.lifePop, 0, 1);

        // spread to suitable neighbors
        if (c.lifePop > 0.4 && rng() < 0.25 * c.lifePop) {
          const nx = x + (rng() < 0.5 ? -1 : 1);
          const ny = y + (rng() < 0.5 ? -1 : 1);
          const n = world.get(nx, ny);
          if (n && !n.life && !n.city) {
            const okN = (def.habit === 'sea') ? !world.isLand(n) : world.isLand(n);
            if (okN) { n.life = c.life; n.lifeLevel = 0; n.lifePop = 0.05; }
          }
        }

        // speciation: mature populations branch into the next class
        if (c.lifeLevel >= 1 && def.next.length && rng() < 0.01 * evoRate) {
          const nextId = def.next[(rng() * def.next.length) | 0];
          const nd = LIFE_BY_ID[nextId];
          // place descendant on an appropriate adjacent tile
          const target = this._findHabitat(world, x, y, nd.habit);
          if (target) { target.life = nextId; target.lifeLevel = 0; target.lifePop = 0.1; }
        }

        // natural rise of sentience for high-IQ, fully evolved classes
        if (!c.sentient && c.lifeLevel >= 1 && def.iq > 0 &&
            rng() < 0.0008 * def.iq * evoRate * c.lifePop) {
          this.makeSentient(world, x, y);
        }
      });

      // --- apply gas exchange to the atmosphere -----------------------
      // Photosynthesis draws down CO2 and releases O2, but can only take
      // what is available (eases as CO2 falls) so it never crashes to zero.
      const draw = Math.min(atmo.co2 * 0.015, co2Draw * 0.006);
      atmo.co2 -= draw;
      atmo.o2 += (o2Production * 0.00006 + draw * 0.0008);
      atmo.o2 = U.clamp(atmo.o2, 0, 95);
      atmo.co2 = U.clamp(atmo.co2, 0, 100000);

      this.totalBiomass = biomass;
      this.diversity = Object.keys(counts).length;
      let best = null, bestN = 0;
      for (const k in counts) if (counts[k] > bestN) { bestN = counts[k]; best = k; }
      this.dominant = best;
      this.counts = counts;
    }

    // Turn the life at (x,y) sentient and found its first city if on land.
    makeSentient(world, x, y) {
      const c = world.get(x, y);
      if (!c || !c.life) return false;
      c.sentient = true;
      const def = LIFE_BY_ID[c.life];
      // sea-dwellers (cetaceans, trichordates) are sentient but build no cities
      if (def.habit === 'land' && !c.city) {
        c.city = { tech: 0, pop: 0.1, growth: 0, species: c.life };
      } else if (def.habit === 'sea') {
        // find nearby land to settle, if any (amphibious leap)
        const land = this._findHabitat(world, x, y, 'land');
        if (land && !land.city) {
          land.life = land.life || c.life;
          land.sentient = true;
          land.city = { tech: 0, pop: 0.1, growth: 0, species: c.life };
        }
      }
      return true;
    }

    _nearVeg(world, x, y) {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const c = world.get(x + dx, y + dy);
          if (c && c.biomass > 0.2) return true;
        }
      return false;
    }

    _findHabitat(world, x, y, habit) {
      const order = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
      for (const [dx, dy] of order) {
        const c = world.get(x + dx, y + dy);
        if (!c || c.life || c.city) continue;
        const ok = habit === 'sea' ? !world.isLand(c) : world.isLand(c);
        if (ok) return c;
      }
      return null;
    }
  }

  GAIA.Biosphere = Biosphere;
  GAIA.classifyBiome = classify;

})(typeof window !== 'undefined' ? window : globalThis);
