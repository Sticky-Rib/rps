(function () {
  const fpsMonitor = {
    fps: 0,
    frames: 0,
    lastTime: performance.now(),
    enabled: true,
    start(ctx) {
      this.ctx = ctx;
    },
    update() {
      if (!this.enabled) return;
      this.frames++;
      const now = performance.now();
      if (now - this.lastTime >= 1000) {
        this.fps = this.frames;
        this.frames = 0;
        this.lastTime = now;
      }
    },
    draw() {
      if (!this.enabled || !this.ctx) return;
      this.ctx.fillStyle = this.fps < 30 ? 'red' : 'green';
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`FPS: ${this.fps}`, 10, 80);
    },
    toggle() {
      this.enabled = !this.enabled;
    }
  };

  // Expose globally
  window.fpsMonitor = fpsMonitor;
})();