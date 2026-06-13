/* =====================================================================
 * simulation.js — the Game object. Owns the world & all model layers,
 * runs the clock at the selected time scale, tracks the Ω energy budget,
 * records history for the graphs, and exposes high-level actions.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { CONFIG, TIMESCALES, SPEEDS, LIFE, LIFE_BY_ID, BIOME, TECH } = GAIA;
  const U = GAIA.util;

  class Game {
    constructor() {
      this.world = new GAIA.World(CONFIG.GRID_W, CONFIG.GRID_H);
      this.atmo = new GAIA.Atmosphere();
      this.bio = new GAIA.Biosphere();
      this.civ = new GAIA.Civilization();

      this.year = -4500000000;
      this.scaleIdx = 0;
      this.speedIdx = 0;            // start paused
      this.energy = CONFIG.STARTING_ENERGY;
      this.rng = U.makeRNG((Math.random() * 1e9) | 0);

      this.daisyworld = false;
      this.history = [];            // {year, temp, co2, o2, biomass, pop, cities}
      this.log = [];                // event log (newest last)
      this.modelEnable = { geo: true, atmo: true, bio: true, civ: true };
      // adjustable model rates (control panel)
      this.rates = { drift: 1, evo: 1, tech: 1, mutation: 1 };

      this._tickAccum = 0;
      this._stepCount = 0;
    }

    // ---- scenario / lifecycle ----------------------------------------
    loadScenario(sc) {
      // reset
      this.world = new GAIA.World(CONFIG.GRID_W, CONFIG.GRID_H);
      this.atmo = new GAIA.Atmosphere();
      this.bio = new GAIA.Biosphere();
      this.civ = new GAIA.Civilization();
      this.daisyworld = false;
      this.history = [];
      this.log = [];
      this.energy = CONFIG.STARTING_ENERGY;
      this.rng = U.makeRNG((Math.random() * 1e9) | 0);
      this.scenario = sc;
      this.year = sc.startYear;
      this.scaleIdx = Math.max(0, TIMESCALES.findIndex(t => t.id === sc.scale));
      this.speedIdx = 1;
      sc.setup(this);
      // settle climate so the opening view is coherent
      for (let i = 0; i < 12; i++) this.atmo.step(this.world, this.rng);
      this.bio.step(this.world, this.atmo, this.rng, {});
      this.record();
      this.addLog(`Scenario: ${sc.name}. ${sc.blurb}`);
    }

    get scale() { return TIMESCALES[this.scaleIdx]; }
    get speed() { return SPEEDS[this.speedIdx]; }
    setScale(i) { this.scaleIdx = U.clamp(i, 0, TIMESCALES.length - 1); }
    setSpeed(i) { this.speedIdx = U.clamp(i, 0, SPEEDS.length - 1); }
    togglePause() { this.speedIdx = this.speedIdx === 0 ? 1 : 0; }

    // ---- main update (called each animation frame with dt ms) --------
    update(dtMs) {
      const sp = this.speed;
      if (sp.mult === 0) return 0;
      const tickMs = this.scale.tickMs / sp.mult;
      this._tickAccum += dtMs;
      let steps = 0;
      while (this._tickAccum >= tickMs && steps < 6) {
        this._tickAccum -= tickMs;
        this.step();
        steps++;
      }
      return steps;
    }

    // one simulation step at the current time scale
    step() {
      const sc = this.scale.id;
      const r = this.rng;

      if (this.modelEnable.geo && (sc === 'geologic'))
        this.world.drift(r, 0.08 * this.rates.drift);

      if (this.modelEnable.atmo)
        this.atmo.step(this.world, r, {});

      if (this.daisyworld) this._daisyStep();

      if (this.modelEnable.bio)
        this.bio.step(this.world, this.atmo, r, { evoRate: this.rates.evo });

      if (this.modelEnable.civ)
        this.civ.step(this.world, this.atmo, r, { techRate: this.rates.tech }, this);

      // surface civ events to the log
      for (const e of this.civ.events) this.addLog(e);

      // advance the clock
      this.year += this.scale.years;

      // energy regenerates from a thriving biosphere & civilization
      const regen = 200 + this.bio.totalBiomass * 1.2 + this.civ.population * 60;
      this.energy = U.clamp(this.energy + regen, 0, CONFIG.MAX_ENERGY);

      this._stepCount++;
      if (this._stepCount % 4 === 0) this.record();
    }

    // Daisyworld: solar output slowly climbs; black daisies (warm) and
    // white daisies (cool) compete and stabilise temperature.
    _daisyStep() {
      this.atmo.solar = U.clamp(this.atmo.solar + 0.0006, 0.6, 1.6);
      const T = this.atmo.globalTemp;
      // bias biome growth: cold -> dark vegetation, hot -> pale
      this.world.forEach((c) => {
        if (!this.world.isLand(c)) return;
        if (T < 12) c.biome = c.temp > -2 ? 'FOREST' : 'TUNDRA';     // dark, warms
        else if (T > 28) c.biome = 'DESERT';                          // pale, cools
        else c.biome = 'GRASS';
      });
    }

    record() {
      this.history.push({
        year: this.year,
        temp: this.atmo.globalTemp,
        co2: this.atmo.co2,
        o2: this.atmo.o2,
        biomass: this.bio.totalBiomass,
        pop: this.civ.population,
        cities: this.civ.cityCount
      });
      if (this.history.length > 400) this.history.shift();
    }

    addLog(msg) {
      this.log.push({ year: this.year, msg });
      if (this.log.length > 200) this.log.shift();
      if (this.onLog) this.onLog(msg);
    }

    spend(amount) {
      if (this.energy < amount) return false;
      this.energy -= amount;
      return true;
    }

    // ---- high level actions used by tools ----------------------------
    detonate(x, y, radius, isNuke) {
      const w = this.world;
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > radius) continue;
          const c = w.get(x + dx, y + dy);
          if (!c) continue;
          const nukedNano = isNuke && c.city && c.city.tech === TECH.length - 1;
          c.life = null; c.lifePop = 0; c.sentient = false; c.city = null;
          c.biomass = 0;
          if (w.isLand(c)) c.biome = 'ROCK';
          c.temp += 8 * (1 - d / radius);
          // nuking a nanotech city can spawn machine life
          if (nukedNano && this.rng() < 0.5) {
            c.life = 'INSECT'; // placeholder machine-analog: relentless spreader
            c.lifePop = 0.6; c.lifeLevel = 1;
            this.addLog('⚙ Machine life arises from the nanotech ruins!');
          }
        }
      this.atmo.co2 += isNuke ? 200 : 80;
      this.atmo.vapor += 0.2;
    }

    // ---- seeding helpers used by scenarios ---------------------------
    seedLife(id, n) {
      const def = LIFE_BY_ID[id];
      let placed = 0, tries = 0;
      while (placed < n && tries < n * 40) {
        tries++;
        const x = (this.rng() * this.world.w) | 0;
        const y = (this.rng() * this.world.h) | 0;
        const c = this.world.get(x, y);
        if (!c || c.life) continue;
        const ok = def.habit === 'sea' ? !this.world.isLand(c) : this.world.isLand(c);
        if (!ok) continue;
        c.life = id; c.lifePop = 0.4; c.lifeLevel = 0.2;
        placed++;
      }
    }

    seedBiomes() {
      this.world.forEach((c, x, y) => {
        if (this.world.isLand(c)) c.biome = GAIA.classifyBiome(c.temp, c.rain);
      });
    }

    seedCities(n, tech) {
      let placed = 0, tries = 0;
      while (placed < n && tries < n * 80) {
        tries++;
        const x = (this.rng() * this.world.w) | 0;
        const y = (this.rng() * this.world.h) | 0;
        const c = this.world.get(x, y);
        if (!c || !this.world.isLand(c) || c.city) continue;
        if (c.biomass < 0.2 && c.biome !== 'GRASS' && c.biome !== 'FOREST') continue;
        c.life = 'MAMMAL'; c.sentient = true; c.lifePop = 0.6; c.lifeLevel = 1;
        c.city = { tech: U.clamp(tech, 0, TECH.length - 1), pop: 0.5, growth: 0, species: 'MAMMAL' };
        placed++;
      }
    }

    // ---- save / load (localStorage) ----------------------------------
    serialize() {
      const cells = this.world.cells.map(c => ({
        a: +c.alt.toFixed(3), t: +c.temp.toFixed(1), r: +c.rain.toFixed(1),
        c: +c.cloud.toFixed(2), b: c.biome, m: +c.biomass.toFixed(2),
        l: c.life, ll: +c.lifeLevel.toFixed(2), lp: +c.lifePop.toFixed(2),
        s: c.sentient ? 1 : 0, ci: c.city ? [c.city.tech, +c.city.pop.toFixed(2), c.city.species] : 0,
        p: c.plate
      }));
      return JSON.stringify({
        v: 1, year: this.year, scaleIdx: this.scaleIdx, energy: this.energy,
        daisy: this.daisyworld, rates: this.rates,
        atmo: { solar: this.atmo.solar, co2: this.atmo.co2, o2: this.atmo.o2, n2: this.atmo.n2, vapor: this.atmo.vapor },
        cells
      });
    }

    deserialize(json) {
      const d = JSON.parse(json);
      this.year = d.year; this.scaleIdx = d.scaleIdx; this.energy = d.energy;
      this.daisyworld = d.daisy; this.rates = d.rates || this.rates;
      Object.assign(this.atmo, d.atmo);
      d.cells.forEach((s, i) => {
        const c = this.world.cells[i];
        c.alt = s.a; c.temp = s.t; c.rain = s.r; c.cloud = s.c; c.biome = s.b;
        c.biomass = s.m; c.life = s.l; c.lifeLevel = s.ll; c.lifePop = s.lp;
        c.sentient = !!s.s; c.plate = s.p;
        c.city = s.ci ? { tech: s.ci[0], pop: s.ci[1], growth: 0, species: s.ci[2] } : null;
      });
      this.history = []; this.record();
    }
  }

  GAIA.Game = Game;

})(typeof window !== 'undefined' ? window : globalThis);
