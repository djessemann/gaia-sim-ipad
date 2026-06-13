/* =====================================================================
 * civilization.js — intelligent life: cities grow, advance through the
 * seven technology ages, pollute, wage war, and ultimately leave the
 * planet in the Exodus. Nuking a Nanotech city can birth machine life.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { TECH, LIFE_BY_ID, BIOME } = GAIA;
  const U = GAIA.util;

  class Civilization {
    constructor() {
      this.cityCount = 0;
      this.maxTech = -1;
      this.population = 0;
      this.exodus = false;
      this.events = [];   // transient log lines this step
    }

    step(world, atmo, rng, opts, game) {
      opts = opts || {};
      const techRate = opts.techRate != null ? opts.techRate : 1;
      this.events = [];
      let count = 0, maxTech = -1, pop = 0, pollution = 0;

      world.forEach((c, x, y) => {
        if (!c.city) return;
        if (!world.isLand(c)) { c.city = null; return; }
        const city = c.city;
        const tech = TECH[city.tech];

        // food/habitability from surrounding biomass & temperature
        const food = this._localFood(world, x, y);
        const climate = (c.temp > -5 && c.temp < 42) ? 1 : 0.2;
        const support = U.clamp(food * climate, 0, 1);

        // population growth toward support capacity
        city.pop += (support - city.pop) * 0.08 * (0.5 + tech.spread);
        city.pop = U.clamp(city.pop, 0, 1);
        if (city.pop < 0.03) { c.city = null; c.sentient = false; return; }

        // pollution -> CO2
        pollution += tech.pollute * city.pop;

        // tech advances when populous & stable
        if (support > 0.45) {
          city.growth += tech.advance * techRate * city.pop;
          if (city.growth >= 1 && city.tech < TECH.length - 1) {
            city.growth = 0; city.tech++;
            this.events.push(`A ${LIFE_BY_ID[city.species].name.replace(/s$/, '')} city reached the ${TECH[city.tech].name}.`);
          }
        } else {
          city.growth = Math.max(0, city.growth - 0.005);
        }

        // expansion: spawn a new settlement on a fertile neighbor
        if (city.pop > 0.6 && rng() < 0.04 * tech.spread) {
          const n = this._fertileNeighbor(world, x, y);
          if (n) {
            n.city = { tech: Math.max(0, city.tech - 1), pop: 0.1, growth: 0, species: city.species };
            n.life = city.species; n.sentient = true;
          }
        }

        // industrial+ ages consume nearby vegetation (deforestation)
        if (city.tech >= 3 && rng() < 0.08 * city.pop) {
          const n = world.get(x + (rng()*3|0) - 1, y + (rng()*3|0) - 1);
          if (n && world.isLand(n) && n.biomass > 0.3 && !n.city) {
            n.biomass *= 0.5;
            if (rng() < 0.3) n.biome = 'ROCK';
          }
        }

        // Atomic age: chance of nuclear war
        if (city.tech === 4 && rng() < 0.0008 * city.pop) {
          this.events.push('☢ Nuclear war erupts!');
          if (game) game.detonate(x, y, 3, false);
        }

        count++; pop += city.pop;
        if (city.tech > maxTech) maxTech = city.tech;
      });

      // pollution warms via CO2
      atmo.co2 += pollution * 0.06;

      // Exodus: a mature Nanotech civilization leaves the planet
      if (maxTech === TECH.length - 1 && count > 6 && pop / count > 0.7) {
        if (rng() < 0.01) this._triggerExodus(world);
      }

      this.cityCount = count;
      this.maxTech = maxTech;
      this.population = pop;
    }

    _triggerExodus(world) {
      let launched = 0;
      world.forEach((c) => {
        if (c.city) { c.city = null; c.sentient = false; launched++; }
      });
      if (launched) {
        this.exodus = true;
        this.events.push('🚀 THE EXODUS: every city fits engines and departs. The planet is now a preserve.');
      }
    }

    _localFood(world, x, y) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const c = world.get(x + dx, y + dy);
          if (!c) continue;
          sum += world.isLand(c) ? c.biomass : 0.25; // coast = fishing
          n++;
        }
      return n ? U.clamp(sum / n + 0.1, 0, 1) : 0;
    }

    _fertileNeighbor(world, x, y) {
      let best = null, bestB = 0.25;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          const c = world.get(x + dx, y + dy);
          if (!c || !world.isLand(c) || c.city) continue;
          if (c.biomass > bestB) { bestB = c.biomass; best = c; }
        }
      return best;
    }
  }

  GAIA.Civilization = Civilization;

})(typeof window !== 'undefined' ? window : globalThis);
