/* =====================================================================
 * tools.js — applies the currently selected tool to a tile. Each action
 * charges the Ω energy budget; life-placement tools are derived from the
 * LIFE table so the palette always matches the data.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { TOOLS, LIFE, LIFE_BY_ID, BIOME, TECH } = GAIA;
  const U = GAIA.util;

  // Build the full tool list including a button per life class.
  function allTools() {
    const life = LIFE.map(l => ({
      id: 'life:' + l.id, name: l.name, cat: l.habit === 'sea' ? 'sealife' : 'landlife',
      cost: 200 + l.tier * 80, icon: l.glyph, color: l.color,
      hint: `Place ${l.name} (${l.habit}).`, life: l.id
    }));
    return TOOLS.concat(life);
  }

  // Look up a tool definition by id.
  function toolById(id) {
    return allTools().find(t => t.id === id);
  }

  // Apply tool `tool` to world cell (x,y). Returns a status string or null.
  function apply(game, tool, x, y) {
    const w = game.world;
    const c = w.get(x, y);
    if (!c) return null;

    // examine never costs energy; UI handles inspection separately
    if (tool.id === 'examine') return 'examine';

    if (!game.spend(tool.cost)) return 'Not enough Ω energy.';

    switch (tool.id) {
      case 'raise': w.deform(x, y, +0.12, 1); break;
      case 'lower': w.deform(x, y, -0.12, 1); break;

      case 'volcano':
        w.deform(x, y, +0.35, 1);
        if (w.isLand(c)) c.biome = 'ROCK';
        c.biomass = 0; c.life = null; c.city = null;
        game.atmo.co2 += 120; game.atmo.vapor += 0.15;
        game.addLog('🌋 A volcano erupts, venting CO₂.');
        break;

      case 'quake':
        // damage cities & shuffle altitude slightly in a radius
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const n = w.get(x + dx, y + dy); if (!n) continue;
          n.alt = U.clamp(n.alt + (game.rng() - 0.5) * 0.08, -1, 1);
          if (n.city && game.rng() < 0.4) { n.city.pop *= 0.5; if (n.city.pop < 0.05) n.city = null; }
        }
        game.addLog('〰 An earthquake rattles the crust.');
        break;

      case 'meteor':
        game.detonate(x, y, 3, false);
        w.deform(x, y, -0.25, 2);
        game.atmo.vapor += 0.6; // impact winter dust (raises albedo via clouds)
        game.addLog('☄ A meteor strikes! Dust fills the sky.');
        break;

      case 'co2':   game.atmo.co2 += 200; break;
      case 'o2':    game.atmo.o2 = U.clamp(game.atmo.o2 + 2, 0, 95); break;
      case 'n2':    game.atmo.n2 = U.clamp(game.atmo.n2 + 2, 0, 95); break;
      case 'vapor': game.atmo.vapor = U.clamp(game.atmo.vapor + 0.3, 0, 6); break;

      case 'rain':
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const n = w.get(x + dx, y + dy); if (n) { n.rain = U.clamp(n.rain + 25, 0, 100); n.cloud = Math.min(1, n.cloud + 0.4); }
        }
        break;

      case 'fire':
        if (w.isLand(c) && c.biomass > 0.1) {
          c.biomass = 0; c.biome = 'ROCK'; c.life = null;
          game.atmo.co2 += 40;
          game.addLog('🔥 Wildfire clears the land.');
        }
        break;

      case 'biome':
        if (w.isLand(c)) {
          const target = GAIA.classifyBiome(c.temp, c.rain);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const n = w.get(x + dx, y + dy);
            if (n && w.isLand(n) && !n.city) {
              n.biome = GAIA.classifyBiome(n.temp, n.rain);
              n.biomass = Math.max(n.biomass, (BIOME[n.biome].biomass || 0) * 0.5);
            }
          }
        }
        break;

      case 'monolith':
        // 1-in-3 chance to spark sentience in nearby life
        if (game.rng() < 1 / 3) {
          let done = false;
          for (let rad = 0; rad <= 2 && !done; rad++)
            for (let dy = -rad; dy <= rad && !done; dy++)
              for (let dx = -rad; dx <= rad && !done; dx++) {
                const n = w.get(x + dx, y + dy);
                if (n && n.life && !n.sentient && LIFE_BY_ID[n.life].iq > 0) {
                  game.bio.makeSentient(w, x + dx, y + dy);
                  game.addLog(`▬ The Monolith sparks sentience in the ${LIFE_BY_ID[n.life].name}!`);
                  done = true;
                }
              }
          if (!done) game.addLog('▬ The Monolith hums, but finds no fitting mind.');
        } else {
          game.addLog('▬ The Monolith goes dark. Nothing stirs.');
        }
        break;

      case 'city':
        if (w.isLand(c) && !c.city) {
          c.city = { tech: 0, pop: 0.2, growth: 0, species: c.life || 'MAMMAL' };
          c.life = c.life || 'MAMMAL'; c.sentient = true; c.lifeLevel = 1;
        }
        break;

      case 'nuke':
        game.detonate(x, y, 3, true);
        game.addLog('☢ Nuclear detonation!');
        break;

      default:
        if (tool.life) {
          const def = LIFE_BY_ID[tool.life];
          const ok = def.habit === 'sea' ? !w.isLand(c) : w.isLand(c);
          if (ok && !c.city) {
            c.life = tool.life; c.lifePop = 0.4; c.lifeLevel = 0.1; c.sentient = false;
          } else {
            return `${def.name} need ${def.habit === 'sea' ? 'ocean' : 'land'}.`;
          }
        }
    }
    return 'ok';
  }

  GAIA.tools = { allTools, toolById, apply };

})(typeof window !== 'undefined' ? window : globalThis);
