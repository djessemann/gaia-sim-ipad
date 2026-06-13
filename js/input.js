/* =====================================================================
 * input.js — pointer & touch handling. One finger paints with the active
 * tool (or pans in Examine mode); two fingers pan & pinch-zoom the map.
 * Works with mouse + wheel on desktop too.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const U = GAIA.util;

  class Input {
    constructor(canvas, game, renderer, ui) {
      this.c = canvas; this.game = game; this.r = renderer; this.ui = ui;
      this.pointers = new Map();
      this.lastPaint = null;
      this.panMode = false;
      this.pinchDist = 0; this.pinchZoom = 1; this.pinchMid = null;
      this.bind();
    }

    rel(e) {
      const r = this.c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    bind() {
      const c = this.c;
      c.style.touchAction = 'none';
      c.addEventListener('pointerdown', e => this.down(e));
      c.addEventListener('pointermove', e => this.move(e));
      c.addEventListener('pointerup', e => this.up(e));
      c.addEventListener('pointercancel', e => this.up(e));
      c.addEventListener('wheel', e => this.wheel(e), { passive: false });
    }

    down(e) {
      this.c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, this.rel(e));
      if (this.pointers.size === 2) {
        // begin pinch
        const pts = [...this.pointers.values()];
        this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.pinchZoom = this.r.zoom;
        this.pinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        this.panMode = true;
        this.lastPaint = null;
      } else {
        const tool = this.ui.currentTool;
        const p = this.rel(e);
        if (tool && tool.id === 'examine') {
          this.panStart = { x: p.x, y: p.y, camX: this.r.camX, camY: this.r.camY };
          this.dragged = false;
        } else {
          this.paint(p);
        }
      }
    }

    move(e) {
      if (!this.pointers.has(e.pointerId)) return;
      const p = this.rel(e);
      this.pointers.set(e.pointerId, p);

      if (this.pointers.size >= 2) {
        const pts = [...this.pointers.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        if (this.pinchDist > 0) {
          const cp0 = this.r.cellPx();
          // anchor zoom at the pinch midpoint
          const worldX = this.r.camX + this.pinchMid.x / cp0;
          const worldY = this.r.camY + this.pinchMid.y / cp0;
          this.r.zoom = U.clamp(this.pinchZoom * (d / this.pinchDist), this.r.fitZoom * 0.6, 6);
          const cp1 = this.r.cellPx();
          this.r.camX = worldX - mid.x / cp1;
          this.r.camY = worldY - mid.y / cp1;
          this.r.clampCam();
        }
        return;
      }

      const tool = this.ui.currentTool;
      if (tool && tool.id === 'examine' && this.panStart) {
        const cp = this.r.cellPx();
        const dx = (p.x - this.panStart.x) / cp;
        const dy = (p.y - this.panStart.y) / cp;
        if (Math.hypot(p.x - this.panStart.x, p.y - this.panStart.y) > 6) this.dragged = true;
        this.r.camX = this.panStart.camX - dx;
        this.r.camY = this.panStart.camY - dy;
        this.r.clampCam();
      } else if (tool && tool.id !== 'examine') {
        this.paint(p);
      }
    }

    up(e) {
      const tool = this.ui.currentTool;
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) { this.pinchDist = 0; this.panMode = false; }
      if (tool && tool.id === 'examine' && this.panStart && !this.dragged && p) {
        const cell = this.r.screenToCell(p.x, p.y);
        if (cell) { this.r.sel = cell; this.ui.showInspector(cell.x, cell.y); }
      }
      this.panStart = null; this.lastPaint = null;
    }

    paint(p) {
      const cell = this.r.screenToCell(p.x, p.y);
      if (!cell) return;
      // avoid re-applying to same cell while dragging
      if (this.lastPaint && this.lastPaint.x === cell.x && this.lastPaint.y === cell.y) return;
      this.lastPaint = cell;
      this.r.sel = cell;
      const tool = this.ui.currentTool;
      const res = GAIA.tools.apply(this.game, tool, cell.x, cell.y);
      if (res === 'examine') { this.ui.showInspector(cell.x, cell.y); return; }
      if (res && res !== 'ok') this.ui.toast(res);
      else this.ui.showInspector(cell.x, cell.y);
    }

    wheel(e) {
      e.preventDefault();
      const cp0 = this.r.cellPx();
      const p = this.rel(e);
      const worldX = this.r.camX + p.x / cp0;
      const worldY = this.r.camY + p.y / cp0;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      this.r.zoom = U.clamp(this.r.zoom * factor, this.r.fitZoom * 0.6, 6);
      const cp1 = this.r.cellPx();
      this.r.camX = worldX - p.x / cp1;
      this.r.camY = worldY - p.y / cp1;
      this.r.clampCam();
    }
  }

  GAIA.Input = Input;

})(typeof window !== 'undefined' ? window : globalThis);
