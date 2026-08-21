importScripts("units.js");

const {
  pxToStreakMiles,
  hourKey,
  dayKey,
  originOf,
  SCROLL_MILESTONES,
  urlMatches,
  nextMilestone,
} = self.StreakUnits;

const DEFAULTS = {
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
  settingsVersion: 4,
};

const EMPTY_STATS = () => ({
  allTime: 0,
  hour: 0,
  day: 0,
  hourKey: hourKey(),
  dayKey: dayKey(),
  lastAt: 0,
  tabs: {},
  sites: {},
  fired: { page: {}, site: {}, hour: 0, day: 0, all: 0 },
});

let statsCache = null;
let saveTimer = null;
let lastCelebrateAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFilter(raw) {
  return String(raw || "").trim() || "x.com";
}

function filterKey(raw) {
  let host = normalizeFilter(raw).toLowerCase().replace(/^https?:\/\//, "");
  host = host.split("/")[0].replace(/^www\./, "");
  if (host === "twitter.com") return "x.com";
  return host;
}

function isRestricted(url = "") {
  return /^(chrome|chrome-extension|edge|about|devtools|https:\/\/chrome\.google\.com\/webstore|https:\/\/chromewebstore\.google\.com)/.test(
    url
  );
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  const merged = { ...DEFAULTS, ...(settings || {}) };
  if (!settings || Number(settings.settingsVersion) < 4) {
    merged.trackUrl = settings?.trackUrl ?? "x.com";
    merged.trackMode = settings?.trackMode || "scroll";
    merged.trackScope = "all";
    merged.targetUnit = "mi";
    merged.settingsVersion = 4;
    await chrome.storage.local.set({ settings: merged });
  }
  return merged;
}

function normalizeBank(raw) {
  const stats = { ...EMPTY_STATS(), ...(raw || {}) };
  stats.tabs = stats.tabs || {};
  stats.sites = stats.sites || {};
  const fired = stats.fired || {};
  stats.fired = {
    page: typeof fired.page === "object" && fired.page ? fired.page : {},
    site: typeof fired.site === "object" && fired.site ? fired.site : {},
    hour: Number(fired.hour) || 0,
    day: Number(fired.day) || 0,
    all: Number(fired.all) || 0,
  };
  return rollTime(stats);
}

function modeOf(settings, kind) {
  if (kind === "mouse" || kind === "scroll") return kind;
  return settings?.trackMode === "scroll" ? "scroll" : "mouse";
}

async function loadAll() {
  if (statsCache?.mouse && statsCache?.scroll) {
    rollTime(statsCache.mouse);
    rollTime(statsCache.scroll);
    return statsCache;
  }
  const { mouseStats } = await chrome.storage.local.get("mouseStats");
  if (mouseStats?.mouse || mouseStats?.scroll) {
    statsCache = {
      mouse: normalizeBank(mouseStats.mouse),
      scroll: normalizeBank(mouseStats.scroll),
    };
  } else if (mouseStats && typeof mouseStats.allTime === "number") {
    statsCache = { mouse: normalizeBank(mouseStats), scroll: EMPTY_STATS() };
  } else {
    statsCache = { mouse: EMPTY_STATS(), scroll: EMPTY_STATS() };
  }
  return statsCache;
}

async function loadStats(kind) {
  const settings = await getSettings();
  const all = await loadAll();
  return all[modeOf(settings, kind)];
}

function firedValue(stats, scope, tab) {
  if (scope === "page") return stats.fired.page[String(tab?.id || "")] || 0;
  if (scope === "site") return stats.fired.site[originOf(tab?.url || "")] || 0;
  return Number(stats.fired[scope]) || 0;
}

function setFiredValue(stats, scope, tab, value) {
  if (scope === "page" && tab?.id) stats.fired.page[String(tab.id)] = value;
  else if (scope === "site") {
    const origin = originOf(tab?.url || "");
    if (origin) stats.fired.site[origin] = value;
  } else {
    stats.fired[scope] = value;
  }
}

function rollTime(stats) {
  return stats;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chrome.storage.local.set({ mouseStats: statsCache });
  }, 1600);
}

