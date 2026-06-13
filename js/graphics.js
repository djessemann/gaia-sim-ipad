/* =====================================================================
 * graphics.js — original procedural sprite art. Each life class, city
 * tech level, and weather glyph is drawn once to an offscreen canvas and
 * then blitted (scaled) onto the map. No external image assets.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { LIFE_BY_ID, TECH } = GAIA;
  const U = GAIA.util;

  const S = 32; // sprite render resolution
  const cache = {};

  function make(draw) {
    const cv = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(S, S)
      : Object.assign(document.createElement('canvas'), { width: S, height: S });
    const g = cv.getContext('2d');
    draw(g, S);
    return cv;
  }

  // ---- little pixel-creature primitives --------------------------------
  function body(g, cx, cy, rx, ry, col) {
    g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();
  }
  function dot(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

  const SPRITE_DRAW = {
    PROKARYOTE: (g) => { g.globalAlpha=.9; dot(g,12,14,3,'#9fe0c0'); dot(g,20,18,2.5,'#7fd6b0'); dot(g,16,22,2,'#bfeed8'); },
    EUKARYOTE:  (g) => { body(g,16,16,7,6,'#7fd6b0'); dot(g,16,16,2.5,'#2f7d5a'); },
    RADIATE:    (g) => { g.strokeStyle='#e88fb0'; g.lineWidth=2; for(let i=0;i<8;i++){const a=i/8*7;g.beginPath();g.moveTo(16,16);g.lineTo(16+Math.cos(a)*9,16+Math.sin(a)*9);g.stroke();} dot(g,16,16,3,'#f4b8cf'); },
    ARTHROPOD:  (g) => { body(g,16,16,6,8,'#c98b3b'); g.strokeStyle='#7a5320';g.lineWidth=1.5;for(let i=-1;i<2;i++){g.beginPath();g.moveTo(11,14+i*5);g.lineTo(5,11+i*5);g.moveTo(21,14+i*5);g.lineTo(27,11+i*5);g.stroke();} },
    MOLLUSK:    (g) => { body(g,16,17,7,6,'#c0a0e0'); g.strokeStyle='#8060a0';g.lineWidth=1.5;g.beginPath();g.arc(16,17,4,0,7);g.stroke(); },
    FISH:       (g) => { g.fillStyle='#56b0e6'; g.beginPath();g.moveTo(8,16);g.quadraticCurveTo(16,8,24,16);g.quadraticCurveTo(16,24,8,16);g.fill(); g.beginPath();g.moveTo(24,16);g.lineTo(29,11);g.lineTo(29,21);g.fill(); dot(g,12,15,1.2,'#06304f'); },
    CETACEAN:   (g) => { g.fillStyle='#3a86c8'; g.beginPath();g.moveTo(5,18);g.quadraticCurveTo(16,8,26,16);g.quadraticCurveTo(28,18,24,20);g.quadraticCurveTo(16,22,5,18);g.fill(); g.beginPath();g.moveTo(26,16);g.lineTo(30,12);g.lineTo(29,18);g.fill(); },
    TRICHORDATE:(g) => { g.strokeStyle='#b06fc8';g.lineWidth=2;for(let i=0;i<3;i++){const a=i/3*7;g.beginPath();g.moveTo(16,16);g.lineTo(16+Math.cos(a)*10,16+Math.sin(a)*10);g.stroke();} dot(g,16,16,3.5,'#d6a8e6'); },
    AMPHIBIAN:  (g) => { body(g,16,17,8,6,'#7fae5a'); dot(g,12,12,2.5,'#cfe6a0'); dot(g,20,12,2.5,'#cfe6a0'); dot(g,12,12,1,'#123'); dot(g,20,12,1,'#123'); },
    INSECT:     (g) => { body(g,16,18,3,6,'#b59030'); dot(g,16,11,3,'#8a6c20'); g.strokeStyle='#6a5418';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(13,15+i*3);g.lineTo(7,13+i*3);g.moveTo(19,15+i*3);g.lineTo(25,13+i*3);g.stroke();} },
    REPTILE:    (g) => { g.fillStyle='#6fae4a'; g.beginPath();g.moveTo(6,18);g.quadraticCurveTo(16,12,24,16);g.lineTo(28,14);g.quadraticCurveTo(20,20,6,18);g.fill(); dot(g,23,15,1,'#123'); },
    DINOSAUR:   (g) => { g.fillStyle='#8f7a3a'; g.beginPath();g.moveTo(6,24);g.quadraticCurveTo(10,10,16,12);g.quadraticCurveTo(24,12,24,8);g.quadraticCurveTo(28,12,24,18);g.quadraticCurveTo(20,20,18,24);g.lineTo(14,24);g.lineTo(14,18);g.lineTo(10,24);g.fill(); dot(g,23,11,1,'#123'); },
    BIRD:       (g) => { g.fillStyle='#d68b56'; g.beginPath();g.moveTo(10,18);g.quadraticCurveTo(16,10,22,16);g.quadraticCurveTo(18,18,22,22);g.quadraticCurveTo(14,22,10,18);g.fill(); g.fillStyle='#e0a878';g.beginPath();g.moveTo(22,16);g.lineTo(27,15);g.lineTo(23,18);g.fill(); },
    MAMMAL:     (g) => { body(g,16,18,7,5,'#c87a5a'); dot(g,22,13,3.5,'#c87a5a'); dot(g,20,11,1.5,'#8a4a30'); dot(g,24,11,1.5,'#8a4a30'); g.strokeStyle='#8a4a30';g.lineWidth=2;g.beginPath();g.moveTo(11,22);g.lineTo(11,26);g.moveTo(20,22);g.lineTo(20,26);g.stroke(); },
    CARNIFERN:  (g) => { g.strokeStyle='#3f9e6f';g.lineWidth=2;g.beginPath();g.moveTo(16,26);g.lineTo(16,12);g.stroke(); for(let i=-1;i<2;i+=2){g.beginPath();g.moveTo(16,16);g.quadraticCurveTo(16+i*8,12,16+i*5,8);g.stroke();} dot(g,16,9,3,'#e85a7a'); }
  };

  function lifeSprite(id) {
    if (cache['L' + id]) return cache['L' + id];
    const def = LIFE_BY_ID[id];
    const drawFn = SPRITE_DRAW[id] || ((g) => body(g, 16, 16, 6, 6, def ? def.color : '#fff'));
    const cv = make((g) => { g.lineCap = 'round'; g.lineJoin = 'round'; drawFn(g); });
    return (cache['L' + id] = cv);
  }

  // ---- city sprites scale & complexity by technology level -------------
  function citySprite(tech) {
    if (cache['C' + tech]) return cache['C' + tech];
    const t = TECH[tech];
    const cv = make((g, s) => {
      const n = 2 + tech;                 // number of structures
      const baseY = s - 6;
      for (let i = 0; i < n; i++) {
        const bw = 3 + (i % 2);
        const bh = 4 + (tech * 1.6) + (i % 3) * 2;
        const bx = 4 + i * (s - 8) / n;
        g.fillStyle = t.color;
        g.fillRect(bx, baseY - bh, bw, bh);
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.fillRect(bx, baseY - bh, bw, 1.5);
      }
      if (tech >= 4) { // antenna / glow for advanced ages
        g.strokeStyle = t.color; g.lineWidth = 1;
        g.beginPath(); g.moveTo(s / 2, baseY - 16); g.lineTo(s / 2, baseY - 24); g.stroke();
        dot(g, s / 2, baseY - 25, 1.6, '#fff');
      }
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(2, baseY, s - 4, 2);
    });
    return (cache['C' + tech] = cv);
  }

  function clearCache() { for (const k in cache) delete cache[k]; }

  GAIA.gfx = { lifeSprite, citySprite, clearCache, S };

})(typeof window !== 'undefined' ? window : globalThis);
