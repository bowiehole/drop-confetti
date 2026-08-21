import { ConfettiEngine, TESLA_COLORS, PRESET_PALETTES } from "./confetti.js";
import { drawTeslaViz } from "./viz.js";

const MILESTONES = [100, 250, 500, 1000, 5000, 25000];
const STYLES = [
  ["tesla", "Tesla FSD"],
  ["rain", "Rain"],
  ["burst", "Burst"],
  ["cannon", "Cannons"],
];

const state = {
  miles: 1000,
  unit: "mi",
  label: "Streak Reached",
  style: "tesla",
  badge: true,
  density: 1,
  size: 1,
  gravity: 1,
  wind: 0,
  duration: 6500,
  colors: TESLA_COLORS.slice(),
  bg: "viz",
};

const $ = (id) => document.getElementById(id);
const fx = $("fx");
const bg = $("bg");
const photo = $("photo");
const engine = new ConfettiEngine(fx);
const bgCtx = bg.getContext("2d");
let vizRaf = 0;

function resize() {
  engine.resize();
  const rect = bg.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  bg.width = Math.round(rect.width * dpr);
  bg.height = Math.round(rect.height * dpr);
  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loopViz(t) {
  if (state.bg === "viz" && !photo.src) {
    const rect = bg.getBoundingClientRect();
    drawTeslaViz(bgCtx, rect.width, rect.height, t);
  } else if (state.bg !== "viz") {
    bgCtx.clearRect(0, 0, bg.width, bg.height);
  }
  vizRaf = requestAnimationFrame(loopViz);
}

function applyEngine() {
  engine.setConfig({
    colors: state.colors,
    density: state.density,
    size: state.size,
    gravity: state.gravity,
    wind: state.wind,
    duration: state.duration,
  });
}

function formatMiles(n) {
  return Number(n).toLocaleString("en-US");
}

function updateBadge() {
  const badge = $("badge");
  $("badgeMiles").textContent = `${formatMiles(state.miles)} ${state.unit}`;
  $("badgeLabel").textContent = state.label;
  badge.classList.toggle("on", false);
  $("hudStreak").innerHTML = `${formatMiles(state.miles)} ${state.unit}<br />Streak`;
}

function showBadge() {
  const badge = $("badge");
  if (!state.badge) {
    badge.classList.remove("on");
    return;
  }
  badge.classList.remove("on");
  void badge.offsetWidth;
  badge.classList.add("on");
  window.clearTimeout(showBadge._t);
  showBadge._t = window.setTimeout(() => badge.classList.remove("on"), state.duration + 900);
}

function fire() {
  applyEngine();
  showBadge();
  engine.celebrate(state.style);
}

function overlayUrl() {
  const url = new URL("overlay.html", location.href);
  const p = url.searchParams;
  p.set("miles", String(state.miles));
  p.set("unit", state.unit);
  p.set("label", state.label);
  p.set("style", state.style);
  p.set("badge", state.badge ? "1" : "0");
  p.set("density", String(state.density));
  p.set("size", String(state.size));
  p.set("gravity", String(state.gravity));
  p.set("wind", String(state.wind));
  p.set("duration", String(state.duration));
  p.set("auto", "1");
  p.set("bg", "transparent");
  p.set("colors", state.colors.map((c) => c.replace("#", "")).join(","));
  return url.toString();
}

function refreshOverlayBox() {
  $("overlayUrl").value = overlayUrl();
}

function setMiles(n) {
  state.miles = n;
  $("miles").value = n;
  document.querySelectorAll("[data-mile]").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.mile) === Number(n));
  });
  updateBadge();
  refreshOverlayBox();
}

function buildChips() {
  const milesBox = $("milestones");
  milesBox.innerHTML = "";
  for (const n of MILESTONES) {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.mile = String(n);
    b.textContent = n >= 1000 ? `${n / 1000}k` : String(n);
    b.addEventListener("click", () => {
      setMiles(n);
      fire();
    });
    milesBox.appendChild(b);
  }

  const stylesBox = $("styles");
  stylesBox.innerHTML = "";
  for (const [id, name] of STYLES) {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.style = id;
    b.textContent = name;
    b.addEventListener("click", () => {
      state.style = id;
      document.querySelectorAll("[data-style]").forEach((el) => {
        el.classList.toggle("active", el.dataset.style === id);
      });
      refreshOverlayBox();
      fire();
    });
    stylesBox.appendChild(b);
  }

  const palettes = $("palettes");
  palettes.innerHTML = "";
  for (const key of Object.keys(PRESET_PALETTES)) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = key;
    b.addEventListener("click", () => {
      state.colors = PRESET_PALETTES[key].slice();
      renderSwatches();
      applyEngine();
      refreshOverlayBox();
      fire();
    });
    palettes.appendChild(b);
  }
}

