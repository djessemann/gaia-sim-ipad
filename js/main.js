// GAIA bootstrap: wires the simulation, renderer, input, and UI together and
// runs the fixed-timestep game loop.

import { Simulation } from './simulation.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { applyTool } from './tools.js';
import { startScenario, SCENARIOS } from './scenarios.js';
import { SPEEDS, TUNE } from './config.js';

const sim = new Simulation();
const canvas = document.getElementById('map');
const renderer = new Renderer(canvas, sim);

let speedIndex = 1;

// Deterministic-ish seed without Date.now dependency in the sim itself.
function randomSeed() { return (Math.random() * 0xffffffff) >>> 0; }

const ui = new UI(sim, renderer, {
  onScenario: (sc) => startScenario(sim, sc, randomSeed()),
  onReseed:   (sc) => startScenario(sim, sc, randomSeed()),
  onSpeed:    (i) => { speedIndex = i; },
});

// Touch/mouse painting on the map.
new Input(canvas, sim, renderer, (gx, gy, isDrag) => {
  const info = applyTool(sim, ui.tool, gx, gy);
  if (info) ui.showExamine(info);
});

// Size the display canvas to its container (keep the planet's 72:44 aspect but
// fill the stage; the buffer is nearest-neighbour scaled so it stays crisp).
function resize() {
  const stage = document.getElementById('stage');
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}
window.addEventListener('resize', resize);

// --- Game loop: fixed simulation ticks, decoupled render ---
let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  const tps = SPEEDS[speedIndex].tps;
  if (tps > 0) {
    acc += dt;
    const interval = 1 / tps;
    let steps = 0;
    while (acc >= interval && steps < 4) { // cap catch-up work per frame
      sim.step();
      recoverFromShocks();
      acc -= interval;
      steps++;
    }
  }

  renderer.render();
  ui.update();
  requestAnimationFrame(frame);
}

// Gradually undo transient global shocks (meteor impact winter, solar dips).
function recoverFromShocks() {
  if (sim.meteorWinter && sim.tick > sim.meteorWinter) {
    sim.solar = Math.min(TUNE.baseSolar, sim.solar + 0.01);
    if (sim.solar >= TUNE.baseSolar - 0.001) sim.meteorWinter = 0;
  }
}

// Boot: generate the first world and show the menu.
startScenario(sim, SCENARIOS[0], randomSeed());
resize();
ui.openMenu();
requestAnimationFrame(frame);

// Register the service worker for offline / installable PWA (non-fatal).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
