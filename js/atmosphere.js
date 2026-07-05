// Atmosphere & climate: per-cell temperature from insolation + greenhouse,
// the ice-albedo feedback loop (Daisyworld-style), and global gas balance.

import { TUNE } from './config.js';

export function updateClimate(sim) {
  const w = sim.world;
  const { elevation, temp, ice } = w;
  const n = w.w * w.h;

  // Greenhouse forcing from CO2 above the pre-industrial baseline.
  const greenhouse = (sim.co2 - TUNE.co2Baseline) * TUNE.greenhousePerCO2;
  const solar = sim.solar * TUNE.baseSolar;

  for (let y = 0; y < w.h; y++) {
    const ins = w.insolation(y);
    for (let x = 0; x < w.w; x++) {
      const i = y * w.w + x;

      // Base equilibrium temp: equator hot, poles cold, plus greenhouse.
      let target = -18 + ins * 66 * solar + greenhouse;

      // Altitude lapse rate: high land is colder.
      if (elevation[i] > 0) target -= elevation[i] * 26;

      // Ice-albedo feedback: existing ice reflects sunlight and self-cools.
      target -= ice[i] * TUNE.iceAlbedoCooling;

      // Oceans have huge thermal inertia -> move slowly toward target.
      const inertia = elevation[i] < 0 ? TUNE.oceanInertia : 0.55;
      temp[i] += (target - temp[i]) * (1 - inertia);

      // Ice formation / melt around the freeze point (hysteresis-ish).
      if (temp[i] < TUNE.freezePoint) {
        ice[i] = Math.min(1, ice[i] + (TUNE.freezePoint - temp[i]) * 0.05);
      } else {
        ice[i] = Math.max(0, ice[i] - (temp[i] - TUNE.freezePoint) * 0.06);
      }
    }
  }

  // Lateral heat diffusion — smooths climate so bands look natural.
  diffuse(sim, temp, 0.10);

  // Rainfall (display + biosphere input): warm + moist + near water = wet.
  for (let i = 0; i < n; i++) {
    const t = temp[i];
    const warmth = Math.max(0, Math.min(1, (t + 5) / 35));
    w.rainfall[i] = Math.min(1, w.moisture[i] * (0.5 + warmth * 0.7));
  }

  updateGases(sim);
  recomputeGlobals(sim);
}

// Simple 4-neighbour diffusion with X-wrap; used for temperature bands.
function diffuse(sim, arr, k) {
  const w = sim.world;
  const out = new Float32Array(arr.length);
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      const i = y * w.w + x;
      let s = arr[i] * 4, c = 4;
      s += arr[w.idx(x + 1, y)] + arr[w.idx(x - 1, y)]; c += 2;
      if (y > 0) { s += arr[w.idx(x, y - 1)]; c++; }
      if (y < w.h - 1) { s += arr[w.idx(x, y + 1)]; c++; }
      out[i] = arr[i] + (s / c - arr[i]) * k;
    }
  }
  arr.set(out);
}

// Global gas budget: life pulls CO2 -> O2; volcanism & civ push CO2 up.
function updateGases(sim) {
  const w = sim.world;
  let photosynth = 0, respire = 0, pollute = 0;
  const n = w.w * w.h;
  for (let i = 0; i < n; i++) {
    const l = w.life[i];
    if (l >= 2) { // algae and up photosynthesize
      photosynth += w.biomass[i];
      respire += w.biomass[i] * 0.3;
    }
    pollute += w.pollution[i];
  }
  // Scale by grid size so tuning is resolution-independent.
  const scale = 1 / (n * 0.05);
  sim.co2 -= photosynth * TUNE.photosynthesisRate * scale;
  sim.co2 += respire * TUNE.respirationRate * scale;
  sim.o2 += photosynth * 0.02 * scale;
  sim.o2 = Math.max(0, Math.min(35, sim.o2 - 0.01));
  sim.co2 += pollute * 0.4 * scale;
  // Slow drift back toward a weak equilibrium so nothing runs away instantly.
  sim.co2 = Math.max(4, sim.co2);
}

function recomputeGlobals(sim) {
  const w = sim.world;
  const n = w.w * w.h;
  let tSum = 0, iceSum = 0, seaCells = 0;
  for (let i = 0; i < n; i++) {
    tSum += w.temp[i];
    iceSum += w.ice[i];
    if (w.elevation[i] < 0) seaCells++;
  }
  sim.globalTemp = tSum / n;
  sim.iceCover = iceSum / n;
  sim.oceanFraction = seaCells / n;
}
