/* =====================================================================
 * GAIA — The Living Planet
 * config.js — game data tables: biomes, life, technology, tools, scenarios
 *
 * A from-scratch homage to the planetary-simulation genre pioneered by
 * SimEarth (Maxis, 1990) and the Gaia hypothesis of James Lovelock.
 * All data, formulas and artwork here are original.
 * ===================================================================== */
(function (global) {
  'use strict';

  const GAIA = global.GAIA || (global.GAIA = {});

  // ---- World dimensions -------------------------------------------------
  const CONFIG = {
    GRID_W: 64,          // columns (wraps horizontally — a cylinder)
    GRID_H: 40,          // rows (poles top/bottom)
    SEA_LEVEL: 0.0,      // altitude at/below this is ocean

    // Atmosphere baselines (Earth-like, in arbitrary game units)
    GASES: {
      CO2:   { name: 'Carbon Dioxide', earth: 360,  unit: 'ppm', color: '#c98b3b' },
      O2:    { name: 'Oxygen',         earth: 21,   unit: '%',   color: '#56b0e6' },
      N2:    { name: 'Nitrogen',       earth: 78,   unit: '%',   color: '#9aa7b5' },
      VAPOR: { name: 'Water Vapor',    earth: 1.0,  unit: 'rel', color: '#d7e6f2' }
    },

    SOLAR_EARTH: 1.0,    // relative solar constant
    GREENHOUSE_K: 0.020, // °C per ppm CO2 (above/below baseline, log-damped)

    STARTING_ENERGY: 60000,
    MAX_ENERGY: 200000
  };

  // ---- Time scales ------------------------------------------------------
  // Each scale advances the clock by a different number of years per tick
  // and only runs certain simulation models, mirroring the original's
  // geologic → evolution → civilization → technology progression.
  const TIMESCALES = [
    { id: 'geologic',     name: 'Geologic',     years: 500000, tickMs: 120,
      desc: 'Billions of years. Plate tectonics & terraforming.' },
    { id: 'evolution',    name: 'Evolution',    years: 10000,  tickMs: 120,
      desc: 'Millions of years. Life evolves & spreads.' },
    { id: 'civilization', name: 'Civilization', years: 200,    tickMs: 140,
      desc: 'Thousands of years. Intelligent life builds.' },
    { id: 'technology',   name: 'Technology',   years: 5,      tickMs: 160,
      desc: 'Years. The age of cities and machines.' }
  ];

  const SPEEDS = [
    { id: 'pause', name: 'II', mult: 0 },
    { id: 'slow',  name: '▶', mult: 1 },
    { id: 'fast',  name: '▶▶', mult: 3 },
    { id: 'ffwd',  name: '▶▶▶', mult: 8 }
  ];

  // ---- Biomes -----------------------------------------------------------
  // Terrain/vegetation classes. Determined by temperature + rainfall on
  // land (a Whittaker-style classification). Ocean tiles use depth shades.
  const BIOME = {
    OCEAN:   { id: 'OCEAN',   name: 'Ocean',     land: false, color: '#1d3f73', habit: 'sea' },
    SHALLOWS:{ id: 'SHALLOWS',name: 'Shallows',  land: false, color: '#2f6aa6', habit: 'sea' },
    ROCK:    { id: 'ROCK',    name: 'Rock',      land: true,  color: '#8d8576', biomass: 0.0 },
    ICE:     { id: 'ICE',     name: 'Arctic',    land: true,  color: '#e8f1f7', biomass: 0.02, albedo: 0.62 },
    TUNDRA:  { id: 'TUNDRA',  name: 'Tundra',    land: true,  color: '#9fae8e', biomass: 0.15, albedo: 0.30 },
    BOREAL:  { id: 'BOREAL',  name: 'Boreal',    land: true,  color: '#3f6b4f', biomass: 0.45, albedo: 0.14 },
    DESERT:  { id: 'DESERT',  name: 'Desert',    land: true,  color: '#d8c187', biomass: 0.05, albedo: 0.38 },
    GRASS:   { id: 'GRASS',   name: 'Grassland', land: true,  color: '#8fbf5a', biomass: 0.40, albedo: 0.22 },
    FOREST:  { id: 'FOREST',  name: 'Forest',    land: true,  color: '#4f9e44', biomass: 0.70, albedo: 0.13 },
    JUNGLE:  { id: 'JUNGLE',  name: 'Jungle',    land: true,  color: '#2f7d2f', biomass: 0.95, albedo: 0.11 },
    SWAMP:   { id: 'SWAMP',   name: 'Swamp',     land: true,  color: '#5d7a4a', biomass: 0.80, albedo: 0.12 }
  };

  // ---- Life classes -----------------------------------------------------
  // Each life class lives in a habitat (sea/land), evolves through levels,
  // and has an "intelligence potential" (chance to gain sentience).
  // Order roughly follows the deep-time progression of the original.
  const LIFE = [
    // --- Sea life (7) ---
    { id: 'PROKARYOTE', name: 'Prokaryotes', habit: 'sea',  tier: 0, glyph: '·', color: '#9fe0c0', iq: 0.00, next: ['EUKARYOTE'] },
    { id: 'EUKARYOTE',  name: 'Eukaryotes',  habit: 'sea',  tier: 1, glyph: '∘', color: '#7fd6b0', iq: 0.00, next: ['RADIATE','ARTHROPOD'] },
    { id: 'RADIATE',    name: 'Radiates',    habit: 'sea',  tier: 2, glyph: '✱', color: '#e88fb0', iq: 0.05, next: ['TRICHORDATE'] },
    { id: 'ARTHROPOD',  name: 'Arthropods',  habit: 'sea',  tier: 2, glyph: '❀', color: '#c98b3b', iq: 0.08, next: ['MOLLUSK','FISH'] },
    { id: 'MOLLUSK',    name: 'Mollusks',    habit: 'sea',  tier: 3, glyph: '♋', color: '#c0a0e0', iq: 0.10, next: ['FISH'] },
    { id: 'FISH',       name: 'Fish',        habit: 'sea',  tier: 4, glyph: '➤', color: '#56b0e6', iq: 0.12, next: ['AMPHIBIAN','TRICHORDATE','CETACEAN'] },
    { id: 'CETACEAN',   name: 'Cetaceans',   habit: 'sea',  tier: 6, glyph: '∿', color: '#3a86c8', iq: 0.55, next: [] },
    // --- Land life (7) ---
    { id: 'AMPHIBIAN',  name: 'Amphibians',  habit: 'land', tier: 5, glyph: '❦', color: '#7fae5a', iq: 0.15, next: ['REPTILE','INSECT'] },
    { id: 'INSECT',     name: 'Insects',     habit: 'land', tier: 5, glyph: '⁕', color: '#b59030', iq: 0.20, next: ['CARNIFERN'] },
    { id: 'REPTILE',    name: 'Reptiles',    habit: 'land', tier: 6, glyph: '⧓', color: '#6fae4a', iq: 0.30, next: ['DINOSAUR','MAMMAL','BIRD'] },
    { id: 'DINOSAUR',   name: 'Dinosaurs',   habit: 'land', tier: 7, glyph: 'ᾙ6', color: '#8f7a3a', iq: 0.40, next: ['BIRD'] },
    { id: 'BIRD',       name: 'Birds',       habit: 'land', tier: 7, glyph: 'ὂ6', color: '#d68b56', iq: 0.45, next: [] },
    { id: 'MAMMAL',     name: 'Mammals',     habit: 'land', tier: 7, glyph: '☼', color: '#c87a5a', iq: 0.70, next: [] },
    { id: 'CARNIFERN',  name: 'Carniferns',  habit: 'land', tier: 6, glyph: '⚘', color: '#3f9e6f', iq: 0.35, next: [] },
    { id: 'TRICHORDATE',name: 'Trichordates',habit: 'sea',  tier: 6, glyph: '☸', color: '#b06fc8', iq: 0.50, next: [] }
  ];
  const LIFE_BY_ID = {};
  LIFE.forEach(l => { LIFE_BY_ID[l.id] = l; });

  // ---- Civilization technology ages (7) --------------------------------
  const TECH = [
    { id: 0, name: 'Stone Age',    color: '#b58b5a', pollute: 0.2, spread: 0.30, advance: 0.010 },
    { id: 1, name: 'Bronze Age',   color: '#c79a4a', pollute: 0.6, spread: 0.40, advance: 0.012 },
    { id: 2, name: 'Iron Age',     color: '#9aa0a8', pollute: 1.2, spread: 0.55, advance: 0.013 },
    { id: 3, name: 'Industrial',   color: '#7d6b58', pollute: 4.0, spread: 0.75, advance: 0.014 },
    { id: 4, name: 'Atomic Age',   color: '#e0d24a', pollute: 5.5, spread: 0.90, advance: 0.012 },
    { id: 5, name: 'Information',  color: '#4ad0e0', pollute: 2.0, spread: 1.00, advance: 0.011 },
    { id: 6, name: 'Nanotech Age', color: '#c04ae0', pollute: 0.4, spread: 1.10, advance: 0.009 }
  ];

  // ---- Tools (toolbar) --------------------------------------------------
  // cost is in Ω (omega energy). category groups them for the UI palette.
  const TOOLS = [
    // Inspect / camera
    { id: 'examine',  name: 'Examine',     cat: 'view',   cost: 0,    icon: '⌖', hint: 'Tap a tile to inspect it.' },

    // Geosphere
    { id: 'raise',    name: 'Raise Land',  cat: 'geo',    cost: 50,   icon: '▲', hint: 'Push the crust upward.' },
    { id: 'lower',    name: 'Lower Land',  cat: 'geo',    cost: 50,   icon: '▼', hint: 'Sink the crust.' },
    { id: 'volcano',  name: 'Volcano',     cat: 'geo',    cost: 1000, icon: '△', hint: 'Erupt — builds land, vents CO₂.' },
    { id: 'quake',    name: 'Earthquake',  cat: 'geo',    cost: 400,  icon: '↝', hint: 'Shake the crust, damage cities.' },
    { id: 'meteor',   name: 'Meteor',      cat: 'geo',    cost: 2000, icon: '☄', hint: 'Impact event — craters & dust.' },

    // Atmosphere
    { id: 'co2',      name: 'CO₂ Gen', cat: 'atmo',  cost: 500,  icon: 'C', hint: 'Vent carbon dioxide — warms planet.' },
    { id: 'o2',       name: 'O₂ Gen',  cat: 'atmo',  cost: 500,  icon: 'O', hint: 'Release oxygen — cools, aids animals.' },
    { id: 'n2',       name: 'N₂ Gen',  cat: 'atmo',  cost: 500,  icon: 'N', hint: 'Release nitrogen — buffers pressure.' },
    { id: 'vapor',    name: 'Water Vapor', cat: 'atmo',   cost: 500,  icon: '≈', hint: 'Add humidity — more rain.' },
    { id: 'rain',     name: 'Rain',        cat: 'atmo',   cost: 100,  icon: '☂', hint: 'Force rainfall here.' },
    { id: 'fire',     name: 'Fire',        cat: 'atmo',   cost: 200,  icon: '♨', hint: 'Wildfire — clears biome, vents CO₂.' },

    // Biosphere
    { id: 'biome',    name: 'Biome',       cat: 'bio',    cost: 500,  icon: '☘', hint: 'Seed vegetation to suit the climate.' },
    { id: 'monolith', name: 'Monolith',    cat: 'bio',    cost: 2500, icon: '▬', hint: 'Spark sentience (1-in-3 chance).' },

    // Civilization
    { id: 'city',     name: 'City',        cat: 'civ',    cost: 1500, icon: '⌂', hint: 'Found a Stone-Age settlement.' },
    { id: 'nuke',     name: 'Nuke',        cat: 'civ',    cost: 3000, icon: '☢', hint: 'Detonate — devastates, may birth machines.' }
  ];
  // life-placement tools are generated from the LIFE table at runtime.

  // ---- Map display overlays --------------------------------------------
  const OVERLAYS = [
    { id: 'terrain', name: 'Terrain' },
    { id: 'biome',   name: 'Biome' },
    { id: 'temp',    name: 'Temperature' },
    { id: 'rain',    name: 'Rainfall' },
    { id: 'air',     name: 'Air / Wind' },
    { id: 'life',    name: 'Life' },
    { id: 'civ',     name: 'Civilization' },
    { id: 'altitude',name: 'Altitude' }
  ];

  GAIA.CONFIG = CONFIG;
  GAIA.TIMESCALES = TIMESCALES;
  GAIA.SPEEDS = SPEEDS;
  GAIA.BIOME = BIOME;
  GAIA.LIFE = LIFE;
  GAIA.LIFE_BY_ID = LIFE_BY_ID;
  GAIA.TECH = TECH;
  GAIA.TOOLS = TOOLS;
  GAIA.OVERLAYS = OVERLAYS;

})(typeof window !== 'undefined' ? window : globalThis);
