# GAIA — The Living Planet

A tablet-optimized, browser-based planetary life simulation, built as an
original homage to the classic god-game **SimEarth** (Maxis, 1990) and the
**Gaia hypothesis** of James Lovelock. You sculpt a planet's geology,
balance its atmosphere, seed life into the seas and onto the land, watch it
evolve across billions of years, and shepherd intelligent civilizations from
the Stone Age to the Exodus — or watch the whole biosphere collapse.

> All code, formulas and artwork here are original. This is a from-scratch
> re-implementation of the *genre's mechanics*, not a copy of any assets.

## Play

It's a static web app — no build step.

```bash
# from the repo root, serve the folder and open it in a browser:
python3 -m http.server 8000
#   → http://localhost:8000
```

On an **iPad**: open that URL in Safari, then **Share → Add to Home Screen**
to install it as a fullscreen, offline-capable app (PWA). Best in **landscape**.

### Touch controls
- **One finger** — paints with the selected tool. In **Examine** mode, one
  finger pans the map and a tap inspects a tile.
- **Two fingers** — pinch to zoom, drag to pan.
- The map **wraps** east–west like a globe.

## What it simulates

Four interacting models, mirroring the original's structure:

| Model | What it does |
|-------|--------------|
| **Geosphere** | Plate tectonics, continental drift, mountains, volcanoes, quakes, meteors, terraforming. |
| **Atmosphere** | Insolation by latitude, CO₂ greenhouse, water-vapor & ice-albedo feedbacks, heat diffusion, clouds & rainfall, the global gas budget. |
| **Biosphere** | Whittaker-style biomes (rock, tundra, boreal, desert, grassland, forest, jungle, swamp, ice), 14 life classes that spread, evolve and speciate, and photosynthesis that draws down CO₂ and releases O₂. |
| **Civilization** | Sentient species found cities that grow, advance through 7 technology ages (Stone → Nanotech), pollute, wage nuclear war, and finally launch the **Exodus**. |

### Tools (cost Ω energy)
Terraform (raise/lower/volcano/quake/meteor), atmosphere generators
(CO₂/O₂/N₂/vapor/rain/fire), **Biome** seeding, the **Monolith** (1-in-3
chance to spark sentience), city founding, **Nuke**, and a placement button
for every one of the 14 life classes (sea & land).

### Map overlays
Terrain, Biome, Temperature, Rainfall, Air/Wind, Life, Civilization, Altitude.

### Scenarios
Random Planet, Aquarium, Earth — Cambrian, Earth — Modern Day, Mars
(terraform), Venus (terraform), and **Daisyworld** (Lovelock's self-regulating
parable).

### Extras
Time scales (Geologic → Evolution → Civilization → Technology) with variable
speed, live data graphs of planetary history, adjustable model rates (solar
output, drift, evolution, tech), an event log, and Save/Load to the browser.

## Project layout
```
index.html        layout + script load order
css/styles.css    tablet-first dark UI
js/config.js      all game data tables (biomes, life, tech, tools, scales)
js/utils.js       RNG + value-noise terrain
js/world.js       grid, terrain gen, tectonics
js/atmosphere.js  climate model
js/biosphere.js   biomes, life, evolution
js/civilization.js cities, tech, war, exodus
js/scenarios.js   preset worlds
js/simulation.js  Game orchestrator, clock, energy, save/load
js/tools.js       tool effects
js/graphics.js    procedural sprite art
js/render.js      canvas renderer + camera
js/ui.js          HUD, panels, graphs
js/input.js       touch / pointer handling
js/main.js        bootstrap + loop
sw.js             offline service worker
manifest.json     PWA manifest
```