function pruneSites(stats) {
  const entries = Object.entries(stats.sites || {});
  if (entries.length <= 80) return;
  entries.sort((a, b) => (b[1].pixels || 0) - (a[1].pixels || 0));
  stats.sites = Object.fromEntries(entries.slice(0, 80));
}

function bucketPixels(stats, scope, tab) {
  if (scope === "page") return stats.tabs[String(tab?.id)]?.pixels || 0;
  if (scope === "site") return stats.sites[originOf(tab?.url || "")]?.pixels || 0;
  if (scope === "hour") return stats.hour || 0;
  if (scope === "all") return stats.allTime || 0;
  return stats.day || 0;
}

function snapshot(stats, tab, settings) {
  const tabRec = stats.tabs[String(tab?.id)] || { pixels: 0, url: tab?.url || "" };
  const site = originOf(tab?.url || "");
  const scope = "all";
  const px = bucketPixels(stats, scope, tab);
  const miles = pxToStreakMiles(px);
  return {
    allTime: stats.allTime || 0,
    hour: stats.hour || 0,
    day: stats.day || 0,
    page: tabRec.pixels || 0,
    site: stats.sites[site]?.pixels || 0,
    siteHost: site,
    hourKey: stats.hourKey,
    dayKey: stats.dayKey,
    lastAt: stats.lastAt || 0,
    matching: urlMatches(tab?.url || "", settings?.trackUrl ?? "x.com"),
    pageUrl: tab?.url || "",
    miles,
    nextMilestone: nextMilestone(miles),
    milestones: SCROLL_MILESTONES,
  };
}

async function addDelta(pixels, tab, kind) {
  const settings = await getSettings();
  const mode = modeOf(settings);
  if (!settings.tracking || !(pixels > 0) || (kind && kind !== mode)) {
    return snapshot(await loadStats(mode), tab, settings);
  }
  if (!urlMatches(tab?.url || "", settings.trackUrl)) {
    return snapshot(await loadStats(mode), tab, settings);
  }

  const all = await loadAll();
  const stats = all[mode];
  stats.allTime += pixels;
  stats.hour += pixels;
  stats.day += pixels;
  stats.lastAt = Date.now();

  if (tab?.id) {
    const id = String(tab.id);
    if (!stats.tabs[id]) stats.tabs[id] = { url: tab.url || "", pixels: 0 };
    stats.tabs[id].url = tab.url || stats.tabs[id].url || "";
    stats.tabs[id].pixels += pixels;

    const origin = originOf(tab.url || "");
    if (origin) {
      const rec = stats.sites[origin] || { pixels: 0 };
      rec.pixels += pixels;
      stats.sites[origin] = rec;
      pruneSites(stats);
    }
  }

  scheduleSave();
  await maybeCelebrate(stats, tab, settings);
  return snapshot(stats, tab, settings);
}

async function maybeCelebrate(stats, tab, settings) {
  if (!tab?.id || isRestricted(tab.url || "")) return;
  if (!urlMatches(tab.url || "", settings.trackUrl)) return;

  const scope = "all";
  const px = bucketPixels(stats, scope, tab);
  const miles = pxToStreakMiles(px);
  const prev = firedValue(stats, scope, tab);
  const crossed = SCROLL_MILESTONES.filter((m) => m > prev && miles >= m);
  if (!crossed.length) return;
  if (Date.now() - lastCelebrateAt < 2500) return;

  const reached = crossed[0];
  setFiredValue(stats, scope, tab, reached);
  scheduleSave();
  lastCelebrateAt = Date.now();

  try {
    await fireOnTab(tab, {
      miles: reached,
      unit: "mi",
      label: "Streak Reached",
    });
  } catch {
    /* restricted or gone */
  }
}

async function resetStats(scope, tab) {
  const settings = await getSettings();
  const mode = modeOf(settings);
  const all = await loadAll();
  const stats = all[mode];
  if (scope === "page" && tab?.id) {
    const rec = stats.tabs[String(tab.id)];
    if (rec) rec.pixels = 0;
    delete stats.fired.page[String(tab.id)];
  } else if (scope === "site" && tab?.url) {
    const origin = originOf(tab.url);
    if (origin && stats.sites[origin]) stats.sites[origin].pixels = 0;
    delete stats.fired.site[origin];
  } else if (scope === "hour") {
    stats.hour = 0;
    stats.fired.hour = 0;
  } else if (scope === "day") {
    stats.day = 0;
    stats.fired.day = 0;
  } else if (scope === "all") {
    all[mode] = EMPTY_STATS();
    scheduleSave();
    return snapshot(all[mode], tab, settings);
  }
  scheduleSave();
  return snapshot(stats, tab, settings);
}

