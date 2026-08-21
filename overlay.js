import { ConfettiEngine, TESLA_COLORS } from "./confetti.js";
import { drawTeslaViz } from "./viz.js";

function params() {
  const q = new URLSearchParams(location.search);
  const colors = (q.get("colors") || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => (c.startsWith("#") ? c : `#${c}`));
  return {
    miles: Number(q.get("miles") || 1000),
    unit: q.get("unit") || "mi",
    label: q.get("label") || "Streak Reached",
    style: q.get("style") || "tesla",
    badge: q.get("badge") !== "0",
    density: Number(q.get("density") || 1),
    size: Number(q.get("size") || 1),
    gravity: Number(q.get("gravity") || 1),
    wind: Number(q.get("wind") || 0),
    duration: Number(q.get("duration") || 6500),
    auto: q.get("auto") !== "0",
    loop: Number(q.get("loop") || 0),
    bg: q.get("bg") || "transparent",
    colors: colors.length ? colors : TESLA_COLORS.slice(),
  };
}

const cfg = params();
const root = document.getElementById("root");
const fx = document.getElementById("fx");
const bg = document.getElementById("bg");
const badge = document.getElementById("badge");
const engine = new ConfettiEngine(fx);
const bgCtx = bg.getContext("2d");

root.classList.add(`bg-${cfg.bg === "black" ? "black" : cfg.bg === "viz" ? "viz" : "transparent"}`);
if (cfg.bg !== "viz") bg.style.display = "none";

engine.setConfig({
  colors: cfg.colors,
  density: cfg.density,
  size: cfg.size,
  gravity: cfg.gravity,
  wind: cfg.wind,
  duration: cfg.duration,
});

function resize() {
  engine.resize();
  const rect = bg.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  bg.width = Math.round(rect.width * dpr);
  bg.height = Math.round(rect.height * dpr);
  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function formatMiles(n) {
  return Number(n).toLocaleString("en-US");
}

function setBadge(miles = cfg.miles, unit = cfg.unit, label = cfg.label) {
  document.getElementById("badgeMiles").textContent = `${formatMiles(miles)} ${unit}`;
  document.getElementById("badgeLabel").textContent = label;
}

function showBadge(on) {
  badge.classList.toggle("on", Boolean(on && cfg.badge));
}

function fire(next = {}) {
  const miles = next.miles ?? cfg.miles;
  const unit = next.unit ?? cfg.unit;
  const label = next.label ?? cfg.label;
  const style = next.style ?? cfg.style;
  setBadge(miles, unit, label);
  showBadge(true);
  engine.celebrate(style);
  window.clearTimeout(fire._t);
  fire._t = window.setTimeout(() => showBadge(false), (next.duration ?? cfg.duration) + 900);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    fire();
  }
  if (e.key === "c") {
    engine.clear();
    showBadge(false);
  }
});
window.addEventListener("click", () => fire());
window.addEventListener("message", (e) => {
  const data = e.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "confetti" || data.type === "streak") fire(data);
  if (data.type === "clear") {
    engine.clear();
    showBadge(false);
  }
});

resize();
setBadge();
if (cfg.bg === "viz") {
  const tick = (t) => {
    const rect = bg.getBoundingClientRect();
    drawTeslaViz(bgCtx, rect.width, rect.height, t);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (cfg.auto) fire();
if (cfg.loop > 0) setInterval(() => fire(), cfg.loop);
