/* =====================================================================
 * atmosphere.js — climate model: insolation, greenhouse, albedo,
 * heat diffusion, clouds and rainfall. Holds the global gas budget.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { CONFIG, BIOME } = GAIA;
  const U = GAIA.util;

  class Atmosphere {
    constructor() {
      this.solar = CONFIG.SOLAR_EARTH; // relative solar constant (player adjustable)
      // global gas pools
      this.co2 = CONFIG.GASES.CO2.earth;   // ppm
      this.o2 = CONFIG.GASES.O2.earth;     // %
      this.n2 = CONFIG.GASES.N2.earth;     // %
      this.vapor = CONFIG.GASES.VAPOR.earth; // relative
      this.globalTemp = 15;                // °C mean
      this.iceCover = 0.1;                 // fraction of surface frozen
      this.cloudCover = 0.3;
    }

    // Global mean greenhouse forcing from CO2 (log response) + vapor.
    greenhouse() {
      const co2Term = Math.log(Math.max(1, this.co2) / CONFIG.GASES.CO2.earth) / Math.LN2; // doublings
      const g = co2Term * 4.0          // ~4°C per CO2 doubling
              + (this.vapor - 1) * 6.0; // water-vapor feedback
      return g;
    }

    // One climate step over the whole world.
    step(world, rng, opts) {
      opts = opts || {};
      const w = world.w, h = world.h;
      const eqBase = 30;                      // equatorial baseline °C at solar=1
      const solarForce = (this.solar - 1) * 110; // forcing from a brighter/dimmer sun
      const gh = this.greenhouse();

      // 1. target temperature per cell from latitude, altitude, greenhouse, albedo
      let iceTiles = 0, cloudSum = 0, total = w * h;
      world.forEach((c, x, y) => {
        const latAbs = Math.abs(world.lat(y));
        let t = eqBase + solarForce + gh
              - 52 * latAbs * latAbs                  // poles colder
              - Math.max(0, c.alt) * 30;              // altitude lapse
        // albedo cooling: ice & clouds & deserts reflect
        const b = BIOME[c.biome];
        const albedo = (b && b.albedo != null) ? b.albedo : (world.isLand(c) ? 0.18 : 0.08);
        t -= albedo * 12;
        t -= c.cloud * 4;
        // ocean thermal inertia: relax slowly; land responds faster
        const inertia = world.isLand(c) ? 0.30 : 0.10;
        c.temp += (t - c.temp) * inertia;
        if (c.temp < -2) iceTiles++;
        cloudSum += c.cloud;
      });

      // 2. lateral heat diffusion (smooths climate, moves heat poleward)
      this._diffuse(world, 0.12);

      // 3. evaporation -> vapor -> clouds -> rain
      world.forEach((c, x, y) => {
        const latAbs = Math.abs(world.lat(y));
        // evaporation strongest over warm seas
        const evap = (!world.isLand(c))
          ? U.clamp((c.temp + 5) / 35, 0, 1) * this.vapor
          : 0.05;
        // wet latitude bands: equator + temperate, dry subtropics/poles
        const band = 0.55 + 0.45 * Math.cos((latAbs - 0.0) * Math.PI * 1.0)
                   - 0.35 * Math.exp(-Math.pow((latAbs - 0.33) / 0.16, 2));
        // proximity to water raises humidity (coastal rain)
        const coast = this._nearWater(world, x, y) ? 1 : 0.55;
        let target = U.clamp((evap * 60 + 25) * band * coast, 2, 100);
        // orographic: mountains wring out rain
        target += Math.max(0, c.alt) * 15;
        c.rain += (target - c.rain) * 0.18;
        c.rain = U.clamp(c.rain, 0, 100);
        // cloud cover tracks humidity & temperature
        const cl = U.clamp((c.rain / 100) * 0.8 + (c.temp > 0 ? 0.1 : 0), 0, 1) * this.vapor;
        c.cloud += (cl - c.cloud) * 0.25;
      });

      // 4. update global diagnostics
      this.iceCover = iceTiles / total;
      this.cloudCover = cloudSum / total;
      let tsum = 0; world.forEach(c => tsum += c.temp);
      this.globalTemp = tsum / total;

      // 5. slow natural gas dynamics:
      // CO2 slowly drawn down by oceans (carbon sink), vapor relaxes toward equilibrium
      this.co2 += (CONFIG.GASES.CO2.earth - this.co2) * 0.0008; // weak weathering sink
      this.vapor += (1.0 - this.vapor) * 0.01;
      this.co2 = U.clamp(this.co2, 0, 100000);
      this.o2 = U.clamp(this.o2, 0, 95);
      this.vapor = U.clamp(this.vapor, 0, 6);
    }

    _diffuse(world, k) {
      const w = world.w, h = world.h;
      const tmp = new Float32Array(w * h);
      world.forEach((c, x, y) => {
        const n = world.get(x, y - 1) || c;
        const s = world.get(x, y + 1) || c;
        const e = world.get(x + 1, y);
        const ww = world.get(x - 1, y);
        tmp[world.idx(x, y)] = c.temp + k * ((n.temp + s.temp + e.temp + ww.temp) / 4 - c.temp);
      });
      world.forEach((c, x, y) => { c.temp = tmp[world.idx(x, y)]; });
    }

    _nearWater(world, x, y) {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const c = world.get(x + dx, y + dy);
          if (c && !world.isLand(c)) return true;
        }
      return false;
    }

    // approximate wind vector at a latitude (for the Air overlay & cloud drift)
    wind(latNorm) {
      const a = Math.abs(latNorm);
      // trade winds (easterly) near equator, westerlies mid, polar easterlies
      if (a < 0.33) return { u: -1, v: latNorm > 0 ? 0.2 : -0.2 };
      if (a < 0.66) return { u: 1, v: latNorm > 0 ? -0.2 : 0.2 };
      return { u: -0.7, v: 0 };
    }
  }

  GAIA.Atmosphere = Atmosphere;

})(typeof window !== 'undefined' ? window : globalThis);
