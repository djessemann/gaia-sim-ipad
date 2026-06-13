/* =====================================================================
 * render.js — draws the planet to the canvas. Supports a pannable,
 * zoomable, horizontally-wrapping map and eight display overlays.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { BIOME, LIFE_BY_ID, TECH } = GAIA;
  const U = GAIA.util;

  class Renderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.g = canvas.getContext('2d');
      this.game = game;
      this.overlay = 'terrain';
      this.showClouds = true;
      this.showGrid = false;
      this.zoom = 1;
      this.camX = 0; this.camY = 0;   // top-left in cell units
      this.baseCell = 16;
      this.sel = null;                // {x,y}
      this.t = 0;
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const r = this.canvas.getBoundingClientRect();
      this.cssW = r.width; this.cssH = r.height;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.dpr = dpr;
      // fit zoom so the whole world is visible by default
      this.fitZoom = this.cssW / (this.game.world.w * this.baseCell);
      if (!this._inited) { this.zoom = this.fitZoom; this._inited = true; this.clampCam(); }
    }

    cellPx() { return this.baseCell * this.zoom; }

    clampCam() {
      const w = this.game.world, cp = this.cellPx();
      const viewH = this.cssH / cp;
      this.camY = U.clamp(this.camY, 0, Math.max(0, w.h - viewH));
      // x wraps freely
      this.camX = ((this.camX % w.w) + w.w) % w.w;
    }

    // screen -> cell
    screenToCell(sx, sy) {
      const cp = this.cellPx();
      const cx = Math.floor(this.camX + sx / cp);
      const cy = Math.floor(this.camY + sy / cp);
      const w = this.game.world;
      if (cy < 0 || cy >= w.h) return null;
      return { x: ((cx % w.w) + w.w) % w.w, y: cy };
    }

    cellColor(c, x, y) {
      const w = this.game.world;
      switch (this.overlay) {
        case 'biome': return BIOME[c.biome].color;
        case 'temp': {
          const t = U.clamp((c.temp + 20) / 70, 0, 1); // -20..50
          return `hsl(${(1 - t) * 240},75%,${28 + t * 22}%)`;
        }
        case 'rain': {
          const r = c.rain / 100;
          return w.isLand(c) ? U.mix('#caa45a', '#2f6aa6', r) : '#1d3f73';
        }
        case 'altitude': {
          if (!w.isLand(c)) { const d = U.clamp(-c.alt, 0, 1); return U.mix('#2a5a8a', '#06203a', d); }
          const a = U.clamp(c.alt, 0, 1); return U.mix('#3f6b3a', '#efe6d0', a);
        }
        case 'air':
        case 'life':
        case 'civ':
        case 'terrain':
        default: {
          if (!w.isLand(c)) {
            const d = U.clamp(-c.alt, 0, 1);
            const base = c.alt > -0.25 ? '#2f6aa6' : '#1d3f73';
            return U.mix(base, '#08203c', d * 0.8);
          }
          // land: biome color modulated by altitude hillshade
          let col = BIOME[c.biome].color;
          const shade = (c.alt - 0.3) * 0.25;
          return shadeColor(col, shade);
        }
      }
    }

    render() {
      this.t += 1;
      const g = this.g, dpr = this.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, this.cssW, this.cssH);
      const w = this.game.world;
      const cp = this.cellPx();
      const x0 = Math.floor(this.camX), y0 = Math.floor(this.camY);
      const colsVisible = Math.ceil(this.cssW / cp) + 1;
      const rowsVisible = Math.ceil(this.cssH / cp) + 1;

      // base tiles
      for (let row = 0; row <= rowsVisible; row++) {
        const cy = y0 + row;
        if (cy < 0 || cy >= w.h) continue;
        const py = (cy - this.camY) * cp;
        for (let col = 0; col <= colsVisible; col++) {
          const wx = ((x0 + col) % w.w + w.w) % w.w;
          const c = w.cells[cy * w.w + wx];
          const px = (col + (x0 - this.camX)) * cp;
          g.fillStyle = this.cellColor(c, wx, cy);
          g.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cp) + 1, Math.ceil(cp) + 1);

          // dim non-relevant overlays for life/civ focus
          if (this.overlay === 'life' || this.overlay === 'civ') {
            g.fillStyle = 'rgba(10,18,28,0.35)';
            g.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cp) + 1, Math.ceil(cp) + 1);
          }
        }
      }

      // sprite & detail layer
      const drawSprites = ['terrain', 'biome', 'life', 'civ', 'rain'].includes(this.overlay);
      for (let row = 0; row <= rowsVisible; row++) {
        const cy = y0 + row; if (cy < 0 || cy >= w.h) continue;
        const py = (cy - this.camY) * cp;
        for (let col = 0; col <= colsVisible; col++) {
          const wx = ((x0 + col) % w.w + w.w) % w.w;
          const c = w.cells[cy * w.w + wx];
          const px = (col + (x0 - this.camX)) * cp;

          if (drawSprites) {
            // animal life icon
            if (c.life && cp >= 10 && (this.overlay !== 'civ')) {
              const spr = GAIA.gfx.lifeSprite(c.life);
              const sz = cp * U.clamp(0.5 + c.lifePop * 0.5, 0.5, 1);
              g.globalAlpha = U.clamp(0.4 + c.lifePop, 0.4, 1);
              g.drawImage(spr, px + (cp - sz) / 2, py + (cp - sz) / 2, sz, sz);
              g.globalAlpha = 1;
            }
            // city
            if (c.city && cp >= 8) {
              const spr = GAIA.gfx.citySprite(c.city.tech);
              const sz = cp * U.clamp(0.7 + c.city.pop * 0.4, 0.7, 1.15);
              g.drawImage(spr, px + (cp - sz) / 2, py + cp - sz, sz, sz);
            }
            // sentient sea-life marker
            if (c.sentient && !c.city && cp >= 10) {
              g.fillStyle = '#ffe27a';
              g.beginPath(); g.arc(px + cp * 0.5, py + cp * 0.25, Math.max(1.5, cp * 0.08), 0, 7); g.fill();
            }
          }

          // wind arrows on air overlay
          if (this.overlay === 'air' && cp >= 14 && (wx % 2 === 0) && (cy % 2 === 0)) {
            const wind = this.game.atmo.wind(w.lat(cy));
            const ang = Math.atan2(wind.v, wind.u);
            const cx = px + cp / 2, cyy = py + cp / 2, len = cp * 0.35;
            g.strokeStyle = 'rgba(220,235,250,0.7)'; g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(cx - Math.cos(ang) * len, cyy - Math.sin(ang) * len);
            g.lineTo(cx + Math.cos(ang) * len, cyy + Math.sin(ang) * len);
            g.stroke();
            g.beginPath();
            g.moveTo(cx + Math.cos(ang) * len, cyy + Math.sin(ang) * len);
            g.lineTo(cx + Math.cos(ang + 2.5) * len * 0.5, cyy + Math.sin(ang + 2.5) * len * 0.5);
            g.stroke();
          }

          // clouds drift slowly with the wind
          if (this.showClouds && c.cloud > 0.25 && this.overlay !== 'air') {
            const wind = this.game.atmo.wind(w.lat(cy));
            const drift = (this.t * 0.15 * wind.u);
            const ox = ((px + drift) % (w.w * cp));
            g.globalAlpha = U.clamp((c.cloud - 0.25) * 0.7, 0, 0.55);
            g.fillStyle = '#eef4fb';
            g.beginPath();
            g.ellipse(px + cp / 2 + (drift % cp), py + cp / 2, cp * 0.45, cp * 0.32, 0, 0, 7);
            g.fill();
            g.globalAlpha = 1;
          }
        }
      }

      // grid
      if (this.showGrid && cp >= 10) {
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
        for (let col = 0; col <= colsVisible; col++) {
          const px = Math.floor((col + (x0 - this.camX)) * cp) + 0.5;
          g.beginPath(); g.moveTo(px, 0); g.lineTo(px, this.cssH); g.stroke();
        }
        for (let row = 0; row <= rowsVisible; row++) {
          const py = Math.floor((y0 + row - this.camY) * cp) + 0.5;
          g.beginPath(); g.moveTo(0, py); g.lineTo(this.cssW, py); g.stroke();
        }
      }

      // selection highlight
      if (this.sel) {
        const sx = this.sel.x, sy = this.sel.y;
        // find on-screen position considering wrap
        let dispCol = sx - x0; dispCol = ((dispCol % w.w) + w.w) % w.w;
        const px = (dispCol + (x0 - this.camX)) * cp;
        const py = (sy - this.camY) * cp;
        g.strokeStyle = '#ffd54a'; g.lineWidth = 2;
        g.strokeRect(px + 1, py + 1, cp - 2, cp - 2);
      }
    }
  }

  function shadeColor(hex, amt) {
    const [r, gg, b] = U.hex2rgb(hex);
    const f = 1 + amt;
    return `rgb(${U.clamp(r * f, 0, 255) | 0},${U.clamp(gg * f, 0, 255) | 0},${U.clamp(b * f, 0, 255) | 0})`;
  }

  GAIA.Renderer = Renderer;

})(typeof window !== 'undefined' ? window : globalThis);
