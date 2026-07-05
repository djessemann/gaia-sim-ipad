// Civilization: once sentient life exists, settlements appear, spread, and
// advance through technology ages. Industry pumps out pollution — the classic
// SimEarth twist where your smartest species can wreck the biosphere.

import { LIFE, TECH_AGES, TUNE } from './config.js';

export function updateCiv(sim) {
  const w = sim.world;
  const n = w.w * w.h;

  // Count sentient presence; found first cities where sentient life thrives.
  let sentientCells = 0, cities = 0;
  for (let i = 0; i < n; i++) {
    if (w.life[i] === LIFE.SENTIENT && w.biomass[i] > 0.5) {
      sentientCells++;
      if (!w.city[i] && Math.random() < 0.01) { w.city[i] = 1; }
    }
    if (w.city[i]) {
      cities++;
      // Cities can't survive if their sentient host died out or froze over.
      if (w.life[i] !== LIFE.SENTIENT || w.ice[i] > 0.5) {
        if (Math.random() < 0.2) w.city[i] = 0;
      }
    }
  }

  if (!sim.civStarted && cities > 0) {
    sim.civStarted = true;
    sim.civBirthYear = sim.year;
  }

  // Advance tech age as cities accumulate.
  if (cities > 0) {
    sim.civProgress += cities * 0.0006;
    const age = Math.min(TECH_AGES.length - 1, Math.floor(sim.civProgress));
    sim.techAge = age;

    // Industrial age onward: pollution accumulates around cities.
    if (age >= 3) {
      for (let i = 0; i < n; i++) {
        if (w.city[i]) {
          const dose = (age - 2) * TUNE.civPollutionPerTech * 0.002;
          spread(w, i, dose);
        }
      }
    }
  }

  // Pollution slowly decays (scrubbed by biosphere / rainout).
  for (let i = 0; i < n; i++) {
    if (w.pollution[i] > 0) w.pollution[i] = Math.max(0, w.pollution[i] - 0.004);
  }

  sim.cities = cities;
  sim.sentientCells = sentientCells;
}

function spread(w, i, dose) {
  w.pollution[i] = Math.min(1, w.pollution[i] + dose);
  const x = i % w.w, y = (i / w.w) | 0;
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const yy = y + dy; if (yy < 0 || yy >= w.h) continue;
    const j = w.idx(x + dx, yy);
    w.pollution[j] = Math.min(1, w.pollution[j] + dose * 0.4);
  }
}
