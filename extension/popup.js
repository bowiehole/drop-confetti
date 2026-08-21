const MILESTONES = [100, 250, 500, 1000, 5000, 25000];
const STYLES = [
  ["tesla", "Tesla FSD"],
  ["rain", "Rain"],
  ["burst", "Burst"],
  ["cannon", "Cannons"],
];
const SCOPE_LABELS = {
  page: "This page",
  site: "This site",
  hour: "This hour",
  day: "Today",
  all: "All time",
};

const { formatStreak, SCROLL_MILESTONES, nextMilestone, pxToStreakMiles, HOURS_TO_FIRST } =
  globalThis.StreakUnits;

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
  tracking: true,
  target: 1,
  targetUnit: "mi",
  trackScope: "all",
  repeatTarget: true,
  trackMode: "scroll",
  trackUrl: "x.com",
};

const $ = (id) => document.getElementById(id);

function readForm() {
  return {
    miles: Number($("miles").value) || 0,
    unit: $("unit").value,
    label: $("label").value,
    style: state.style,
    badge: $("badge").checked,
    density: Number($("density").value),
    size: Number($("size").value),
    gravity: state.gravity,
    wind: state.wind,
    duration: state.duration,
    tracking: $("tracking").checked,
    target: 1,
    targetUnit: "mi",
    trackScope: "all",
    repeatTarget: true,
    trackMode: state.trackMode,
    trackUrl: $("trackUrl").value.trim() || "x.com",
  };
}

function applyState() {
  $("miles").value = state.miles;
  $("unit").value = state.unit;
  $("label").value = state.label;
  $("badge").checked = state.badge;
  $("density").value = state.density;
  $("size").value = state.size;
  $("densityVal").textContent = Number(state.density).toFixed(2);
  $("sizeVal").textContent = Number(state.size).toFixed(2);
  $("tracking").checked = state.tracking;
  $("trackUrl").value = state.trackUrl || "x.com";
  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === state.trackMode);
  });
  document.querySelectorAll("[data-mile]").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.mile) === Number(state.miles));
  });
  document.querySelectorAll("[data-style]").forEach((el) => {
    el.classList.toggle("active", el.dataset.style === state.style);
  });
}

function setStatus(text) {
  $("status").textContent = text || "";
}

function renderStats(stats) {
  if (!stats) return;
  const bucket = stats.allTime || 0;
  const miles = stats.miles ?? pxToStreakMiles(bucket);
  const next = stats.nextMilestone ?? nextMilestone(miles);
  $("statAll").textContent = formatStreak(stats.allTime);
  $("progressLabel").textContent = next ? `Next ${next} mi` : "All milestones reached";
  $("progressValue").textContent = next
    ? `${formatStreak(bucket)} / ${next} mi`
    : formatStreak(bucket);
  const prev = [...SCROLL_MILESTONES].reverse().find((m) => miles >= m) || 0;
  const span = (next || prev) - prev || 1;
  const pct = next ? Math.min(100, ((miles - prev) / span) * 100) : 100;
  $("progressBar").style.width = `${pct}%`;
  document.querySelectorAll("#autoMilestones .chip").forEach((el) => {
    const n = Number(el.dataset.auto);
    el.classList.toggle("hit", miles >= n);
    el.classList.toggle("next", next != null && n === next);
  });
  const live = $("live");
  const host = state.trackUrl || "x.com";
  const scrolling = state.trackMode === "scroll";
  if (stats.matching === false) {
    live.textContent = `Open ${host} to count`;
    live.classList.remove("on");
  } else if (stats.lastAt && Date.now() - stats.lastAt < 2500) {
    live.textContent = scrolling ? `Tracking ${host} — scroll just now` : `Tracking ${host} — movement just now`;
    live.classList.add("on");
  } else if (stats.allTime > 0) {
    const ago = stats.lastAt ? Math.round((Date.now() - stats.lastAt) / 1000) : 0;
    live.textContent = ago ? `Last ${scrolling ? "scroll" : "move"} on ${host} ${ago}s ago` : `Scroll on ${host}`;
    live.classList.remove("on");
  } else {
    live.textContent = `Scroll on ${host} — 1 mi takes ~${HOURS_TO_FIRST.toFixed(1)} h (100 mi at 70 mph)`;
    live.classList.remove("on");
  }
}

