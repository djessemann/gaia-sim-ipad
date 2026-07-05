// Master simulation: owns global planetary state and advances every subsystem
// one tick. Also computes the "Gaia health" score — how well-balanced the
// planet's life-supporting systems are.

import { World } from './world.js';
import { updateClimate } from './atmosphere.js';
import { updateLife } from './biosphere.js';
import { updateGeo } from './geosphere.js';
import { updateCiv } from './civilization.js';
import { TUNE, TIMESCALES, LIFE } from './config.js';

export class Simulation {
  constructor() {
    this.world = new World();
    this.reset();
  }

  reset() {
    // Global atmosphere / state.
    this.co2 = TUNE.co2Genesis;
    this.o2 = 0.5;
    this.solar = TUNE.baseSolar;
    this.seaLevel = 0;
    this.year = 0;              // planet age in years
    this.tick = 0;
    this.timescale = 0;         // index into TIMESCALES

    // Derived globals (filled by subsystems).
    this.globalTemp = 15;
    this.iceCover = 0;
    this.oceanFraction = 0.6;
    this.biomass = 0;
    this.livingFraction = 0;
    this.dominantLife = 0;

    // Civilization.
    this.civStarted = false;
    this.civBirthYear = 0;
    this.civProgress = 0;
    this.techAge = 0;
    this.cities = 0;
    this.sentientCells = 0;

    // Player economy.
    this.energy = TUNE.startEnergy;

    this.gaia = 50;
    this.lastEruption = null;
  }

  newPlanet(seed, seaLevelPct) {
    this.reset();
    this.world.generate(seed >>> 0, seaLevelPct);
    // Prime temperatures so the first frame isn't uniformly zero.
    for (let y = 0; y < this.world.h; y++) {
      const ins = this.world.insolation(y);
      for (let x = 0; x < this.world.w; x++) {
        this.world.temp[y * this.world.w + x] = -18 + ins * 66;
      }
    }
  }

  step() {
    this.tick++;
    this.year += TIMESCALES[this.timescale].yearsPerTick;

    updateGeo(this);
    updateClimate(this);
    updateLife(this);
    updateCiv(this);

    // Energy regenerates over time up to a cap.
    this.energy = Math.min(TUNE.maxEnergy, this.energy + TUNE.energyRegen);

    this.computeGaia();
  }

  spend(cost) {
    if (this.energy >= cost) { this.energy -= cost; return true; }
    return false;
  }

  // Gaia health: rewards a temperate climate, liquid water, thriving diverse
  // life, and balanced gases; punishes runaway heat/cold and heavy pollution.
  computeGaia() {
    const t = this.globalTemp;
    const tempScore = clamp(1 - Math.abs(t - 15) / 40, 0, 1);         // best ~15°C
    const waterScore = clamp(1 - Math.abs(this.oceanFraction - 0.6) / 0.6, 0, 1);
    const lifeScore = clamp(this.livingFraction * 1.5, 0, 1);
    const o2Score = clamp(this.o2 / 21, 0, 1);
    let pollute = 0;
    const n = this.world.w * this.world.h;
    for (let i = 0; i < n; i++) pollute += this.world.pollution[i];
    const pollScore = clamp(1 - (pollute / n) * 3, 0, 1);

    const raw = (tempScore * 0.3 + waterScore * 0.15 + lifeScore * 0.3 +
                 o2Score * 0.15 + pollScore * 0.1) * 100;
    // Smooth so the meter doesn't jitter.
    this.gaia += (raw - this.gaia) * 0.1;
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
