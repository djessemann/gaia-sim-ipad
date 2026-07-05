// Touch / pointer input on the map canvas.
//
// Gestures:
//   - One finger  -> paint the active tool (camera-aware cell mapping).
//   - Two fingers -> pinch to zoom + drag to pan (no tool applied).
//   - Double-tap  -> toggle between fit and a 3x zoom at the tap point.
//   - Wheel       -> zoom about the cursor (desktop).
//
// Uses Pointer Events so finger, stylus, and mouse share one code path.

export class Input {
  constructor(canvas, sim, renderer, onApply) {
    this.canvas = canvas;
    this.sim = sim;
    this.renderer = renderer;
    this.onApply = onApply;              // (gridX, gridY, isDrag) => void
    this.pointers = new Map();           // pointerId -> {x, y} in CSS px
    this.painting = false;
    this.lastCell = -1;
    this.pinch = null;                   // { dist, midX, midY }
    this.lastTap = 0;
    this._bind();
  }

  _norm(e) {
    const r = this.canvas.getBoundingClientRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height, r };
  }

  _applyAt(e, isDrag) {
    const { nx, ny } = this._norm(e);
    const { gx, gy } = this.renderer.screenToCell(clamp01(nx), clamp01(ny));
    const cell = gy * this.sim.world.w + gx;
    if (isDrag && cell === this.lastCell) return;
    this.lastCell = cell;
    this.onApply(gx, gy, isDrag);
  }

  _twoFingerState() {
    const pts = [...this.pointers.values()];
    const [a, b] = pts;
    const dx = a.x - b.x, dy = a.y - b.y;
    return { dist: Math.hypot(dx, dy), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
  }

  _bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';

    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { c.setPointerCapture?.(e.pointerId); } catch (_) { /* non-fatal */ }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 1) {
        // Double-tap detection (two quick single-finger taps).
        const now = e.timeStamp;
        if (now - this.lastTap < 300) {
          const { nx, ny } = this._norm(e);
          if (this.renderer.cam.zoom > 1.05) this.renderer.resetZoom();
          else this.renderer.zoomAt(3, clamp01(nx), clamp01(ny));
          this.lastTap = 0;
          this.painting = false;
          return;
        }
        this.lastTap = now;
        this.painting = true;
        this._applyAt(e, false);
      } else if (this.pointers.size === 2) {
        // Second finger down -> switch from painting to pinch/pan.
        this.painting = false;
        this.pinch = this._twoFingerState();
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      e.preventDefault();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size >= 2) {
        const s = this._twoFingerState();
        if (this.pinch) {
          const r = this.canvas.getBoundingClientRect();
          // Zoom about the pinch midpoint.
          if (this.pinch.dist > 0) {
            const factor = s.dist / this.pinch.dist;
            this.renderer.zoomAt(factor, clamp01((s.midX - r.left) / r.width),
                                          clamp01((s.midY - r.top) / r.height));
          }
          // Pan by midpoint movement.
          this.renderer.panBy((s.midX - this.pinch.midX) / r.width,
                              (s.midY - this.pinch.midY) / r.height);
        }
        this.pinch = s;
      } else if (this.painting) {
        this._applyAt(e, true);
      }
    });

    const up = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0) { this.painting = false; this.lastCell = -1; }
      else this.painting = false; // don't resume painting mid-multitouch
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', up);

    // Desktop wheel zoom about the cursor.
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const { nx, ny } = this._norm(e);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      this.renderer.zoomAt(factor, clamp01(nx), clamp01(ny));
    }, { passive: false });
  }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
