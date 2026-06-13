/* =====================================================================
 * main.js — boot the game: wire models, renderer, UI and input, then run
 * the animation loop (sim ticks decoupled from render frames).
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA;

  function boot() {
    const canvas = document.getElementById('map');
    const game = new GAIA.Game();
    const renderer = new GAIA.Renderer(canvas, game);
    const ui = new GAIA.UI(game, renderer);
    const input = new GAIA.Input(canvas, game, renderer, ui);

    GAIA.instance = { game, renderer, ui, input };

    // initial scenario
    game.loadScenario(GAIA.SCENARIOS[0]);
    ui.afterLoad();

    window.addEventListener('resize', () => renderer.resize());
    // re-fit on orientation change (iPad)
    window.addEventListener('orientationchange', () => setTimeout(() => { renderer._inited = false; renderer.resize(); }, 250));

    let last = performance.now();
    let acc = 0;
    function frame(now) {
      const dt = Math.min(100, now - last); last = now;
      game.update(dt);
      renderer.render();
      ui.updateStatus();
      ui.refreshTime();
      acc += dt;
      if (acc > 250) { ui.drawGraphs(); acc = 0; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // register service worker for offline / installable PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(typeof window !== 'undefined' ? window : globalThis);
