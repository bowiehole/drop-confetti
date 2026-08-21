(() => {
  if (globalThis.__streakOverlay) {
    return;
  }

  const { ConfettiEngine, TESLA_COLORS } = globalThis.StreakConfetti;
  const HOST_ID = "streak-confetti-host";

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .root {
        position: fixed;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }
      canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
      .badge {
        position: absolute;
        left: 50%;
        top: 38%;
        transform: translate(-50%, -50%) scale(0.92);
        text-align: center;
        color: #fff;
        opacity: 0;
        isolation: isolate;
        overflow: visible;
        background: none;
        border: 0;
        padding: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
        transition: opacity 280ms ease, transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .badge-halo {
        position: absolute;
        inset: -16px;
        border-radius: 28px;
        overflow: hidden;
        z-index: -1;
        pointer-events: none;
        filter: blur(18px);
      }
      .badge-rainbow {
        position: absolute;
        inset: -160%;
        border-radius: 24px;
        background: conic-gradient(from 0deg, #ff2e93, #ffd600, #7cff3a, #18ffff, #7c4dff, #ff2e93);
        opacity: 0.95;
        animation: badge-orbit 7s linear infinite;
        animation-play-state: paused;
      }
      .badge-face {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        min-width: 196px;
        padding: 16px 30px 14px;
        border-radius: 16px;
        background: rgba(22, 26, 34, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.28);
        box-shadow: 0 0 24px rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(18px) saturate(1.25);
      }
      .badge-face::before {
        content: "";
        position: absolute;
        inset: -160%;
        border-radius: 24px;
        background: conic-gradient(from 0deg, #ff2e93, #ffd600, #7cff3a, #18ffff, #7c4dff, #ff2e93);
        opacity: 0.88;
        z-index: 0;
        animation: badge-orbit 7s linear infinite;
        animation-play-state: paused;
      }
      .badge-face::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(16, 20, 28, 0.08));
        z-index: 0;
      }
      .badge.on {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      .badge.on .badge-rainbow,
      .badge.on .badge-face::before {
        animation-play-state: running;
      }
      @keyframes badge-orbit {
        to { transform: rotate(360deg); }
      }
      .miles {
        position: relative;
        z-index: 1;
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.03em;
        line-height: 1.05;
        text-shadow: 0 1px 10px rgba(0, 0, 0, 0.35);
      }
      .label {
        position: relative;
        z-index: 1;
        margin-top: 3px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.92);
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
      }
    </style>
    <div class="root">
      <canvas></canvas>
      <div class="badge">
        <div class="badge-halo">
          <div class="badge-rainbow"></div>
        </div>
        <div class="badge-face">
          <div class="miles">1,000 mi</div>
          <div class="label">Streak Reached</div>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(host);

  const canvas = shadow.querySelector("canvas");
  const badge = shadow.querySelector(".badge");
  const milesEl = shadow.querySelector(".miles");
  const labelEl = shadow.querySelector(".label");
  const engine = new ConfettiEngine(canvas);
  canvas.style.display = "none";
  engine.onEmpty = () => {
    canvas.style.display = "none";
  };

  function formatMiles(n) {
    return Number(n).toLocaleString("en-US");
  }

  function resize() {
    engine.resize();
  }

  function showBadge(settings) {
    if (!settings.badge) {
      badge.classList.remove("on");
      return;
    }
    milesEl.textContent = `${formatMiles(settings.miles)} ${settings.unit || "mi"}`;
    labelEl.textContent = settings.label || "Streak Reached";
    badge.classList.remove("on");
    void badge.offsetWidth;
    badge.classList.add("on");
    window.clearTimeout(showBadge._t);
    showBadge._t = window.setTimeout(
      () => badge.classList.remove("on"),
      (settings.duration || 6500) + 900
    );
  }

  function fire(settings) {
    canvas.style.display = "block";
    engine.resize();
    engine.setConfig({
      colors: settings.colors?.length ? settings.colors : TESLA_COLORS,
      density: Number(settings.density ?? 1),
      size: Number(settings.size ?? 1),
      gravity: Number(settings.gravity ?? 1),
      wind: Number(settings.wind ?? 0),
      duration: Number(settings.duration ?? 6500),
    });
    showBadge(settings);
    engine.celebrate(settings.style || "tesla");
  }

  function clear() {
    engine.clear();
    engine.stop();
    canvas.style.display = "none";
    badge.classList.remove("on");
  }

  window.addEventListener("resize", resize);
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === "streak-fire") {
      fire(msg.settings || {});
      reply({ ok: true });
    } else if (msg.type === "streak-clear") {
      clear();
      reply({ ok: true });
    }
    return false;
  });

  resize();
  globalThis.__streakOverlay = { fire, clear };
})();