function renderSwatches() {
  const box = $("swatches");
  box.innerHTML = "";
  const all = Array.from(new Set([...TESLA_COLORS, ...state.colors]));
  for (const color of all) {
    const b = document.createElement("button");
    b.className = "swatch" + (state.colors.includes(color) ? " active" : "");
    b.style.background = color;
    b.title = color;
    b.addEventListener("click", () => {
      if (state.colors.includes(color)) {
        if (state.colors.length === 1) return;
        state.colors = state.colors.filter((c) => c !== color);
      } else {
        state.colors = [...state.colors, color];
      }
      renderSwatches();
      applyEngine();
      refreshOverlayBox();
    });
    box.appendChild(b);
  }
}

function bind() {
  $("miles").addEventListener("input", (e) => setMiles(Number(e.target.value) || 0));
  $("unit").addEventListener("change", (e) => {
    state.unit = e.target.value;
    updateBadge();
    refreshOverlayBox();
  });
  $("label").addEventListener("input", (e) => {
    state.label = e.target.value;
    updateBadge();
    refreshOverlayBox();
  });
  $("badgeOn").addEventListener("change", (e) => {
    state.badge = e.target.checked;
    updateBadge();
    refreshOverlayBox();
  });
  for (const id of ["density", "size", "gravity", "wind", "duration"]) {
    $(id).addEventListener("input", (e) => {
      const v = Number(e.target.value);
      state[id] = id === "duration" ? v : v;
      if (id === "duration") $(`${id}Val`).textContent = `${Math.round(v / 1000)}s`;
      else $(`${id}Val`).textContent = Number(v).toFixed(id === "wind" ? 1 : 2);
      applyEngine();
      refreshOverlayBox();
    });
  }
  $("addColor").addEventListener("input", (e) => {
    const color = e.target.value.toUpperCase();
    if (!state.colors.includes(color)) state.colors.push(color);
    renderSwatches();
    applyEngine();
    refreshOverlayBox();
  });
  $("fire").addEventListener("click", fire);
  $("clear").addEventListener("click", () => {
    engine.clear();
    $("badge").classList.remove("on");
  });
  $("copyOverlay").addEventListener("click", async () => {
    const url = overlayUrl();
    $("overlayUrl").value = url;
    try {
      await navigator.clipboard.writeText(url);
      $("copyOverlay").textContent = "Copied";
      setTimeout(() => {
        $("copyOverlay").textContent = "Copy overlay link";
      }, 1200);
    } catch {
      $("overlayUrl").select();
    }
  });
  $("openOverlay").addEventListener("click", () => {
    window.open(overlayUrl(), "_blank");
  });
  $("sequence").addEventListener("click", async () => {
    for (const n of [250, 500, 1000, 5000]) {
      setMiles(n);
      fire();
      await new Promise((r) => setTimeout(r, 2200));
    }
  });
  $("photoInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    photo.src = URL.createObjectURL(file);
    $("stage").classList.add("has-photo");
    $("hud").style.display = "none";
  });
  $("clearPhoto").addEventListener("click", () => {
    photo.removeAttribute("src");
    $("stage").classList.remove("has-photo");
    $("hud").style.display = "";
    $("photoInput").value = "";
  });
  $("fullscreen").addEventListener("click", () => {
    const el = $("stage");
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.code === "Space") {
      e.preventDefault();
      fire();
    }
    if (e.key === "c") engine.clear();
    if (e.key === "f") $("fullscreen").click();
  });

  const stage = $("stage");
  stage.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  stage.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    photo.src = URL.createObjectURL(file);
    stage.classList.add("has-photo");
    $("hud").style.display = "none";
  });
}

function init() {
  buildChips();
  renderSwatches();
  setMiles(state.miles);
  document.querySelectorAll("[data-style]").forEach((el) => {
    el.classList.toggle("active", el.dataset.style === state.style);
  });
  applyEngine();
  refreshOverlayBox();
  bind();
  resize();
  window.addEventListener("resize", resize);
  loopViz(0);
  setTimeout(fire, 350);
}

init();
