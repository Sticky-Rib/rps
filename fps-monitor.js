// fps-monitor.js (module version)

export const fpsMonitor = {
  fps: 0,
  lastTime: performance.now(),
  frames: 0,

  start(ctx) {
    this.ctx = ctx;
    this.lastTime = performance.now();
    this.frames = 0;
  },

  update() {
    const now = performance.now();
    this.frames++;

    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
    }
  },

  draw() {
    if (!this.ctx) return;
    this.ctx.fillStyle = 'black';
    this.ctx.font = '14px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${this.fps} fps`, 10, 84);
}
};