// soundscape.js - Generative request-flow wave & particle canvas visualizer for Humming (Visual Only)

(function () {
  'use strict';

  class HummingVisualizer {
    constructor() {
      this.canvas = document.getElementById('soundscape-canvas');
      this.heroCanvas = document.getElementById('hero-wave-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.heroCtx = this.heroCanvas ? this.heroCanvas.getContext('2d') : null;
      
      this.mode = 'fast-path'; // 'fast-path', 'plugin-mesh', 'forward', 'minimal'
      this.time = 0;
      this.isRunning = true;

      this.modeConfigs = {
        'fast-path': {
          speed: 0.025,
          waves: [
            { amp: 45, freq: 0.008, color: 'rgba(56, 189, 248, 0.45)', width: 2 },
            { amp: 30, freq: 0.015, color: 'rgba(129, 140, 248, 0.35)', width: 1.5 },
            { amp: 60, freq: 0.005, color: 'rgba(255, 255, 255, 0.25)', width: 1 },
          ],
          particles: 40
        },
        'plugin-mesh': {
          speed: 0.018,
          waves: [
            { amp: 35, freq: 0.018, color: 'rgba(244, 114, 182, 0.45)', width: 2 },
            { amp: 55, freq: 0.010, color: 'rgba(168, 85, 247, 0.35)', width: 1.8 },
            { amp: 25, freq: 0.024, color: 'rgba(56, 189, 248, 0.3)', width: 1.2 },
          ],
          particles: 55
        },
        'forward': {
          speed: 0.032,
          waves: [
            { amp: 50, freq: 0.012, color: 'rgba(52, 211, 153, 0.45)', width: 2 },
            { amp: 40, freq: 0.018, color: 'rgba(56, 189, 248, 0.35)', width: 1.5 },
            { amp: 70, freq: 0.006, color: 'rgba(251, 191, 36, 0.25)', width: 1 },
          ],
          particles: 50
        },
        'minimal': {
          speed: 0.012,
          waves: [
            { amp: 25, freq: 0.006, color: 'rgba(255, 255, 255, 0.5)', width: 1.8 },
            { amp: 20, freq: 0.010, color: 'rgba(148, 163, 184, 0.3)', width: 1.2 },
            { amp: 35, freq: 0.004, color: 'rgba(56, 189, 248, 0.2)', width: 1 },
          ],
          particles: 25
        }
      };

      this.particles = [];
      this.init();
    }

    init() {
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
      this.initParticles();
      this.initModeTriggers();
      this.animate();
    }

    resize() {
      if (this.canvas) {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
      }
      if (this.heroCanvas) {
        const rect = this.heroCanvas.getBoundingClientRect();
        this.heroWidth = this.heroCanvas.width = rect.width * (window.devicePixelRatio || 1);
        this.heroHeight = this.heroCanvas.height = rect.height * (window.devicePixelRatio || 1);
      }
    }

    initParticles() {
      this.particles = [];
      const count = 50;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * (this.width || window.innerWidth),
          y: Math.random() * (this.height || window.innerHeight),
          radius: Math.random() * 1.8 + 0.6,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          alpha: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    setMode(modeName) {
      if (this.modeConfigs[modeName]) {
        this.mode = modeName;
      }
    }

    initModeTriggers() {
      const modeButtons = document.querySelectorAll('[data-sound-mode]');
      modeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-sound-mode');
          modeButtons.forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          this.setMode(mode);
          this.pulseWave(1.8);
        });
      });
    }

    pulseWave(multiplier = 1.5) {
      const config = this.modeConfigs[this.mode];
      if (!config) return;
      config.waves.forEach((w) => {
        const originalAmp = w.amp;
        w.amp *= multiplier;
        setTimeout(() => {
          w.amp = originalAmp;
        }, 600);
      });
    }

    renderHeroWave() {
      if (!this.heroCtx || !this.heroCanvas) return;
      const ctx = this.heroCtx;
      const w = this.heroWidth;
      const h = this.heroHeight;
      ctx.clearRect(0, 0, w, h);

      const config = this.modeConfigs[this.mode] || this.modeConfigs['fast-path'];
      const centerY = h * 0.52;

      config.waves.forEach((wave, waveIdx) => {
        ctx.beginPath();
        ctx.lineWidth = wave.width * (window.devicePixelRatio || 1);
        ctx.strokeStyle = wave.color;
        ctx.lineCap = 'round';

        const step = 6;
        for (let x = 0; x <= w; x += step) {
          const normX = x / w;
          const envelope = Math.sin(normX * Math.PI); // Pin ends to zero
          const y =
            centerY +
            Math.sin(x * wave.freq + this.time * config.speed * 45 + waveIdx * 1.5) *
              wave.amp *
              envelope *
              (1 + Math.sin(this.time * 0.8 + waveIdx) * 0.25);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });
    }

    renderBackdrop() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      // Render subtle floating particles
      this.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const currentAlpha = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
        ctx.fillStyle = `rgba(180, 210, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    animate() {
      if (!this.isRunning) return;
      this.time += 0.016;

      this.renderBackdrop();
      this.renderHeroWave();

      requestAnimationFrame(() => this.animate());
    }
  }

  window.HummingVisualizer = HummingVisualizer;
  document.addEventListener('DOMContentLoaded', () => {
    window.soundscapeInstance = new HummingVisualizer();
  });
})();
