// Geosphere: volcanoes (build land + emit CO2), erosion, and slow sea-level
// response to ice. Plate drift is represented lightly as volcano-prone zones.

import { TUNE } from './config.js';

export function updateGeo(sim) {
  const w = sim.world;
  const n = w.w * w.h;

  // Occasional volcanoes, biased toward plate-boundary-ish high-plate-id cells.
  const eruptions = Math.random() < TUNE.volcanoBaseChance ? 1 + (Math.random() * 3 | 0) : 0;
  for (let e = 0; e < eruptions; e++) {
    const i = (Math.random() * n) | 0;
    // Prefer land or shallow sea near a "hot" plate zone.
    if (w.plate[i] >= 5 || w.elevation[i] > 0.1) {
      eruptAt(sim, i);
    }
  }

  // Erosion: land slowly wears down toward the sea; sediment fills shallows.
  for (let i = 0; i < n; i++) {
    if (w.elevation[i] > 0) {
      w.elevation[i] -= w.elevation[i] * TUNE.erosionRate * 0.04 * w.rainfall[i];
    }
  }

  // Sea level responds to ice locking up water: more ice -> lower seas.
  // Modeled as a global elevation offset applied at render/query time via seaLevel.
  const targetSea = -sim.iceCover * 0.12;
  sim.seaLevel += (targetSea - sim.seaLevel) * 0.05;
}

export function eruptAt(sim, i) {
  const w = sim.world;
  w.elevation[i] = Math.min(1, Math.max(w.elevation[i], 0.05) + 0.25);
  // Push up neighbours a little to build a cone.
  const x = i % w.w, y = (i / w.w) | 0;
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const yy = y + dy; if (yy < 0 || yy >= w.h) continue;
    const j = w.idx(x + dx, yy);
    w.elevation[j] = Math.min(1, w.elevation[j] + 0.08);
  }
  // Fresh lava sterilizes the cell and belches CO2.
  w.life[i] = 0; w.biomass[i] = 0;
  sim.co2 += TUNE.co2FromVolcano;
  sim.lastEruption = { i, t: sim.tick };
}
