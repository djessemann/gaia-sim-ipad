/* =====================================================================
 * scenarios.js — preset starting conditions, in the spirit of the
 * original's scenario roster (primordial soup, deep-time Earth, the
 * neighbouring worlds to terraform, and Lovelock's Daisyworld).
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const U = GAIA.util;

  const SCENARIOS = [
    {
      id: 'random', name: 'Random Planet', startYear: -4500000000,
      scale: 'geologic',
      blurb: 'A fresh, lifeless world. Shape it however you wish.',
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.6 });
        game.atmo.co2 = 3000; game.atmo.o2 = 1; game.atmo.n2 = 70; game.atmo.vapor = 1.2;
        game.atmo.solar = 1.0;
      }
    },
    {
      id: 'aquarium', name: 'Aquarium', startYear: -3500000000,
      scale: 'evolution',
      blurb: 'A warm ocean world where the first single-celled life stirs.',
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.82 });
        game.atmo.co2 = 1200; game.atmo.o2 = 4; game.atmo.n2 = 76; game.atmo.vapor = 1.5;
        game.atmo.solar = 0.97;
        game.seedLife('PROKARYOTE', 80);
      }
    },
    {
      id: 'cambrian', name: 'Earth — Cambrian', startYear: -540000000,
      scale: 'evolution',
      blurb: 'Life explodes in the seas. Guide it onto the land.',
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.72 });
        game.atmo.co2 = 800; game.atmo.o2 = 15; game.atmo.n2 = 78; game.atmo.vapor = 1.1;
        game.seedLife('ARTHROPOD', 30);
        game.seedLife('FISH', 20);
        game.seedLife('RADIATE', 25);
      }
    },
    {
      id: 'modern', name: 'Earth — Modern Day', startYear: 2026,
      scale: 'technology',
      blurb: 'A living, industrial world. Keep the climate in balance.',
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.7 });
        game.atmo.co2 = 420; game.atmo.o2 = 21; game.atmo.n2 = 78; game.atmo.vapor = 1.0;
        game.seedLife('MAMMAL', 40);
        game.seedLife('FISH', 30);
        game.seedBiomes();
        game.seedCities(8, 4); // 8 cities around the Atomic/Info age
      }
    },
    {
      id: 'mars', name: 'Mars — Terraform', startYear: 2200,
      scale: 'geologic',
      blurb: 'A frozen desert. Thicken the air and warm it for life.',
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.15 });
        game.atmo.co2 = 60; game.atmo.o2 = 0.1; game.atmo.n2 = 3; game.atmo.vapor = 0.05;
        game.atmo.solar = 0.43;
      }
    },
    {
      id: 'venus', name: 'Venus — Terraform', startYear: 2200,
      scale: 'geologic',
      blurb: 'A runaway greenhouse hothouse. Cool it down.',
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.1 });
        game.atmo.co2 = 80000; game.atmo.o2 = 0; game.atmo.n2 = 4; game.atmo.vapor = 0.2;
        game.atmo.solar = 1.9;
      }
    },
    {
      id: 'daisyworld', name: 'Daisyworld', startYear: 0,
      scale: 'evolution',
      blurb: "Lovelock's parable: black & white daisies regulate the climate.",
      daisy: true,
      setup(game) {
        game.world.generate(game.rng, { seaFrac: 0.3 });
        game.atmo.co2 = 300; game.atmo.o2 = 18; game.atmo.n2 = 78; game.atmo.vapor = 0.8;
        game.atmo.solar = 0.8; // will rise over time in this mode
        game.daisyworld = true;
        game.seedLife('PROKARYOTE', 60);
      }
    }
  ];

  GAIA.SCENARIOS = SCENARIOS;

})(typeof window !== 'undefined' ? window : globalThis);
