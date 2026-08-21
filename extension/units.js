(() => {
  const PX_PER_INCH = 96;

  function pxToUnit(px, unit) {
    const inches = Number(px || 0) / PX_PER_INCH;
    if (unit === "px") return Number(px || 0);
    if (unit === "in") return inches;
    if (unit === "cm") return inches * 2.54;
    if (unit === "m") return inches * 0.0254;
    if (unit === "km") return (inches * 0.0254) / 1000;
    if (unit === "mi") return inches / 63360;
    return Number(px || 0);
  }

  function formatDist(px, unit) {
    const v = pxToUnit(px, unit);
    if (unit === "px") return `${Math.round(v).toLocaleString()} pixels`;
    if (!Number.isFinite(v)) return `0 ${unit}`;
    if (v >= 100) return `${v.toFixed(0)} ${unit}`;
    if (v >= 10) return `${v.toFixed(1)} ${unit}`;
    if (v >= 1) return `${v.toFixed(2)} ${unit}`;
    if (v >= 0.01) return `${v.toFixed(3)} ${unit}`;
    return `${v.toFixed(4)} ${unit}`;
  }

  function hourKey(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}`;
  }

  function dayKey(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function originOf(url = "") {
    try {
      return new URL(url).origin;
    } catch {
      return "";
    }
  }

  const FSD_MILESTONES = [100, 250, 500, 1000, 5000, 25000];
  const SCROLL_MILESTONES = FSD_MILESTONES.map((n) => n / 100);
  const DRIVE_MPH = 70;
  const FSD_FIRST_MI = FSD_MILESTONES[0];
  const HOURS_TO_FIRST = FSD_FIRST_MI / DRIVE_MPH;
  // Typical hour of actually scrolling a feed (~200 m of content).
  const REF_SCROLL_M_PER_HOUR = 200;
  const REF_SCROLL_PX_PER_HOUR = (REF_SCROLL_M_PER_HOUR / 0.0254) * PX_PER_INCH;
  const PX_PER_STREAK_MILE = REF_SCROLL_PX_PER_HOUR * HOURS_TO_FIRST;

  function pxToStreakMiles(px) {
    return Number(px || 0) / PX_PER_STREAK_MILE;
  }

  function formatStreak(px) {
    const v = pxToStreakMiles(px);
    if (!Number.isFinite(v)) return "0 mi";
    if (v >= 100) return `${v.toFixed(0)} mi`;
    if (v >= 10) return `${v.toFixed(1)} mi`;
    if (v >= 1) return `${v.toFixed(2)} mi`;
    return `${v.toFixed(2)} mi`;
  }

  function urlMatches(pageUrl, filter) {
    if (!filter || !String(filter).trim()) return true;
    if (!pageUrl) return false;
    const raw = String(filter).trim();
    try {
      const page = new URL(pageUrl);
      const want = new URL(raw.includes("://") ? raw : `https://${raw}`);
      const hostOk =
        page.hostname === want.hostname ||
        page.hostname.endsWith(`.${want.hostname}`) ||
        (want.hostname === "x.com" &&
          (page.hostname === "twitter.com" || page.hostname.endsWith(".twitter.com"))) ||
        (want.hostname === "twitter.com" &&
          (page.hostname === "x.com" || page.hostname.endsWith(".x.com")));
      if (!hostOk) return page.href.toLowerCase().includes(raw.toLowerCase());
      if (want.pathname && want.pathname !== "/") {
        return page.pathname.startsWith(want.pathname);
      }
      return true;
    } catch {
      return pageUrl.toLowerCase().includes(raw.toLowerCase());
    }
  }

  function nextMilestone(miles) {
    return SCROLL_MILESTONES.find((m) => miles < m) ?? null;
  }

  globalThis.StreakUnits = {
    PX_PER_INCH,
    pxToUnit,
    pxToStreakMiles,
    formatDist,
    formatStreak,
    hourKey,
    dayKey,
    originOf,
    FSD_MILESTONES,
    SCROLL_MILESTONES,
    DRIVE_MPH,
    HOURS_TO_FIRST,
    urlMatches,
    nextMilestone,
  };
})();
