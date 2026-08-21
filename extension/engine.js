const TESLA_COLORS = [
  "#FF1B94",
  "#FA1B84",
  "#FF2DB8",
  "#F020C8",
  "#E127E4",
  "#C828E0",
  "#A92AE5",
  "#7F33DD",
  "#FF140C",
  "#F36821",
  "#F0A818",
  "#F3CE1B",
  "#D4E41E",
  "#8FD42A",
  "#7CD43E",
  "#005FFA",
  "#2EC8B8",
];

const PRESET_PALETTES = {
  tesla: TESLA_COLORS,
  gold: ["#FFE082", "#FFD54F", "#FFC107", "#FFB300", "#FF8F00", "#FFF8E1", "#FFECB3"],
  cyber: ["#00F0FF", "#39FF14", "#FF003C", "#F8F8F8", "#7DF9FF"],
  ice: ["#E3F2FD", "#90CAF9", "#4FC3F7", "#00BCD4", "#B2EBF2", "#FFFFFF"],
  sunset: ["#FF6B6B", "#FF8E53", "#FFC857", "#FF4D8D", "#C44569"],
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.particles = [];
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.emitters = [];
    this.dpr = 1;
    this.width = 0;
    this.height = 0;
    this.config = {
      colors: TESLA_COLORS.slice(),
      density: 1,
      size: 1,
      gravity: 1,
      wind: 0,
      duration: 6500,
      drift: 1,
    };
    this.onEmpty = null;
    this.resize();
  }

  setConfig(partial) {
    Object.assign(this.config, partial);
    if (partial.colors) this.config.colors = partial.colors.slice();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    this.particles.length = 0;
    this.emitters.length = 0;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(32, now - this.last);
      this.last = now;
      this.tick(dt, now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  celebrate(style = "tesla", extra = {}) {
    const intensity = this.config.density;
    const count = Math.round((extra.count ?? 560) * intensity);
    if (style === "burst") {
      this.burst({ count, x: this.width * 0.5, y: this.height * 0.28, spread: Math.PI, force: 11 });
    } else if (style === "cannon") {
      this.burst({ count: count * 0.5, x: 0, y: this.height * 0.7, angle: -0.7, spread: 0.7, force: 16 });
      this.burst({ count: count * 0.5, x: this.width, y: this.height * 0.7, angle: Math.PI + 0.7, spread: 0.7, force: 16 });
    } else if (style === "rain") {
      this.rain({ count, duration: this.config.duration });
    } else {
      this.tesla({ count, duration: this.config.duration });
    }
    this.start();
  }

  tesla({ count = 560, duration = 6500 } = {}) {
    const w = this.width;
    const h = this.height;
    const dump = Math.round(count * 0.55);
    for (let i = 0; i < dump; i++) {
      this.spawnPaper({
        x: rand(-16, w + 16),
        y: rand(-h * 0.55, -10),
        vx: rand(-0.55, 0.55) * this.config.drift,
        vy: rand(2.4, 5.8),
        delay: rand(0, 480),
        lifetime: rand(4600, 8400),
        large: Math.random() < 0.13,
      });
    }
    this.emitters.push({
      kind: "rain",
      until: performance.now() + duration * 0.88,
      perSec: count * 0.15,
      carry: 0,
    });
  }

  rain({ count = 360, duration = 6500 } = {}) {
    this.emitters.push({
      kind: "rain",
      until: performance.now() + duration,
      perSec: count / (duration / 1000),
      carry: 0,
    });
  }

  burst({ count = 220, x, y, angle = -Math.PI / 2, spread = Math.PI, force = 12 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-spread / 2, spread / 2);
      const f = force * rand(0.35, 1.15);
      this.spawnPaper({
        x,
        y,
        vx: Math.cos(a) * f,
        vy: Math.sin(a) * f,
        delay: rand(0, 90),
        lifetime: rand(2800, 5600),
        large: Math.random() < 0.1,
      });
    }
  }

  spawnPaper({ x, y, vx, vy, delay = 0, lifetime = 5000, large = false }) {
    if (this.particles.length >= 720) return;
    const colors = this.config.colors.length ? this.config.colors : TESLA_COLORS;
    const s = this.config.size;
    let pw;
    let ph;
    if (large) {
      pw = rand(10, 22) * s;
      ph = rand(28, 78) * s;
    } else if (Math.random() < 0.22) {
      pw = rand(7, 14) * s;
      ph = rand(10, 18) * s;
    } else {
      pw = rand(3.2, 8.5) * s;
      ph = rand(8, 22) * s;
    }

    this.particles.push({
      x,
      y,
      w: pw,
      h: ph,
      vx,
      vy,
      rot: rand(0, Math.PI * 2),
      rotv: rand(-0.18, 0.18),
      flip: rand(0, Math.PI * 2),
      flipv: rand(0.04, 0.14) * (Math.random() < 0.5 ? -1 : 1),
      wobble: rand(0, Math.PI * 2),
      wobblev: rand(0.02, 0.07),
      color: pick(colors),
      delay,
      born: performance.now(),
      life: lifetime,
      drag: large ? 0.992 : 0.988,
      g: (large ? 0.028 : 0.042) * this.config.gravity,
    });
  }

  tick(dt, now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      if (now > em.until) {
        this.emitters.splice(i, 1);
        continue;
      }
      if (em.kind === "rain") {
        em.carry += em.perSec * (dt / 1000);
        while (em.carry >= 1) {
          em.carry -= 1;
          this.spawnPaper({
            x: rand(-16, this.width + 16),
            y: rand(-90, -12),
            vx: rand(-0.5, 0.5) * this.config.drift + this.config.wind * 0.6,
            vy: rand(2.4, 5.6),
            delay: 0,
            lifetime: rand(3800, 7000),
            large: Math.random() < 0.1,
          });
        }
      }
    }

    const wind = this.config.wind;
    const parts = this.particles;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      const age = now - p.born;
      if (age < p.delay) continue;

      p.vy += p.g * dt * 0.06;
      p.vx += wind * 0.0018 * dt;
      p.vx += Math.sin(p.wobble) * 0.012 * this.config.drift;
      p.vx *= p.drag;
      p.vy *= 0.999;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.rot += p.rotv * dt * 0.06;
      p.flip += p.flipv * dt * 0.06;
      p.wobble += p.wobblev * dt * 0.06;

      const t = (age - p.delay) / p.life;
      if (t >= 1 || p.y > this.height + 80) {
        parts.splice(i, 1);
        continue;
      }

      let alpha = 1;
      if (t > 0.72) alpha = 1 - (t - 0.72) / 0.28;
      if (age - p.delay < 90) alpha *= (age - p.delay) / 90;

      const flip = Math.cos(p.flip);
      const sx = Math.max(0.12, Math.abs(flip));
      const shade = 0.62 + 0.38 * Math.abs(flip);
      const rgb = hexToRgb(p.color);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(sx, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${Math.round(rgb.r * shade)},${Math.round(rgb.g * shade)},${Math.round(rgb.b * shade)})`;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (!parts.length && !this.emitters.length) {
      this.stop();
      if (this.onEmpty) this.onEmpty();
    }
  }
}

globalThis.StreakConfetti = { ConfettiEngine, TESLA_COLORS, PRESET_PALETTES };