async function send(type, extra = {}) {
  const settings = { ...readForm(), ...extra };
  Object.assign(state, settings);
  applyState();
  setStatus("");
  const res = await chrome.runtime.sendMessage({ type, settings });
  if (!res?.ok) setStatus(res?.error || "Couldn't overlay this page.");
  return res;
}

async function saveTrackSettings() {
  const prevUrl = state.trackUrl;
  Object.assign(state, readForm());
  const res = await chrome.runtime.sendMessage({ type: "save-settings", settings: readForm() });
  if (res?.stats) renderStats(res.stats);
  if ((prevUrl || "x.com").toLowerCase() !== (state.trackUrl || "x.com").toLowerCase()) {
    setStatus(`Streak reset — now counting ${state.trackUrl || "x.com"}`);
  }
}

function buildChips() {
  const autoBox = $("autoMilestones");
  for (const n of SCROLL_MILESTONES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.auto = String(n);
    b.textContent = `${n} mi`;
    b.title = `FSD ${n * 100} mi ÷ 100`;
    autoBox.appendChild(b);
  }

  const milesBox = $("milestones");
  for (const n of MILESTONES) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.mile = String(n);
    b.textContent = n >= 1000 ? `${n / 1000}k` : String(n);
    b.addEventListener("click", () => send("fire", { miles: n }));
    milesBox.appendChild(b);
  }

  const stylesBox = $("styles");
  for (const [id, name] of STYLES) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.style = id;
    b.textContent = name;
    b.addEventListener("click", () => send("fire", { style: id }));
    stylesBox.appendChild(b);
  }
}

async function refreshStats() {
  if (!chrome?.runtime?.id) return;
  try {
    const res = await chrome.runtime.sendMessage({ type: "get-stats" });
    if (res?.stats) renderStats(res.stats);
  } catch {
    /* worker waking or context gone */
  }
}

function wheelPixels(e) {
  let x = e.deltaX;
  let y = e.deltaY;
  if (e.deltaMode === 1) {
    x *= 16;
    y *= 16;
  } else if (e.deltaMode === 2) {
    x *= 360;
    y *= 640;
  }
  return Math.hypot(x, y);
}

function trackPopupInput() {
  let mouseAcc = 0;
  let scrollAcc = 0;
  document.addEventListener(
    "mousemove",
    (e) => {
      mouseAcc += Math.hypot(e.movementX || 0, e.movementY || 0);
    },
    { passive: true }
  );
  document.addEventListener(
    "wheel",
    (e) => {
      scrollAcc += wheelPixels(e);
    },
    { passive: true }
  );
  setInterval(async () => {
    if (!$("tracking").checked) return;
    const kind = state.trackMode === "scroll" ? "scroll" : "mouse";
    const acc = kind === "scroll" ? scrollAcc : mouseAcc;
    if (acc < 0.5) return;
    if (kind === "scroll") scrollAcc = 0;
    else mouseAcc = 0;
    try {
      const res = await chrome.runtime.sendMessage({ type: "mouse-delta", kind, pixels: acc });
      if (res?.stats) renderStats(res.stats);
    } catch {
      if (kind === "scroll") scrollAcc += acc;
      else mouseAcc += acc;
    }
  }, 200);
}

async function init() {
  buildChips();
  const stored = await chrome.storage.local.get("settings");
  Object.assign(state, stored.settings || {});
  applyState();
  await refreshStats();
  trackPopupInput();

  $("miles").addEventListener("change", () => {
    state.miles = Number($("miles").value) || 0;
    applyState();
  });
  $("density").addEventListener("input", () => {
    $("densityVal").textContent = Number($("density").value).toFixed(2);
  });
  $("size").addEventListener("input", () => {
    $("sizeVal").textContent = Number($("size").value).toFixed(2);
  });
  $("fire").addEventListener("click", () => send("fire"));
  $("clear").addEventListener("click", () => send("clear"));
  $("sequence").addEventListener("click", () => send("sequence"));

  for (const id of ["tracking", "trackUrl"]) {
    $(id).addEventListener("change", saveTrackSettings);
  }
  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.addEventListener("click", async () => {
      state.trackMode = el.dataset.mode;
      applyState();
      await saveTrackSettings();
    });
  });
  $("resetScope").addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "reset-stats", scope: "all" });
    if (res?.stats) renderStats(res.stats);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.mouseStats?.newValue) {
      refreshStats();
    }
  });
  setInterval(refreshStats, 500);
}

init();
