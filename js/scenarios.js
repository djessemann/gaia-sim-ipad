// Starting scenarios — preset planets that showcase different feedback regimes.

import { LIFE, TUNE } from './config.js';

export const SCENARIOS = [
  {
    id: 'earth', name: 'Young Earth',
    desc: 'A watery world fresh from formation. Nurse it to life.',
    seaLevel: 0.62,
    setup(sim) { sim.co2 = 900; sim.o2 = 0.3; sim.solar = 1.0; seedMicrobes(sim, 30); },
  },
  {
    id: 'aquarium', name: 'Aquarium',
    desc: 'Almost all ocean. Perfect for evolving sea life.',
    seaLevel: 0.90,
    setup(sim) { sim.co2 = 500; sim.o2 = 2; sim.solar = 1.0; seedMicrobes(sim, 80); },
  },
  {
    id: 'snowball', name: 'Snowball',
    desc: 'A frozen planet gripped by ice-albedo feedback. Thaw it.',
    seaLevel: 0.60,
    setup(sim) { sim.co2 = 180; sim.o2 = 5; sim.solar = 0.82;
      for (let i = 0; i < sim.world.temp.length; i++) { sim.world.temp[i] = -40; sim.world.ice[i] = 1; } },
  },
  {
    id: 'venus', name: 'Runaway',
    desc: 'A choking greenhouse. Can you cool it before it bakes?',
    seaLevel: 0.35,
    setup(sim) { sim.co2 = 4000; sim.o2 = 0; sim.solar = 1.15; },
  },
  {
    id: 'mars', name: 'Red Desert',
    desc: 'Cold, dry, thin air. A terraforming challenge.',
    seaLevel: 0.15,
    setup(sim) { sim.co2 = 120; sim.o2 = 0; sim.solar = 0.72; },
  },
];

function seedMicrobes(sim, count) {
  const w = sim.world;
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 50) {
    const i = (Math.random() * w.w * w.h) | 0;
    if (w.elevation[i] < 0 && w.ice[i] < 0.5) {
      w.life[i] = LIFE.MICROBE; w.biomass[i] = 0.3; placed++;
    }
  }
}

export function startScenario(sim, scenario, seed) {
  sim.newPlanet(seed, scenario.seaLevel);
  scenario.setup(sim);
}
