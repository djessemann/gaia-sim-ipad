// Biosphere: life spreads across suitable cells and climbs the evolution
// ladder over time. Life feeds back on climate via the gas budget (atmosphere).

import { LIFE, LIFE_TRAITS } from './config.js';

// How habitable a cell is for a given life class right now (0..1).
function habitability(w, i, cls) {
  const tr = LIFE_TRAITS[cls];
  if (!tr) return 0;
  const ocean = w.elevation[i] < 0;
  if (tr.aquatic === true && !ocean) return 0;
  if (tr.aquatic === false && ocean) return 0;
  if (w.ice[i] > 0.6) return 0; // frozen solid — too harsh

  const t = w.temp[i];
  if (t < tr.tMin || t > tr.tMax) return 0;
  const band = tr.tMax - tr.tMin;
  const mid = (tr.tMin + tr.tMax) / 2;
  const tScore = 1 - Math.abs(t - mid) / (band / 2);

  const moist = ocean ? 1 : w.rainfall[i];
  const mScore = tr.moist === 0 ? 1 : Math.min(1, moist / (tr.moist + 0.001));

  return Math.max(0, tScore) * Math.max(0, Math.min(1, mScore));
}

export function updateLife(sim) {
  const w = sim.world;
  const n = w.w * w.h;
  const nextLife = w.life.slice();
  const nextBio = w.biomass.slice();

  // Global evolution pressure: unlocks higher classes as the planet ages and
  // oxygen accumulates (multicellular life needed an oxygenated atmosphere).
  const maxClass = evolutionCeiling(sim);

  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      const i = y * w.w + x;
      const cls = w.life[i];

      if (cls === LIFE.NONE) {
        // Colonize from a living neighbour if this cell is habitable for it.
        const src = pickLivingNeighbour(w, x, y);
        if (src >= 0) {
          const scls = w.life[src];
          if (habitability(w, i, scls) > 0.25 && Math.random() < 0.35) {
            nextLife[i] = scls;
            nextBio[i] = 0.05;
          }
        }
        continue;
      }

      const hab = habitability(w, i, cls);
      if (hab <= 0) {
        // Environment turned hostile — biomass collapses, maybe die off.
        nextBio[i] = w.biomass[i] - 0.08;
        if (nextBio[i] <= 0) { nextLife[i] = LIFE.NONE; nextBio[i] = 0; }
        continue;
      }

      // Grow biomass toward the cell's carrying capacity (its habitability).
      nextBio[i] = Math.min(hab, w.biomass[i] + hab * 0.06 + 0.01);

      // Evolve upward when well-established and the ceiling allows it.
      if (cls < maxClass && nextBio[i] > 0.6 && Math.random() < 0.02) {
        const up = cls + 1;
        if (habitability(w, i, up) > 0.3) {
          nextLife[i] = up;
          nextBio[i] = 0.35;
        }
      }
    }
  }

  w.life.set(nextLife);
  w.biomass.set(nextBio);

  recomputeBio(sim);
}

// Highest life class currently permitted, gated on planet age + oxygen.
function evolutionCeiling(sim) {
  const age = sim.year;
  const o2 = sim.o2;
  let ceil = LIFE.MICROBE;
  if (age > 5e8) ceil = LIFE.ALGAE;
  if (o2 > 5 && age > 1e9) ceil = LIFE.PLANT;
  if (o2 > 8 && age > 1.5e9) ceil = LIFE.INVERT;
  if (o2 > 12 && age > 2e9) ceil = LIFE.FISH;
  if (o2 > 15 && age > 2.5e9) ceil = LIFE.REPTILE;
  if (o2 > 17 && age > 3e9) ceil = LIFE.MAMMAL;
  if (o2 > 18 && age > 3.5e9) ceil = LIFE.SENTIENT;
  return ceil;
}

function pickLivingNeighbour(w, x, y) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  // shuffle-lite: start at a random offset for organic spread
  const off = (Math.random() * 8) | 0;
  for (let k = 0; k < 8; k++) {
    const [dx, dy] = dirs[(k + off) % 8];
    const yy = y + dy;
    if (yy < 0 || yy >= w.h) continue;
    const j = w.idx(x + dx, yy);
    if (w.life[j] !== LIFE.NONE && w.biomass[j] > 0.2) return j;
  }
  return -1;
}

function recomputeBio(sim) {
  const w = sim.world;
  const n = w.w * w.h;
  let total = 0, living = 0, dominant = 0;
  const counts = new Array(9).fill(0);
  for (let i = 0; i < n; i++) {
    if (w.life[i] !== LIFE.NONE) {
      living++;
      total += w.biomass[i];
      counts[w.life[i]] += w.biomass[i];
    }
  }
  for (let c = 1; c <= 8; c++) if (counts[c] > counts[dominant]) dominant = c;
  sim.biomass = total / n;
  sim.livingFraction = living / n;
  sim.dominantLife = dominant;
}
