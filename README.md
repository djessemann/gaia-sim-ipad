# GAIA — a planetary life simulator

A touch-first, mobile web app in the spirit of Will Wright's **SimEarth** (1990)
and James Lovelock's Gaia hypothesis. You don't build a city — you steward a
whole planet. Geology, atmosphere, oceans, and life all feed back on one
another, and your job is to keep the world inside the habitable *Gaia window*
long enough for life to climb from pond scum to a thinking civilization.

Built as a pure static web app — no build step, no dependencies — with an
unapologetic early-90s VGA look. iPhone-first, scales up to iPad and desktop,
and installs as a PWA.

## Play

Live (GitHub Pages): **https://djessemann.github.io/gaia-sim-ipad/**

On an iPhone/iPad, open the link in Safari → Share → **Add to Home Screen** to
run it fullscreen like a native app (works offline afterward).

## How it works

A wrapping lat/lon planet grid runs four coupled simulation systems each tick:

- **Geosphere** — fractal terrain, volcanoes (build land, belch CO₂), erosion,
  and sea level that responds to how much water is locked up as ice.
- **Atmosphere** — per-cell temperature from latitude, solar output, and the
  greenhouse effect, plus the **ice-albedo feedback** loop that can tip a world
  into a runaway freeze or a runaway hothouse. Life and volcanism drive a global
  CO₂/O₂ budget.
- **Biosphere** — life spreads into cells it can tolerate and **evolves** up a
  ladder: microbes → algae → plants → invertebrates → fish → reptiles →
  mammals → sentient. Photosynthesis pulls CO₂ and pumps out oxygen, slowly
  terraforming the air.
- **Civilization** — once a sentient species emerges, settlements appear and
  advance through technology ages, and their industry starts polluting — the
  classic SimEarth irony where your smartest life can wreck the biosphere.

A **Gaia health** meter scores how well-balanced the planet is: temperate
climate, liquid oceans, thriving diverse life, breathable air, low pollution.

## Interface

- **View layers** — swap the map between Terrain, Climate, Rainfall, Biomes,
  and Civilization overlays.
- **Tools** (energy-budgeted) — raise/lower land, add water, seed life, plant
  forests, trigger volcanoes, drop meteors, and inject or scrub CO₂. Tap or
  drag to paint. The Examine tool probes any cell.
- **Time & speed** — pause and run at several speeds; switch time scales from
  Geologic (500 KY/tick) down to Experiment (5 YR/tick).
- **Scenarios** — Young Earth, Aquarium, Snowball, Runaway greenhouse, and a
  cold Red Desert to terraform.

## Scenarios to try

- **Snowball** — a frozen world. Pump CO₂ (Warm tool / volcanoes) to break the
  ice-albedo grip and watch oceans reappear.
- **Runaway** — a choking greenhouse. Scrub CO₂ and seed algae to draw it down
  before the planet bakes.
- **Red Desert** — cold, dry, thin air. A terraforming project from scratch.

## Project layout

```
index.html            app shell
manifest.json  sw.js  PWA manifest + offline service worker
icons/                app icons
css/styles.css        90s beveled UI, phone-first touch layout
js/
  config.js           palette, tuning constants, enums
  rng.js              seeded PRNG + X-wrapping fractal noise
  world.js            planet grid + terrain generation
  simulation.js       master tick, global state, Gaia score
  atmosphere.js       climate, ice-albedo feedback, gas budget
  biosphere.js        life spread + evolution ladder
  geosphere.js        volcanoes, erosion, sea level
  civilization.js     settlements + technology ages
  tools.js            player tools + energy economy
  render.js           canvas renderer with Bayer dithering
  input.js            pointer/touch drag-painting
  ui.js               panels, palette, readouts, menu
  main.js             bootstrap + game loop
```

## Local development

It's a static site — serve the folder with any web server (ES modules need
HTTP, not `file://`):

```
python3 -m http.server 8000
# then open http://localhost:8000
```
