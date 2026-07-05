// GAIA — global configuration, tuning constants, and the locked VGA-era palette.
// Everything here is deliberately data-only so the sim + renderer read from one source.

export const GRID = {
  W: 72,          // longitude cells (wraps horizontally)
  H: 44,          // latitude cells (pole to pole)
};

// ---------------------------------------------------------------------------
// Locked ~90s palette. Hand-picked, dithered against each other by the renderer.
// ---------------------------------------------------------------------------
export const PAL = {
  deepOcean:   '#12306b',
  ocean:       '#1d4a94',
  shallow:     '#2f6fbf',
  coast:       '#e2cf8f',
  beach:       '#d8c070',
  lowland:     '#4f9a3f',
  grass:       '#5fb14a',
  forest:      '#2f7d34',
  hills:       '#8a7a3a',
  mountain:    '#8f7a63',
  peak:        '#c9bfae',
  snow:        '#f4f4f8',
  ice:         '#cfe4f2',
  seaIce:      '#a9c8dd',
  desert:      '#cda95f',
  tundra:      '#9aa08a',
  swamp:       '#516b3a',
  lava:        '#e8622a',
  magma:       '#f2a63c',
  // UI chrome (Win3.1 / System 7 grey)
  panel:       '#c3c3c3',
  panelLight:  '#efefef',
  panelDark:   '#7f7f7f',
  panelShadow: '#5a5a5a',
  ink:         '#1a1a2e',
  screen:      '#0d140d',
  screenGrid:  '#16281a',
  accent:      '#2f6fbf',
  hot:         '#e8622a',
  cold:        '#5fa8d3',
  life:        '#5fb14a',
  warn:        '#e8b23a',
};

// Life classes — the evolution ladder (SimEarth-style biosphere progression).
export const LIFE = {
  NONE:      0,
  MICROBE:   1,   // prokaryotes / pond scum
  ALGAE:     2,   // photosynthesis kicks in hard
  PLANT:     3,   // land plants
  INVERT:    4,   // invertebrates
  FISH:      5,   // fish & amphibians
  REPTILE:   6,   // reptiles / dinosaurs
  MAMMAL:    7,   // mammals & birds
  SENTIENT:  8,   // tool-using intelligence -> civilization
};

export const LIFE_NAMES = [
  'Barren', 'Microbes', 'Algae', 'Plants', 'Invertebrates',
  'Fish & Amphibians', 'Reptiles', 'Mammals', 'Sentient Life',
];

// Each life class: preferred temperature band (°C), moisture need, whether it
// needs land or water, and the biomass tint used on the Biome layer.
export const LIFE_TRAITS = {
  [LIFE.MICROBE]:  { tMin: -15, tMax: 65, moist: 0.0, aquatic: null, tint: '#7a8a5a' },
  [LIFE.ALGAE]:    { tMin: -5,  tMax: 45, moist: 0.2, aquatic: true, tint: '#3f9a6a' },
  [LIFE.PLANT]:    { tMin: 0,   tMax: 42, moist: 0.35, aquatic: false, tint: '#5fb14a' },
  [LIFE.INVERT]:   { tMin: 2,   tMax: 40, moist: 0.3, aquatic: null, tint: '#8a9a3a' },
  [LIFE.FISH]:     { tMin: 0,   tMax: 36, moist: 0.5, aquatic: true, tint: '#4a8ac0' },
  [LIFE.REPTILE]:  { tMin: 12,  tMax: 42, moist: 0.25, aquatic: false, tint: '#7d8a3f' },
  [LIFE.MAMMAL]:   { tMin: -10, tMax: 38, moist: 0.3, aquatic: false, tint: '#b07a4a' },
  [LIFE.SENTIENT]: { tMin: -8,  tMax: 36, moist: 0.3, aquatic: false, tint: '#d84a4a' },
};

// Civilization technology ages.
export const TECH_AGES = [
  'Stone Age', 'Bronze Age', 'Iron Age', 'Industrial Age',
  'Atomic Age', 'Information Age', 'Nanotech Age',
];

// Physical / model tuning. These are gameplay knobs, not real climatology,
// chosen so feedback loops are visible on a human timescale.
export const TUNE = {
  seaLevelPct: 0.60,     // fraction of the planet below sea level at genesis
  baseSolar: 1.0,        // solar multiplier (player-adjustable)
  greenhousePerCO2: 0.020, // °C added per ppm-ish of CO2 above baseline
  co2Baseline: 280,
  co2Genesis: 900,       // early hot CO2-rich atmosphere
  freezePoint: 0,        // °C below which surface water becomes ice
  iceAlbedoCooling: 14,  // °C of cooling a fully iced cell contributes to itself
  oceanInertia: 0.85,    // oceans resist temperature change
  volcanoBaseChance: 0.02,
  erosionRate: 0.02,
  co2FromVolcano: 6,
  photosynthesisRate: 0.9, // CO2 pulled per algae/plant cell per tick (scaled)
  respirationRate: 0.15,
  civPollutionPerTech: 3.5,
  startEnergy: 500,
  maxEnergy: 2000,
  energyRegen: 2.5,
};

// Time scales — how many simulated years pass per tick, and the label shown.
export const TIMESCALES = [
  { name: 'Geologic',   yearsPerTick: 500000, label: 'MY' },
  { name: 'Evolution',  yearsPerTick: 10000,  label: 'KY' },
  { name: 'Civilized',  yearsPerTick: 100,    label: 'CY' },
  { name: 'Experiment', yearsPerTick: 5,      label: 'YR' },
];

// Simulation speeds (ticks per second target).
export const SPEEDS = [
  { name: 'Pause', tps: 0 },
  { name: 'Slow',  tps: 3 },
  { name: 'Fast',  tps: 10 },
  { name: 'Turbo', tps: 30 },
];
