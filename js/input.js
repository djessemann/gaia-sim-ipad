// Touch / pointer input on the map canvas. Converts pointer position to a grid
// cell and drag-paints the active tool. Phone-first: uses Pointer Events so one
// code path handles finger, stylus, and mouse.

export class Input {
  constructor(canvas, sim, renderer, onApply) {
    this.canvas = canvas;
    this.sim = sim;
    this.renderer = renderer;
    this.onApply = onApply;        // (gridX, gridY, isDrag) => void
    this.painting = false;
    this.lastCell = -1;
    this._bind();
  }

  cellFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const gx = Math.floor(px * this.sim.world.w);
    const gy = Math.floor(py * this.sim.world.h);
    return { gx: Math.max(0, Math.min(this.sim.world.w - 1, gx)),
             gy: Math.max(0, Math.min(this.sim.world.h - 1, gy)) };
  }

  _bind() {
    const c = this.canvas;
    const down = (e) => {
      e.preventDefault();
      this.painting = true;
      const { gx, gy } = this.cellFromEvent(e);
      this.lastCell = gy * this.sim.world.w + gx;
      this.onApply(gx, gy, false);
    };
    const move = (e) => {
      if (!this.painting) return;
      e.preventDefault();
      const { gx, gy } = this.cellFromEvent(e);
      const cell = gy * this.sim.world.w + gx;
      if (cell === this.lastCell) return;   // don't re-hit the same cell
      this.lastCell = cell;
      this.onApply(gx, gy, true);
    };
    const up = (e) => { this.painting = false; this.lastCell = -1; };

    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    // Stop iOS from scrolling / zooming when interacting with the map.
    c.style.touchAction = 'none';
  }
}
