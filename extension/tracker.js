(() => {
  if (typeof globalThis.__streakTrackerCleanup === "function") {
    try {
      globalThis.__streakTrackerCleanup();
    } catch {
      /* old instance already dead */
    }
  }

  let stopped = false;
  let lastX = null;
  let lastY = null;
  let lastT = 0;
  let mouseAcc = 0;
  let scrollAcc = 0;
  let port = null;
  let timer = 0;
  let reconnectTimer = 0;
  let trackUrl = "x.com";
  let trackMode = "scroll";
  let tracking = true;

  function runtimeOk() {
    try {
      return !stopped && Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function pageMatches() {
    if (!tracking) return false;
    const raw = String(trackUrl || "x.com").trim().toLowerCase();
    const host = location.hostname.toLowerCase();
    if (raw === "x.com" || raw.includes("x.com") || raw.includes("twitter.com")) {
      return host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com");
    }
    return host === raw || host.endsWith(`.${raw}`) || location.href.toLowerCase().includes(raw);
  }

  function applySettings(settings) {
    if (!settings) return;
    trackUrl = settings.trackUrl || "x.com";
    trackMode = settings.trackMode || "scroll";
    tracking = settings.tracking !== false;
  }

  function cleanup() {
    stopped = true;
    globalThis.__streakTrackerAlive = false;
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = 0;
    }
    try {
      port?.disconnect();
    } catch {
      /* ignore */
    }
    port = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("scroll", onScroll, true);
  }

  globalThis.__streakTrackerCleanup = cleanup;
  globalThis.__streakTrackerAlive = true;

  function connect() {
    if (!runtimeOk()) {
      cleanup();
      return;
    }
    try {
      port = chrome.runtime.connect({ name: "mouse" });
      port.onDisconnect.addListener(() => {
        port = null;
        if (!runtimeOk()) {
          cleanup();
          return;
        }
        reconnectTimer = setTimeout(connect, 1500);
      });
    } catch {
      port = null;
      if (!runtimeOk()) cleanup();
    }
  }

  function send(kind, amount) {
    if (amount < 0.5) return 0;
    if (!runtimeOk()) {
      cleanup();
      return 0;
    }
    try {
      if (!port) connect();
      if (!port) return amount;
      port.postMessage({ type: "mouse-delta", kind, pixels: amount });
      return 0;
    } catch {
      port = null;
      return runtimeOk() ? amount : 0;
    }
  }

  function flush() {
    if (!runtimeOk()) {
      cleanup();
      return;
    }
    if (!pageMatches()) {
      mouseAcc = 0;
      scrollAcc = 0;
      return;
    }
    if (trackMode === "scroll") mouseAcc = 0;
    if (trackMode === "mouse") scrollAcc = 0;
    mouseAcc = send("mouse", mouseAcc);
    scrollAcc = send("scroll", scrollAcc);
  }

  function onMove(e) {
    if (trackMode !== "mouse" || !pageMatches()) return;
    const now = performance.now();
    let d = Math.hypot(e.movementX || 0, e.movementY || 0);
    if (d < 0.01 && lastX != null) {
      d = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    }
    if (d > 0 && d < 8000 && (lastT === 0 || now - lastT < 1500)) mouseAcc += d;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  }

  function onScroll(e) {
    if (trackMode !== "scroll" || !pageMatches()) return;
    const target = e.target === document ? document.scrollingElement : e.target;
    if (!target) return;
    if (!target.__streakScroll) {
      target.__streakScroll = {
        x: target.scrollLeft ?? window.scrollX,
        y: target.scrollTop ?? window.scrollY,
      };
    }
    const prev = target.__streakScroll;
    const x = target === document.scrollingElement ? window.scrollX : target.scrollLeft;
    const y = target === document.scrollingElement ? window.scrollY : target.scrollTop;
    const d = Math.hypot((x || 0) - prev.x, (y || 0) - prev.y);
    if (d > 0 && d < 20000) scrollAcc += d;
    prev.x = x || 0;
    prev.y = y || 0;
  }

  function onBlur() {
    lastX = null;
    lastY = null;
    flush();
  }

  try {
    chrome.storage.local.get("settings", ({ settings }) => applySettings(settings));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.settings?.newValue) applySettings(changes.settings.newValue);
    });
  } catch {
    /* context gone */
  }

  window.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("blur", onBlur);
  connect();
  timer = setInterval(flush, 800);
})();