async function inject(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["engine.js", "content.js"],
  });
}

async function send(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await inject(tabId);
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function fireOnTab(tab, overrides = {}) {
  if (!tab?.id || isRestricted(tab.url || "")) {
    throw new Error("This page can't run extensions.");
  }
  const settings = { ...(await getSettings()), ...overrides };
  return send(tab.id, { type: "streak-fire", settings });
}

async function clearOnTab(tab) {
  if (!tab?.id || isRestricted(tab.url || "")) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "streak-clear" });
  } catch {
    /* nothing injected yet */
  }
}

async function sequenceOnTab(tab) {
  for (const miles of [250, 500, 1000, 5000]) {
    await fireOnTab(tab, { miles });
    await sleep(2200);
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function tabForDelta(sender, msg) {
  if (sender.tab) return sender.tab;
  if (msg.tabId) {
    try {
      return await chrome.tabs.get(msg.tabId);
    } catch {
      /* gone */
    }
  }
  return activeTab();
}

async function ensureTracker(tabId) {
  try {
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(globalThis.__streakTrackerAlive),
    });
    if (probe?.result) return;
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["tracker.js"],
    });
  } catch {
    /* restricted tab */
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "mouse") return;
  port.onMessage.addListener((msg) => {
    if (msg?.type === "mouse-delta") {
      addDelta(Number(msg.pixels) || 0, port.sender?.tab, msg.kind);
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "mouse-delta") {
      const tab = await tabForDelta(sender, msg);
      const snap = await addDelta(Number(msg.pixels) || 0, tab, msg.kind);
      reply({ ok: true, stats: snap });
      return;
    }

    const tab = msg.tabId ? await chrome.tabs.get(msg.tabId) : sender.tab || (await activeTab());

    if (msg.type === "get-stats") {
      const settings = await getSettings();
      reply({ ok: true, stats: snapshot(await loadStats(), tab, settings), settings });
      return;
    }

    if (msg.type === "reset-stats") {
      reply({ ok: true, stats: await resetStats(msg.scope || "day", tab) });
      return;
    }

    if (msg.settings) {
      const current = await getSettings();
      const next = { ...current, ...msg.settings };
      next.trackUrl = normalizeFilter(next.trackUrl);
      if (filterKey(current.trackUrl) !== filterKey(next.trackUrl)) {
        const all = await loadAll();
        all.mouse = EMPTY_STATS();
        all.scroll = EMPTY_STATS();
        scheduleSave();
      }
      await chrome.storage.local.set({ settings: next });
    }

    if (msg.type === "save-settings") {
      reply({ ok: true, stats: snapshot(await loadStats(), tab, await getSettings()) });
      return;
    }
    if (msg.type === "fire") await fireOnTab(tab, msg.settings || {});
    else if (msg.type === "clear") await clearOnTab(tab);
    else if (msg.type === "sequence") await sequenceOnTab(tab);
    reply({ ok: true });
  })().catch((err) => reply({ ok: false, error: err.message }));
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  const tab = await activeTab();
  try {
    if (command === "fire-streak") await fireOnTab(tab);
    if (command === "clear-streak") await clearOnTab(tab);
  } catch {
    /* restricted page */
  }
});

async function injectAllTrackers() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    if (tab.id) await ensureTracker(tab.id);
  }
}

chrome.runtime.onInstalled.addListener(injectAllTrackers);
chrome.runtime.onStartup.addListener(injectAllTrackers);

chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  if (change.status === "complete" && change.url) await ensureTracker(tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const all = await loadAll();
  for (const stats of [all.mouse, all.scroll]) {
    delete stats.tabs[String(tabId)];
    delete stats.fired.page[String(tabId)];
  }
  scheduleSave();
});


