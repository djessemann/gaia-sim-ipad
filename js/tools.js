// Player tools. Each has an energy cost and an apply() that mutates the world
// at a grid cell (drag-painted from input.js). Some are "global" panel actions.

import { LIFE, TUNE } from './config.js';
import { eruptAt } from './geosphere.js';

export const TOOLS = [
  { id: 'examine',  name: 'Examine', icon: 'examine', cost: 0,  radius: 0, desc: 'Probe a cell' },
  { id: 'raise',    name: 'Raise',   icon: 'raise',   cost: 4,  radius: 1, desc: 'Push land up' },
  { id: 'lower',    name: 'Lower',   icon: 'lower',   cost: 4,  radius: 1, desc: 'Dig / flood' },
  { id: 'water',    name: 'Water',   icon: 'water',   cost: 3,  radius: 1, desc: 'Add ocean' },
  { id: 'life',     name: 'Seed',    icon: 'seed',    cost: 6,  radius: 1, desc: 'Seed microbes' },
  { id: 'forest',   name: 'Forest',  icon: 'forest',  cost: 10, radius: 1, desc: 'Plant flora' },
  { id: 'volcano',  name: 'Volcano', icon: 'volcano', cost: 25, radius: 0, desc: 'Erupt: land + CO2' },
  { id: 'meteor',   name: 'Meteor',  icon: 'meteor',  cost: 60, radius: 2, desc: 'Impact & dust' },
  { id: 'warm',     name: 'Warm',    icon: 'warm',    cost: 8,  radius: 1, desc: 'Inject CO2 heat' },
  { id: 'cool',     name: 'Cool',    icon: 'cool',    cost: 8,  radius: 1, desc: 'Scrub CO2' },
];

// Apply a tool at (x,y). Returns an info object for the Examine tool, else null.
export function applyTool(sim, toolId, x, y) {
  const w = sim.world;
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return null;

  if (toolId === 'examine') return examine(sim, x, y);

  if (!sim.spend(tool.cost)) return { error: 'Out of energy' };

  const cells = disc(w, x, y, tool.radius);
  switch (toolId) {
    case 'raise':
      for (const i of cells) w.elevation[i] = Math.min(1, w.elevation[i] + 0.12);
      break;
    case 'lower':
      for (const i of cells) w.elevation[i] = Math.max(-1, w.elevation[i] - 0.12);
      break;
    case 'water':
      for (const i of cells) { w.elevation[i] = Math.min(w.elevation[i], -0.15); w.ice[i] = 0; }
      break;
    case 'life':
      for (const i of cells) {
        if (w.elevation[i] < 0.6 && w.ice[i] < 0.6 && w.life[i] === LIFE.NONE) {
          w.life[i] = LIFE.MICROBE; w.biomass[i] = 0.2;
        }
      }
      break;
    case 'forest':
      for (const i of cells) {
        if (w.elevation[i] >= 0 && w.elevation[i] < 0.6 && w.ice[i] < 0.4) {
          w.life[i] = LIFE.PLANT; w.biomass[i] = 0.4; w.moisture[i] = Math.min(1, w.moisture[i] + 0.2);
        }
      }
      break;
    case 'volcano':
      eruptAt(sim, w.idx(x, y));
      break;
    case 'meteor':
      meteor(sim, x, y, cells);
      break;
    case 'warm':
      sim.co2 += 30;
      for (const i of cells) w.temp[i] += 8;
      break;
    case 'cool':
      sim.co2 = Math.max(4, sim.co2 - 30);
      for (const i of cells) w.temp[i] -= 8;
      break;
  }
  return null;
}

function meteor(sim, x, y, cells) {
  const w = sim.world;
  const center = w.idx(x, y);
  w.elevation[center] = Math.max(-1, w.elevation[center] - 0.4); // crater
  for (const i of cells) { w.life[i] = LIFE.NONE; w.biomass[i] = 0; w.city[i] = 0; }
  // Impact winter: global dust cooling + a CO2 spike from the strike.
  sim.solar = Math.max(0.6, sim.solar - 0.12);
  sim.co2 += 40;
  sim.meteorWinter = sim.tick + 30; // main loop can recover solar over time
}

function examine(sim, x, y) {
  const w = sim.world;
  const i = w.idx(x, y);
  return {
    examine: true, x, y,
    elevation: w.elevation[i],
    temp: w.temp[i],
    rainfall: w.rainfall[i],
    ice: w.ice[i],
    life: w.life[i],
    biomass: w.biomass[i],
    pollution: w.pollution[i],
    city: !!w.city[i],
    ocean: w.elevation[i] < 0,
    lat: Math.round(w.latitude(y)),
  };
}

// Cells within `radius` of (x,y), wrapping in X, clamped in Y.
function disc(w, x, y, radius) {
  const out = [];
  for (let dy = -radius; dy <= radius; dy++) {
    const yy = y + dy; if (yy < 0 || yy >= w.h) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius + 1) continue;
      out.push(w.idx(x + dx, yy));
    }
  }
  return out;
}
