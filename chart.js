/* BTC vs 200W SMA — three zones (PADDLE / RIDE / KICK-OUT).
   Weekly or monthly high-low bars (real OHLC from CRYPTO:BTCUSD), Relative / Price and Weekly / Monthly toggles. Live Bitstamp USD
   (no key), falling back to Kraken, then Coinbase, then the cached close. On-page mobile: CSS
   width + DPR backing store. Share PNG is the 1200-wide desktop
   card; height grows slightly for header-to-plot gap. Live-dot
   radius equals the line width (CSS/layout px, then multiplied
   only by DPR). Local preview only. */
(function () {
  "use strict";
  const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif';
  const BG = "#12161c", GRID = "#272d36", AX = "#b0b6bf";
  const GREY = "#c9ced6", LINE = "#6b7583", INK = "#f2f1ec";
  const SMA_C = "#8a919c";
  const ZONES = {
    paddle: { id: "paddle", name: "ACCUMULATION", color: "#0CD7F1",
      range: "below 1\u00d7", gloss: "build while it's quiet",
      action: "DCA in" },
    ride:   { id: "ride",   name: "NEUTRAL", color: "#e6e8eb",
      range: "1\u00d7\u20132\u00d7", gloss: "stay in, keep the plan",
      action: "HODL" },
    kick:   { id: "kick",   name: "DISTRIBUTION", color: "#ff9800",
      range: "above 2\u00d7", gloss: "take some profit",
      action: "DCA out" },
  };
  const ZONE_ORDER = ["paddle", "ride", "kick"];
  const SHARE_W = 1200, SHARE_H = 675, SHARE_D = 2;
  // Share export only: extra space under the header so the site name
  // and handle don't sit on the plot. On-page layout is unchanged.
  const SHARE_PLOT_SHIFT = 32;
  const SHARE_HANDLE_DY = 26; // gap from site-name baseline to the handle
  const SHARE_KEY_SHIFT = 14; // extra gap from year labels to the zone key
  // Regular-view SMA legend only: a little extra space under the year
  // labels so they don't sit tight. Multiple is unchanged. Share Regular
  // uses this on top of SHARE_KEY_SHIFT; Share Multiple does not.
  const PRICE_LEGEND_DY = 12;
  // On-page desktop only: lift the coin title and handle together so
  // Regular and Multiple share the same top gap. Share keeps the original ty.
  const PRICE_TITLE_DY = 9;
  // Legend moved off the card; the plot uses that space. Year labels
  // still sit ~31px above the metrics divider.
  const DESKTOP_ST = {
    Pd: 56, Rgt: 4,
    tt: 36, ty: 82, wm: 20, wmc: "#8a919c",
    fs: 17.5, T: 108, B: 516, yr: 26,
    lg: 16.5, ly: 499, lh: 22, ny: 578,
    ml: 16, mlc: "#a7adb6", mv: 30,
    mly: 26, mvy: 62,
    lw: 3, smaw: 1.25, yearStep: 2,
  };
  const DAY = 864e5, PADW = 43, PADM = 10, MOBILE_MAX = 720;
  const LEFT_BARS = 3; // small margin before the first bar, in bars
  const BS = "https://www.bitstamp.net/api/v2/ticker/";
  const KK = "https://api.kraken.com/0/public/Ticker?pair=";
  const CB = "https://api.exchange.coinbase.com/products/";
  const COIN_DEFS = {
    btc:  { id: "btc",  name: "BTC",  data: "data/btc-weekly.json",
            monthly: "data/btc-monthly.json",
            unit: "Price", liveUrl: BS + "btcusd", liveSrc: "Bitstamp BTCUSD",
            liveFallback: KK + "XBTUSD", liveFallbackSrc: "Kraken XBTUSD",
            liveFallback2: CB + "BTC-USD/ticker", liveFallback2Src: "Coinbase BTC-USD" },
    eth:  { id: "eth",  name: "ETH",  data: "data/eth-weekly.json",
            monthly: "data/eth-monthly.json",
            unit: "Price", liveUrl: BS + "ethusd", liveSrc: "Bitstamp ETHUSD",
            liveFallback: KK + "ETHUSD", liveFallbackSrc: "Kraken ETHUSD",
            liveFallback2: CB + "ETH-USD/ticker", liveFallback2Src: "Coinbase ETH-USD" },
    ltc:  { id: "ltc",  name: "LTC",  data: "data/ltc-weekly.json",
            monthly: "data/ltc-monthly.json",
            unit: "Price", liveUrl: BS + "ltcusd", liveSrc: "Bitstamp LTCUSD",
            liveFallback: KK + "LTCUSD", liveFallbackSrc: "Kraken LTCUSD",
            liveFallback2: CB + "LTC-USD/ticker", liveFallback2Src: "Coinbase LTC-USD" },
    doge: { id: "doge", name: "DOGE", data: "data/doge-weekly.json",
            monthly: "data/doge-monthly.json",
            unit: "Price", liveUrl: BS + "dogeusd", liveSrc: "Bitstamp DOGEUSD",
            liveFallback: KK + "XDGUSD", liveFallbackSrc: "Kraken XDGUSD",
            liveFallback2: CB + "DOGE-USD/ticker", liveFallback2Src: "Coinbase DOGE-USD" },
    dash: { id: "dash", name: "DASH", data: "data/dash-weekly.json",
            monthly: "data/dash-monthly.json",
            unit: "Price", liveUrl: KK + "DASHUSD", liveSrc: "Kraken DASHUSD",
            liveFallback: CB + "DASH-USD/ticker", liveFallbackSrc: "Coinbase DASH-USD" },
    zec:  { id: "zec",  name: "ZEC",  data: "data/zec-weekly.json",
            monthly: "data/zec-monthly.json",
            unit: "Price", liveUrl: BS + "zecusd", liveSrc: "Bitstamp ZECUSD",
            liveFallback: KK + "ZECUSD", liveFallbackSrc: "Kraken ZECUSD",
            liveFallback2: CB + "ZEC-USD/ticker", liveFallback2Src: "Coinbase ZEC-USD" },
    totales: { id: "totales", name: "TOTALES", data: "data/totales-weekly.json",
            monthly: "data/totales-monthly.json",
            unit: "Market cap", liveUrl: null, liveSrc: "" },
    others: { id: "others", name: "OTHERS", data: "data/others-weekly.json",
            monthly: "data/others-monthly.json",
            unit: "Market cap", liveUrl: null, liveSrc: "" },
    total2es: { id: "total2es", name: "TOTAL2ES", data: "data/total2es-weekly.json",
            monthly: "data/total2es-monthly.json",
            unit: "Market cap", liveUrl: null, liveSrc: "" },
    total3es: { id: "total3es", name: "TOTAL3ES", data: "data/total3es-weekly.json",
            monthly: "data/total3es-monthly.json",
            unit: "Market cap", liveUrl: null, liveSrc: "" },
    xmr:  { id: "xmr",  name: "XMR",  data: "data/xmr-weekly.json",
            monthly: "data/xmr-monthly.json",
            unit: "Price", liveUrl: KK + "XMRUSD", liveSrc: "Kraken XMRUSD" },
  };

  const Q = new URLSearchParams(location.search);
  const COIN = COIN_DEFS[(Q.get("coin") || "btc").toLowerCase()] || COIN_DEFS.btc;
  const LIVE_URL = COIN.liveUrl || null;
  const LIVE_SRC = COIN.liveSrc;
  const SHARE = Q.get("share") === "1" || Q.get("cache") === "1";
  // Chart state lives in the URL (coin, view, tf, style, range or from/to),
  // so a copied link opens the same chart. Old ?mode=price links still work.
  const START = (Q.get("view") || "").toLowerCase() === "regular" || Q.get("mode") === "price" ? "price" : "relative";
  const START_TF = Q.get("tf") === "monthly" ? "monthly" : "weekly";
  const START_STYLE = Q.get("style") === "line" ? "line" : "candle";
  const START_RANGE = (function () {
    const r = (Q.get("range") || "").toLowerCase();
    if (r === "1y" || r === "4y") return { range: r };
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const a = Q.get("from"), b = Q.get("to");
    if (a && b && iso.test(a) && iso.test(b)) {
      const t0 = Date.parse(a + "T00:00:00Z"), t1 = Date.parse(b + "T00:00:00Z");
      if (isFinite(t0) && isFinite(t1) && t1 > t0) return { range: "custom", view: { t0: t0, t1: t1 } };
    }
    return { range: "all" };
  })();
  const START_PANELS = (function () {
    const v = (Q.get("panels") || "").toLowerCase().replace(/\s+/g, "");
    if (v === "rsi") return { showPrice: false, showRsi: true };
    if (v === "both" || v === "price,rsi" || v === "rsi,price") {
      return { showPrice: true, showRsi: true };
    }
    // Default, bare links, and old ?panels=price: price only.
    return { showPrice: true, showRsi: false };
  })();
  const SHARE_CARD = (Q.get("card") || "").toLowerCase();

  const CARD_DEFS = [{
    id: "200w", n: 200, smaLabel: "200W SMA", short: "200W",
    titleRel: COIN.name + " vs 200W SMA",
    titlePrice: COIN.name,
    ariaRel: COIN.name + " versus 200-week SMA, weekly high-low bars, multiple, three zones",
    ariaPrice: COIN.name + " " + (COIN.unit === "Market cap" ? "market cap" : "price") + " versus 200-week SMA, weekly high-low bars, three zones",
    file: COIN.id + "-200w-weekly",
  }];

  function zoneOfR(r) {
    if (!(r > 0) || !isFinite(r)) return "ride";
    if (r <= 1) return "paddle";
    if (r < 2) return "ride";
    return "kick";
  }
  function zoneColor(r) { return ZONES[zoneOfR(r)].color; }

  function px(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
  function dec(v, d) {
    return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fv(v) {
    const a = Math.abs(v);
    if (a >= 1e12) return "$" + dec(v / 1e12, 2) + "T";
    if (a >= 1e9) return "$" + dec(v / 1e9, 2) + "B";
    if (a >= 1e6) return "$" + dec(v / 1e6, 2) + "M";
    if (a >= 1000) return px(v);
    if (a >= 1) return "$" + dec(v, 2);
    if (a >= 0.1) return "$" + v.toFixed(3);
    if (a >= 0.01) return "$" + v.toFixed(4);
    if (a >= 0.001) return "$" + v.toFixed(5);
    if (a >= 0.0001) return "$" + v.toFixed(6);
    if (a === 0) return "$0";
    return "$" + v.toFixed(8);
  }
  // % distance from the 200W SMA, from the multiple as shown (2 decimals),
  // so "0.89x" always reads "-11%". True minus sign.
  function pctOf(mult) {
    const m = parseFloat(mult.toFixed(2));
    return Math.round((m - 1) * 100);
  }
  function pctText(mult) {
    const p = pctOf(mult);
    if (p > 0) return "+" + p + "%";
    if (p < 0) return "\u2212" + Math.abs(p) + "%";
    return "0%";
  }
  function rTick(v) { return String(+v.toPrecision(3)) + "x"; }
  function slimTick(x, suffix) {
    const s = Math.abs(x) >= 10 ? String(Math.round(x)) : String(+x.toPrecision(2));
    return "$" + s + suffix;
  }
  function usdTick(v) {
    const a = Math.abs(v);
    if (a >= 1e12) return slimTick(v / 1e12, "T");
    if (a >= 1e9) return slimTick(v / 1e9, "B");
    if (a >= 1e6) return slimTick(v / 1e6, "M");
    if (a >= 1000) return "$" + (v / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "k";
    if (a >= 1) return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return "$" + String(+v.toPrecision(2));
  }
  function fmtDay(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return String(+m[3]) + " " + months[+m[2] - 1] + " " + m[1];
  }
  function ms(s) { return Date.parse(s + "T00:00:00Z"); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function fmtHM(d) { return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
  function fmtCached(pass) {
    const m = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/.exec(pass || "");
    if (!m) return pass || "cached close";
    const d = new Date(m[1] + "T" + m[2] + ":00+01:00");
    const mon = d.toLocaleString(undefined, { month: "short" });
    return d.getDate() + " " + mon + " " + d.getFullYear() + ", " + fmtHM(d);
  }

  function addDaysIso(iso, days) {
    const d = new Date(ms(iso) + days * DAY);
    return d.toISOString().slice(0, 10);
  }
  function addMonthsIso(iso, n) {
    const parts = iso.split("-");
    const dt = new Date(Date.UTC(+parts[0], +parts[1] - 1 + n, +parts[2] || 1));
    return dt.toISOString().slice(0, 10);
  }
  function lastDayOfMonth(iso) {
    const parts = iso.split("-");
    const dt = new Date(Date.UTC(+parts[0], +parts[1], 0));
    return dt.toISOString().slice(0, 10);
  }
  function weekCloseIso(startIso) {
    // Weekly bars are Monday-start; the close lands on Sunday (start + 6 days).
    return addDaysIso(startIso, 6);
  }
  function weekStartOnOrBefore(iso) {
    const dow = new Date(ms(iso)).getUTCDay(); // 0 Sun .. 1 Mon, UTC
    const back = (dow + 6) % 7; // days since Monday
    return addDaysIso(iso, -back);
  }

  function smaArr(closes, n) {
    const sm = new Array(closes.length).fill(null);
    let su = 0;
    for (let i = 0; i < closes.length; i++) {
      su += closes[i];
      if (i >= n) su -= closes[i - n];
      if (i >= n - 1) sm[i] = su / n;
    }
    return sm;
  }

  function parseLivePrice(j) {
    if (!j || typeof j !== "object") return NaN;
    if (j.last !== undefined) return +j.last;
    if (j.price !== undefined) return +j.price;
    if (j.result) {
      const k = Object.keys(j.result)[0];
      if (k && j.result[k] && j.result[k].c) return +j.result[k].c[0];
    }
    return NaN;
  }

  // Bitstamp's CDN often drops CORS on cache:"no-store" (that mode can
  // trigger a preflight) and on URLs with a trailing slash. Bust the
  // cache with a query param instead. Kraken / Coinbase keep no-store.
  function fetchTicker(url, source, bust) {
    const ac = new AbortController();
    const t = setTimeout(function () { ac.abort(); }, 5000);
    const req = bust ? url + (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now() : url;
    const opts = { signal: ac.signal };
    if (!bust) opts.cache = "no-store";
    return fetch(req, opts)
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (j) {
        const p = parseLivePrice(j);
        if (!(p > 0) || !isFinite(p)) throw new Error("bad price");
        return { price: p, source: source, url: url, at: Date.now() };
      })
      .finally(function () { clearTimeout(t); });
  }

  function fetchLive() {
    if (!LIVE_URL) return Promise.resolve(null);
    const steps = [
      { url: LIVE_URL, source: LIVE_SRC, bust: LIVE_URL.indexOf("bitstamp.net") !== -1 },
    ];
    if (COIN.liveFallback) {
      steps.push({ url: COIN.liveFallback, source: COIN.liveFallbackSrc || "Kraken", bust: false });
    }
    if (COIN.liveFallback2) {
      steps.push({ url: COIN.liveFallback2, source: COIN.liveFallback2Src || "Coinbase", bust: false });
    }
    let p = fetchTicker(steps[0].url, steps[0].source, steps[0].bust);
    for (let i = 1; i < steps.length; i++) {
      (function (step) {
        p = p.catch(function () { return fetchTicker(step.url, step.source, step.bust); });
      })(steps[i]);
    }
    return p;
  }

  function desktopLayout(mode) {
    const isPrice = mode === "price";
    return Object.assign({
      W: SHARE_W, H: SHARE_H, dpr: SHARE_D, mobile: false,
    }, DESKTOP_ST, { Rgt: 4, B: isPrice ? 488 : DESKTOP_ST.B });
  }

  function mobileLayout(cssW, mode) {
    const W = Math.max(280, Math.round(cssW));
    const isPrice = mode === "price";
    const Pd = 14, Rgt = 8;
    const tt = 18, ty = 28, wm = 12, fs = 11;
    const T = 44, plotH = Math.max(190, Math.round(W * 0.56));
    const B = T + plotH, yr = 17, lg = 12.5, lh = 17;
    // Clear gap between year-label glyphs and the metrics divider (~16px).
    const ly1 = B + yr + 29 + (isPrice ? 20 : 0);
    const ny = ly1;
    const H = ny + 50;
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    return {
      W: W, H: H, dpr: dpr, mobile: true,
      Pd: Pd, Rgt: Rgt,
      tt: tt, ty: ty, wm: wm, wmc: "#8a919c",
      fs: fs, T: T, B: B, yr: yr,
      lg: lg, ly: ly1, lh: lh, ly1: ly1, ny: ny,
      ml: 10, mlc: "#a7adb6", mv: 17, mly: 18, mvy: 38,
      lw: 2.25, smaw: 1.1, yearStep: 4,
    };
  }

  function sizeCanvas(canvas, layout) {
    const dpr = layout.dpr;
    canvas.width = Math.round(layout.W * dpr);
    canvas.height = Math.round(layout.H * dpr);
    if (layout.mobile) {
      canvas.style.width = layout.W + "px";
      canvas.style.height = layout.H + "px";
    } else {
      canvas.style.width = "100%";
      canvas.style.height = "auto";
    }
    const x = canvas.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return x;
  }

  function applyCard(jw, live, def) {
    const W = jw.W.map(function (b) { return b.slice(); });
    const cachedClose = W.length ? +W[W.length - 1][4] : null;
    const liveOn = !!(live && live.price > 0);
    const lastPx = liveOn ? live.price : cachedClose;
    if (W.length && liveOn) {
      // Live close feeds the 200W SMA. Live price also extends the
      // in-progress week's real high or low; it never invents a range.
      // Once a new week has begun (Monday 00:00 UTC), do not overwrite
      // the closed week — open a new bar from the live tick only.
      const todayIso = new Date(live.at || Date.now()).toISOString().slice(0, 10);
      const currentStart = weekStartOnOrBefore(todayIso);
      const lastStart = W[W.length - 1][0];
      if (lastStart < currentStart) {
        W.push([currentStart, lastPx, lastPx, lastPx, lastPx]);
      } else {
        W[W.length - 1][4] = lastPx;
        const last = W[W.length - 1];
        last[2] = Math.max(+last[2], lastPx);
        last[3] = Math.min(+last[3], lastPx);
      }
    }
    const cl = W.map(function (b) { return +b[4]; });
    const hi = W.map(function (b) { return +b[2]; });
    const loA = W.map(function (b) { return +b[3]; });
    const sm = smaArr(cl, def.n);
    const f = sm.findIndex(function (s) { return s != null; });
    if (f < 0) {
      return {
        id: def.id, n: def.n, smaLabel: def.smaLabel, short: def.short,
        insufficient: true, weeks: W.length, need: def.n,
        source: jw.source || "", pass: jw.pass || "",
        liveOn: liveOn, live: live || null,
        cachedClose: cachedClose, lastPx: lastPx, lastSma: null,
        start: null, lastWeek: W.length ? W[W.length - 1][0] : null,
        closedN: 0, closedPaddle: 0, closedRide: 0, closedKick: 0,
        closedLowAtOrBelow1: 0, closedHighAtOrAbove2: 0,
        closedInside12: 0, closedBoth: 0,
        liveZone: null, liveMult: null, missingHL: 0,
        interval: "weekly",
      };
    }
    // Refuse to invent highs or lows: every plotted week must already
    // carry a real high and low from the feed.
    let missingHL = 0;
    for (let i = f; i < W.length; i++) {
      const h = hi[i], l = loA[i];
      if (!(h > 0) || !(l > 0) || !isFinite(h) || !isFinite(l) || h < l) missingHL++;
    }
    // Open last bar (live) is excluded from closed-week counts.
    const countEnd = W.length - 1;
    let closedN = 0, closedPaddle = 0, closedRide = 0, closedKick = 0;
    let closedLowAtOrBelow1 = 0, closedHighAtOrAbove2 = 0;
    let closedInside12 = 0, closedBoth = 0;
    for (let i = f; i < countEnd; i++) {
      closedN++;
      const z = zoneOfR(cl[i] / sm[i]);
      if (z === "paddle") closedPaddle++;
      else if (z === "ride") closedRide++;
      else closedKick++;
      const rLo = loA[i] / sm[i], rHi = hi[i] / sm[i];
      const a = rLo <= 1, b = rHi >= 2;
      if (a) closedLowAtOrBelow1++;
      if (b) closedHighAtOrAbove2++;
      if (a && b) closedBoth++;
      if (!a && !b) closedInside12++;
    }
    const lastSma = sm[sm.length - 1];
    const liveMult = lastPx / lastSma;
    const liveZone = zoneOfR(liveMult);
    return {
      id: def.id, n: def.n, smaLabel: def.smaLabel, short: def.short,
      W: W, cl: cl, hi: hi, lo: loA, sm: sm, f: f,
      rsi: wilderRsi(cl, 14),
      source: jw.source || "",
      pass: jw.pass || "",
      liveOn: liveOn,
      live: live || null,
      cachedClose: cachedClose,
      lastPx: lastPx,
      lastSma: lastSma,
      liveMult: liveMult,
      liveZone: liveZone,
      start: W[f][0],
      lastWeek: W[W.length - 1][0],
      closedN: closedN,
      closedPaddle: closedPaddle,
      closedRide: closedRide,
      closedKick: closedKick,
      closedLowAtOrBelow1: closedLowAtOrBelow1,
      closedHighAtOrAbove2: closedHighAtOrAbove2,
      closedInside12: closedInside12,
      closedBoth: closedBoth,
      missingHL: missingHL,
      interval: "weekly",
    };
  }

  // Monthly high-low bars from real CRYPTO:BTCUSD monthly OHLC.
  // The 200W itself stays a weekly-close average. For each calendar month
  // the divisor is the 200W as of the last weekly close on or before
  // that month's last calendar day (a Monday-start week closes on Sunday).
  // For the open current month, that is the latest 200W, including the
  // live week's close, so the live ratio matches the weekly view.
  function applyMonthly(jm, weeklyData, live, def) {
    const bars = jm.M || jm.W;
    if (!bars || !bars.length) {
      return {
        id: def.id, insufficient: true, interval: "monthly", missingHL: 0,
        need: def.n, weeks: 0, source: jm.source || "", pass: jm.pass || "",
      };
    }
    const W = bars.map(function (b) { return b.slice(); });
    const cachedClose = W.length ? +W[W.length - 1][4] : null;
    const liveOn = !!(live && live.price > 0);
    const lastPx = liveOn ? live.price : (weeklyData && weeklyData.lastPx) || cachedClose;
    if (W.length && liveOn) {
      // Same rule as weekly: once a new month has begun, do not overwrite
      // the closed month — open a new bar from the live tick only.
      const todayIso = new Date(live.at || Date.now()).toISOString().slice(0, 10);
      const currentMonth = todayIso.slice(0, 8) + "01";
      const lastMonth = String(W[W.length - 1][0]).slice(0, 8) + "01";
      if (lastMonth < currentMonth) {
        W.push([currentMonth, lastPx, lastPx, lastPx, lastPx]);
      } else {
        W[W.length - 1][4] = lastPx;
        const last = W[W.length - 1];
        last[2] = Math.max(+last[2], lastPx);
        last[3] = Math.min(+last[3], lastPx);
      }
    }
    const wW = weeklyData.W, wSm = weeklyData.sm;
    const weeklyCloses = [];
    if (wW && wSm) {
      for (let i = 0; i < wW.length; i++) {
        if (wSm[i] == null) continue;
        weeklyCloses.push({
          closeIso: weekCloseIso(wW[i][0]),
          sma: wSm[i],
          t: ms(wW[i][0]),
        });
      }
    }
    const cl = W.map(function (b) { return +b[4]; });
    const hi = W.map(function (b) { return +b[2]; });
    const loA = W.map(function (b) { return +b[3]; });
    const sm = new Array(W.length).fill(null);
    let wi = 0;
    for (let i = 0; i < W.length; i++) {
      const end = lastDayOfMonth(W[i][0]);
      let best = null;
      while (wi < weeklyCloses.length && weeklyCloses[wi].closeIso <= end) {
        best = weeklyCloses[wi];
        wi++;
      }
      if (best) {
        sm[i] = best.sma;
        // Rewind one so the next (later) month can start from this close
        // and walk forward; month ends are non-decreasing.
        wi = Math.max(0, wi - 1);
      }
    }
    const f = sm.findIndex(function (v) { return v != null; });
    if (f < 0) {
      return {
        id: def.id, n: def.n, smaLabel: def.smaLabel, short: def.short,
        insufficient: true, weeks: W.length, need: def.n,
        source: jm.source || "", pass: jm.pass || "",
        liveOn: liveOn, live: live || null,
        cachedClose: cachedClose, lastPx: lastPx, lastSma: null,
        start: null, lastWeek: W.length ? W[W.length - 1][0] : null,
        closedN: 0, closedPaddle: 0, closedRide: 0, closedKick: 0,
        closedLowAtOrBelow1: 0, closedHighAtOrAbove2: 0,
        closedInside12: 0, closedBoth: 0,
        liveZone: weeklyData.liveZone, liveMult: weeklyData.liveMult,
        missingHL: 0, interval: "monthly",
      };
    }
    let missingHL = 0;
    for (let i = f; i < W.length; i++) {
      const h = hi[i], l = loA[i];
      if (!(h > 0) || !(l > 0) || !isFinite(h) || !isFinite(l) || h < l) missingHL++;
    }
    const countEnd = W.length - 1;
    let closedN = 0, closedPaddle = 0, closedRide = 0, closedKick = 0;
    let closedLowAtOrBelow1 = 0, closedHighAtOrAbove2 = 0;
    let closedInside12 = 0, closedBoth = 0;
    for (let i = f; i < countEnd; i++) {
      closedN++;
      const z = zoneOfR(cl[i] / sm[i]);
      if (z === "paddle") closedPaddle++;
      else if (z === "ride") closedRide++;
      else closedKick++;
      const rLo = loA[i] / sm[i], rHi = hi[i] / sm[i];
      const a = rLo <= 1, b = rHi >= 2;
      if (a) closedLowAtOrBelow1++;
      if (b) closedHighAtOrAbove2++;
      if (a && b) closedBoth++;
      if (!a && !b) closedInside12++;
    }
    const lastSma = sm[sm.length - 1];
    const liveMult = lastPx / lastSma;
    const liveZone = zoneOfR(liveMult);
    const smaWeekly = weeklyCloses.map(function (w) { return { t: w.t, s: w.sma }; });
    return {
      id: def.id, n: def.n, smaLabel: def.smaLabel, short: def.short,
      W: W, cl: cl, hi: hi, lo: loA, sm: sm, f: f,
      rsi: wilderRsi(cl, 14),
      source: jm.source || "",
      pass: jm.pass || "",
      liveOn: liveOn,
      live: live || null,
      cachedClose: cachedClose,
      lastPx: lastPx,
      lastSma: lastSma,
      liveMult: liveMult,
      liveZone: liveZone,
      start: W[f][0],
      lastWeek: W[W.length - 1][0],
      closedN: closedN,
      closedPaddle: closedPaddle,
      closedRide: closedRide,
      closedKick: closedKick,
      closedLowAtOrBelow1: closedLowAtOrBelow1,
      closedHighAtOrAbove2: closedHighAtOrAbove2,
      closedInside12: closedInside12,
      closedBoth: closedBoth,
      missingHL: missingHL,
      interval: "monthly",
      smaWeekly: smaWeekly,
    };
  }

  // Wilder's RSI: first average is the SMA of the first `period` changes,
  // then each step is (prev * (period-1) + current) / period.
  function wilderRsi(closes, period) {
    const n = closes.length;
    const out = new Array(n).fill(null);
    if (n <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const ch = closes[i] - closes[i - 1];
      if (ch > 0) gain += ch;
      else loss -= ch;
    }
    let avgG = gain / period, avgL = loss / period;
    const value = function () {
      if (avgL === 0) return avgG === 0 ? 50 : 100;
      if (avgG === 0) return 0;
      return 100 - 100 / (1 + avgG / avgL);
    };
    out[period] = value();
    for (let i = period + 1; i < n; i++) {
      const ch = closes[i] - closes[i - 1];
      const g = ch > 0 ? ch : 0, l = ch < 0 ? -ch : 0;
      avgG = (avgG * (period - 1) + g) / period;
      avgL = (avgL * (period - 1) + l) / period;
      out[i] = value();
    }
    return out;
  }
  const RSI_GAP_DESKTOP = 20, RSI_GAP_MOBILE = 16;
  const DRAW_LS_KEY = "surfcharts-drawings-v1";

  function applyPanelLayout(layout, panels) {
    const showPrice = !panels || panels.showPrice !== false;
    const showRsi = !!(panels && panels.showRsi);
    // RSI-only has no SMA legend or zone key, so use the full plot bottom.
    if (showRsi && !showPrice && !layout.mobile && layout.B < DESKTOP_ST.B) {
      layout.B = DESKTOP_ST.B;
    }
    layout.showPrice = showPrice;
    layout.showRsi = showRsi;
    layout.plotT = layout.T;
    layout.plotB = layout.B;
    layout.axisB = layout.B;
    if (showPrice && showRsi) {
      const priceH = Math.max(1, layout.B - layout.T);
      const gap = layout.mobile ? RSI_GAP_MOBILE : RSI_GAP_DESKTOP;
      // 0-100 band is ~30% of the price plot; padding is added on top of that
      // so peaks don't sit on the panel edge.
      const pad = layout.mobile ? 8 : 14;
      const inner = Math.max(layout.mobile ? 84 : 124, Math.round(priceH * 0.30));
      const rh = inner + 2 * pad;
      layout.rsiT = layout.B + gap;
      layout.rsiB = layout.rsiT + rh;
      const delta = layout.rsiB - layout.B;
      layout.axisB = layout.rsiB;
      layout.ny += delta;
      layout.H += delta;
    } else if (showRsi && !showPrice) {
      layout.rsiT = layout.T;
      layout.rsiB = layout.B;
    }
    return layout;
  }

  function loadDrawStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAW_LS_KEY) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch (e) { return {}; }
  }
  function saveDrawStore(store) {
    try { localStorage.setItem(DRAW_LS_KEY, JSON.stringify(store)); } catch (e) { /* quota / private */ }
  }
  function newDrawId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function rsiPad(rT, rB) {
    const h = Math.max(1, rB - rT);
    return Math.max(8, Math.min(18, Math.round(h * 0.09)));
  }
  function rsiYAt(v, rT, rB) {
    const pad = rsiPad(rT, rB);
    const top = rT + pad, bot = rB - pad;
    return top + ((100 - v) / 100) * (bot - top);
  }
  function rsiAtY(py, rT, rB) {
    const pad = rsiPad(rT, rB);
    const top = rT + pad, bot = rB - pad;
    if (!(bot > top)) return 50;
    return 100 * (bot - py) / (bot - top);
  }

  function drawZonedRsi(x, pts, ST, L, Rx, rT, rB) {
    const usable = pts.filter(function (q) { return q.rsi != null && isFinite(q.rsi); });
    if (usable.length < 2) return;
    const lw = ST.mobile ? 1.5 : 1.85;
    x.save();
    x.beginPath();
    x.rect(L, rT, Math.max(0, Rx - L), Math.max(0, rB - rT));
    x.clip();
    x.lineWidth = lw;
    x.lineJoin = "round";
    x.lineCap = "butt";
    x.strokeStyle = "#e6e8eb";
    x.beginPath();
    usable.forEach(function (q, i) {
      const y = rsiYAt(q.rsi, rT, rB);
      if (i) x.lineTo(q.cx, y); else x.moveTo(q.cx, y);
    });
    x.stroke();
    x.restore();
  }

  function drawRsiPanel(x, ST, L, Rx, rT, rB, F, Tx) {
    // Clear gutter + rule between the price plot and RSI.
    if (ST.showPrice && ST.plotB != null && rT > ST.plotB + 4) {
      const mid = Math.round((ST.plotB + rT) / 2);
      x.fillStyle = "#2c333d";
      x.fillRect(L, mid, Rx - L, 1);
    }
    // Guide levels stay 30 / 50 / 70 / 90 on every timeframe.
    const refs = [30, 50, 70, 90];
    refs.forEach(function (v) {
      const y = Math.round(rsiYAt(v, rT, rB));
      x.fillStyle = v === 50 ? "#3a4350" : "#323a45";
      x.fillRect(L, y, Rx - L, 1);
      F(400, ST.fs);
      Tx(String(v), L - 6, y + ST.fs * 0.35, v === 50 ? GREY : AX, "right");
    });
    // Small "RSI 14" tag at the top-right, away from the early spikes.
    const tag = "RSI 14";
    F(600, ST.mobile ? 10 : 12);
    const tw = x.measureText(tag).width;
    const tx = Rx - tw - (ST.mobile ? 6 : 8);
    const ty = rT + (ST.mobile ? 13 : 16);
    x.fillStyle = "rgba(18,22,28,0.72)";
    x.fillRect(tx - 3, ty - (ST.mobile ? 10 : 12), tw + 6, ST.mobile ? 13 : 16);
    Tx(tag, tx, ty, SMA_C, "left");
  }

  function lineEnds(ln, meta) {
    const L = meta.L, Rx = meta.Rx;
    if (ln.kind === "horiz") {
      const y = valueToY(ln.v0, ln.panel, meta);
      return { x0: L, y0: y, x1: Rx, y1: y };
    }
    return {
      x0: timeToX(ln.t0, meta), y0: valueToY(ln.v0, ln.panel, meta),
      x1: timeToX(ln.t1, meta), y1: valueToY(ln.v1, ln.panel, meta),
    };
  }
  function timeToX(t, meta) {
    return meta.L + ((t - meta.t0) / (meta.t1 - meta.t0)) * (meta.Rx - meta.L);
  }
  function xToTime(px, meta) {
    return meta.t0 + ((px - meta.L) / (meta.Rx - meta.L)) * (meta.t1 - meta.t0);
  }
  function valueToY(v, panel, meta) {
    if (panel === "rsi") return rsiYAt(v, meta.rsiT, meta.rsiB);
    const T = meta.T, B = meta.B;
    const l1 = Math.log10(meta.top), l0 = Math.log10(meta.bot);
    return T + ((l1 - Math.log10(Math.max(v, 1e-12))) / (l1 - l0)) * (B - T);
  }
  function yToValue(py, panel, meta) {
    if (panel === "rsi") {
      return Math.max(0, Math.min(100, rsiAtY(py, meta.rsiT, meta.rsiB)));
    }
    const T = meta.T, B = meta.B;
    const l1 = Math.log10(meta.top), l0 = Math.log10(meta.bot);
    const frac = (py - T) / (B - T);
    return Math.pow(10, l1 - frac * (l1 - l0));
  }
  function panelClip(panel, meta) {
    if (panel === "rsi") return { T: meta.rsiT, B: meta.rsiB };
    return { T: meta.T, B: meta.B };
  }
  function distToSeg(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const x = x0 + t * dx, y = y0 + t * dy;
    return Math.hypot(px - x, py - y);
  }
  function delButtonPos(ends, meta) {
    const mx = (ends.x0 + ends.x1) / 2;
    const my = (ends.y0 + ends.y1) / 2;
    const clip = { T: Math.min(ends.y0, ends.y1), B: Math.max(ends.y0, ends.y1) };
    const r = 9;
    let x = Math.max(meta.L + r + 2, Math.min(meta.Rx - r - 2, mx));
    let y = my - 16;
    const top = meta.showPrice && meta.showRsi
      ? Math.min(meta.T, meta.rsiT)
      : (meta.showRsi ? meta.rsiT : meta.T);
    if (y < top + r + 2) y = my + 16;
    return { x: x, y: y, r: r };
  }
  function drawCommittedLines(x, lines, meta, ST, selectedId, withDelete) {
    if (!lines || !lines.length || !meta) return null;
    let del = null;
    lines.forEach(function (ln) {
      if (ln.panel === "price" && !meta.showPrice) return;
      if (ln.panel === "rsi" && !meta.showRsi) return;
      const ends = lineEnds(ln, meta);
      const clip = panelClip(ln.panel, meta);
      const selected = withDelete && selectedId && ln.id === selectedId;
      x.save();
      x.beginPath();
      x.rect(meta.L, clip.T, Math.max(0, meta.Rx - meta.L), Math.max(0, clip.B - clip.T));
      x.clip();
      x.strokeStyle = selected ? INK : GREY;
      x.lineWidth = selected ? (ST.mobile ? 1.6 : 1.85) : (ST.mobile ? 1.25 : 1.45);
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(ends.x0, ends.y0);
      x.lineTo(ends.x1, ends.y1);
      x.stroke();
      x.restore();
      if (selected) {
        const pr = ST.mobile ? 4.5 : 5;
        [0, 1].forEach(function (i) {
          const px = i ? ends.x1 : ends.x0, py = i ? ends.y1 : ends.y0;
          if (py < clip.T - 1 || py > clip.B + 1) return;
          x.beginPath();
          x.arc(px, py, pr, 0, Math.PI * 2);
          x.fillStyle = BG; x.fill();
          x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke();
        });
        del = delButtonPos(ends, meta);
      }
    });
    return del;
  }
  function drawDeleteBtn(x, del) {
    if (!del) return;
    x.save();
    x.beginPath();
    if (x.roundRect) x.roundRect(del.x - del.r, del.y - del.r, del.r * 2, del.r * 2, 4);
    else x.rect(del.x - del.r, del.y - del.r, del.r * 2, del.r * 2);
    x.fillStyle = "rgba(18,22,28,0.94)";
    x.strokeStyle = "#3a4450";
    x.lineWidth = 1;
    x.fill(); x.stroke();
    x.strokeStyle = INK;
    x.lineWidth = 1.4;
    x.lineCap = "round";
    const s = del.r * 0.38;
    x.beginPath();
    x.moveTo(del.x - s, del.y - s); x.lineTo(del.x + s, del.y + s);
    x.moveTo(del.x + s, del.y - s); x.lineTo(del.x - s, del.y + s);
    x.stroke();
    x.restore();
  }

  // Weekly high-low bars, coloured by exact depth and split at 1× and 2×.
  // Coordinates are snapped to the backing-store pixel grid so thin bars
  // stay crisp instead of antialiasing into mush.
  function drawZonedBars(x, pts, ST, L, Rx, T, B, Yr, zoomed) {
    const dpr = ST.dpr || 1;
    const snap = function (v) { return Math.round(v * dpr) / dpr; };
    const px = 1 / dpr;
    const slot0 = pts.length ? Math.max(px, pts[0].x1 - pts[0].x0) : px;
    let w;
    if (slot0 >= 1.6) w = slot0 * 0.72;
    else if (slot0 >= 0.9) w = Math.max(px, slot0 - px);
    else w = Math.max(px, slot0 * 0.92);
    w = Math.max(px, snap(w));
    // Zoomed in, slots get wide: cap the bar so it stays a slim bar.
    if (zoomed) w = Math.min(w, ST.mobile ? 8 : 12);
    x.save();
    x.beginPath();
    x.rect(L, T, Math.max(0, Rx - L), Math.max(0, B - T));
    x.clip();
    pts.forEach(function (q) {
      let x0 = snap(q.cx - w / 2);
      if (zoomed) {
        // Bars past the edges are clipped, not pulled onto the plot.
        // Only whole bars: a bar cut by the axis would read as a fake spike.
        if (x0 < L - 0.01 || x0 + w > Rx + 0.01) return;
      } else {
        if (x0 < L) x0 = L;
        if (x0 + w > Rx) x0 = Math.max(L, Rx - w);
      }
      const cuts = [q.rLo];
      if (q.rLo < 1 && q.rHi > 1) cuts.push(1);
      if (q.rLo < 2 && q.rHi > 2) cuts.push(2);
      cuts.push(q.rHi);
      for (let k = 0; k < cuts.length - 1; k++) {
        const a = cuts[k], b = cuts[k + 1];
        if (!(b > a) && !(a === b && q.rLo === q.rHi)) continue;
        const yA = Yr(q.isPrice ? a * q.s : a);
        const yB = Yr(q.isPrice ? b * q.s : b);
        let y = Math.min(yA, yB);
        let h = Math.abs(yB - yA);
        if (!(h > 0)) { y = snap((yA + yB) / 2) - px / 2; h = px; }
        else {
          const yEnd = y + h;
          y = snap(y);
          h = Math.max(px, snap(yEnd) - y);
        }
        x.fillStyle = zoneColor((a + b) / 2);
        x.fillRect(x0, y, w, h);
      }
    });
    x.restore();
  }

  // Full time domain of a card (same span the "All" view has always shown).
  function fullDomain(DATA) {
    const W = DATA.W, f = DATA.f, n = W.length - 1;
    const isMonth = DATA.interval === "monthly";
    const first = ms(W[f][0]);
    const lastEnd = isMonth ? ms(addMonthsIso(W[n][0], 1)) : ms(W[n][0]) + 7 * DAY;
    // Right gap after the live bar: unchanged share of the width (the
    // layout that shipped with PADW/PADM empty time on both sides).
    const oldT0 = isMonth ? ms(addMonthsIso(W[f][0], -PADM)) : first - PADW * 7 * DAY;
    const oldT1 = isMonth ? ms(addMonthsIso(W[n][0], 1 + PADM)) : ms(W[n][0]) + (1 + PADW) * 7 * DAY;
    const rf = (oldT1 - lastEnd) / (oldT1 - oldT0);
    // Left: only a small margin of LEFT_BARS bars before the first bar.
    const t0 = isMonth ? ms(addMonthsIso(W[f][0], -LEFT_BARS)) : first - LEFT_BARS * 7 * DAY;
    const t1 = t0 + (lastEnd - t0) / (1 - rf);
    return { t0: t0, first: first, t1: t1 };
  }

  // Close line, coloured by zone and cut exactly where the multiple crosses
  // 1x or 2x. On a log axis both views move log(multiple) linearly along a
  // straight screen segment, so the crossing fraction is the same in both.
  function drawZonedLine(x, pts, ST, L, Rx, T, B) {
    if (pts.length < 2) return;
    const lw = ST.mobile ? 1.75 : 2.25;
    const runs = [];
    let cur = null;
    const push = function (col, xa, ya, xb, yb) {
      if (cur && cur.c === col) { cur.p.push(xb, yb); return; }
      cur = { c: col, p: [xa, ya, xb, yb] };
      runs.push(cur);
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const la = Math.log(a.r), lb = Math.log(b.r);
      const fr = [0];
      [1, 2].forEach(function (k) {
        if ((a.r - k) * (b.r - k) < 0) fr.push((Math.log(k) - la) / (lb - la));
      });
      fr.push(1);
      fr.sort(function (p, q) { return p - q; });
      for (let j = 0; j < fr.length - 1; j++) {
        const u0 = fr[j], u1 = fr[j + 1];
        if (!(u1 > u0)) continue;
        const rm = Math.exp(la + (u0 + u1) / 2 * (lb - la));
        push(zoneColor(rm),
          a.cx + (b.cx - a.cx) * u0, a.yp + (b.yp - a.yp) * u0,
          a.cx + (b.cx - a.cx) * u1, a.yp + (b.yp - a.yp) * u1);
      }
    }
    x.save();
    x.beginPath();
    x.rect(L, T, Math.max(0, Rx - L), Math.max(0, B - T));
    x.clip();
    x.lineWidth = lw;
    x.lineJoin = "round";
    x.lineCap = "butt";
    runs.forEach(function (rn) {
      x.beginPath();
      x.moveTo(rn.p[0], rn.p[1]);
      for (let k = 2; k < rn.p.length; k += 2) x.lineTo(rn.p[k], rn.p[k + 1]);
      x.strokeStyle = rn.c;
      x.stroke();
    });
    x.restore();
  }

  // Time labels for a zoomed range: years when wide, months when narrow.
  function drawTimeTicks(x, ST, L, Rx, B, v0, v1, X, F, Tx) {
    F(400, ST.fs);
    const minGap = ST.mobile ? 8 : 10;
    const plotW = Rx - L;
    const spanY = (v1 - v0) / (365.25 * DAY);
    const labels = [];
    if (spanY > 3.2) {
      const pxY = plotW / spanY;
      const need = x.measureText("2026").width + minGap * 2;
      const step = [1, 2, 4, 5, 10].filter(function (s) { return pxY * s >= need; })[0] || 10;
      const ya = new Date(v0).getUTCFullYear(), yb = new Date(v1).getUTCFullYear();
      for (let yy = ya; yy <= yb + 1; yy++) {
        if (yy % step) continue;
        labels.push({ t: Date.UTC(yy, 0, 1), s: String(yy) });
      }
    } else {
      const pxM = plotW / (spanY * 12);
      const need = x.measureText("2026").width + minGap * 2;
      const step = [1, 2, 3, 6, 12].filter(function (s) { return pxM * s >= need; })[0] || 12;
      const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const d0 = new Date(v0);
      let yy = d0.getUTCFullYear(), mm = d0.getUTCMonth();
      for (let n = 0; n < 400; n++) {
        const t = Date.UTC(yy, mm, 1);
        if (t > v1) break;
        if (mm % step === 0) labels.push({ t: t, s: mm === 0 ? String(yy) : MON[mm] });
        mm++; if (mm > 11) { mm = 0; yy++; }
      }
    }
    let lastRight = L - minGap;
    labels.forEach(function (lb) {
      const tw = x.measureText(lb.s).width;
      const xx = X(lb.t);
      const left = xx - tw / 2, right = xx + tw / 2;
      if (left < L || right > Rx || left < lastRight + minGap) return;
      Tx(lb.s, xx, B + ST.yr, AX, "center");
      lastRight = right;
    });
  }

  function drawDashed(x, drawPath, color, width, dash) {
    x.save();
    x.strokeStyle = color;
    x.lineWidth = width;
    x.setLineDash(dash);
    x.lineCap = "butt";
    x.lineJoin = "round";
    x.beginPath();
    drawPath();
    x.stroke();
    x.restore();
  }

  function drawInto(x, mode, ST, DATA, def) {
    const Wd = ST.W, H = ST.H, Pd = ST.Pd, Rgt = ST.Rgt;
    x.fillStyle = BG;
    x.fillRect(0, 0, Wd, H);
    x.textBaseline = "alphabetic";
    const F = function (w, z) { x.font = w + " " + z + "px " + FONT; };
    const Tx = function (s, X, Y, col, al) {
      x.fillStyle = col; x.textAlign = al || "left"; x.fillText(s, X, Y);
    };

    const isPrice = mode === "price";
    const isMonth = DATA.interval === "monthly";
    const showPrice = ST.showPrice !== false;
    const showRsi = !!ST.showRsi;
    const tfLabel = isMonth ? "Monthly" : "Weekly";
    const title = !showPrice ? (COIN.name + " RSI") : (isPrice ? def.titlePrice : def.titleRel);
    F(600, ST.tt);
    const titleW = x.measureText(title).width;
    F(500, ST.wm);
    const wmText = ST.share ? "surfcharts.github.io" : "@_CryptoSurf";
    const wmW = x.measureText(wmText).width;
    const wmX = Wd - Pd;
    F(500, ST.mobile ? 11 : 18);
    const subW = x.measureText(tfLabel).width;
    const subGap = ST.mobile ? 8 : 14;
    // Shrink the title until the timeframe fits beside it, so it always shows.
    let tt = ST.tt, tw = titleW;
    while (tt > 13 && Pd + tw + subGap + subW + 8 > wmX - wmW) {
      tt -= 0.5; F(600, tt); tw = x.measureText(title).width;
    }
    if (tt !== ST.tt) ST = Object.assign({}, ST, { tt: tt });
    F(600, ST.tt);
    const titleW2 = x.measureText(title).width;
    Tx(title, Pd, ST.ty, INK);
    F(500, ST.mobile ? 11 : 18);
    let titleEnd = Pd + titleW2;
    if (Pd + titleW2 + subGap + subW + 8 <= wmX - wmW) {
      Tx(tfLabel, Pd + titleW2 + subGap, ST.ty, ST.wmc);
      titleEnd = Pd + titleW2 + subGap + subW;
    }
    const wmY = ST.share && ST.wmY != null ? ST.wmY : ST.ty;
    F(500, ST.wm); Tx(wmText, wmX, wmY, ST.share ? INK : ST.wmc, "right");

    const W = DATA.W, cl = DATA.cl, sm = DATA.sm, f = DATA.f;
    const dom = fullDomain(DATA);
    // Visible range: the full domain ("All") unless zoomed or panned.
    const zoomed = !!(ST.view && (ST.view.t0 > dom.t0 || ST.view.t1 < dom.t1));
    const tStart = zoomed ? ST.view.t0 : dom.t0;
    const tEnd = zoomed ? ST.view.t1 : dom.t1;
    const barEnd = function (i) {
      return isMonth ? ms(addMonthsIso(W[i][0], 1)) : ms(W[i][0]) + 7 * DAY;
    };
    const visible = function (i) { return barEnd(i) > tStart && ms(W[i][0]) < tEnd; };

    const hiA = DATA.hi, loA = DATA.lo;
    let lo = Infinity, hi = -Infinity;
    if (isPrice) {
      for (let i = f; i < W.length; i++) {
        if (zoomed && !visible(i)) continue;
        lo = Math.min(lo, loA[i], sm[i], 2 * sm[i]);
        hi = Math.max(hi, hiA[i], sm[i], 2 * sm[i]);
      }
    } else {
      for (let i = f; i < W.length; i++) {
        if (zoomed && !visible(i)) continue;
        lo = Math.min(lo, loA[i] / sm[i]);
        hi = Math.max(hi, hiA[i] / sm[i]);
      }
    }
    if (!(hi > 0) || !(lo > 0)) {
      // Panned past the last bar: fall back to the last bar's levels.
      const i = W.length - 1;
      lo = isPrice ? Math.min(loA[i], sm[i]) : loA[i] / sm[i];
      hi = isPrice ? Math.max(hiA[i], 2 * sm[i]) : hiA[i] / sm[i];
    }
    const HR = 1.15, bot = lo / HR;
    let top = hi * HR;
    const relTicks = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
    const usdTicks = (function () {
      const out = [];
      [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 0.1, 1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13].forEach(function (base) {
        out.push(base, base * 2, base * 5);
      });
      return out;
    })();
    if (isPrice && !zoomed) {
      // End the price axis on a labelled round level just above the highest line.
      const nxt = usdTicks.filter(function (v) { return v >= hi; })[0];
      if (nxt) top = Math.max(top, nxt * 1.04);
    } else {
      // Relative view always shows the 2× line with room above it.
      top = Math.max(top, 2.4);
    }
    let ticks = (isPrice ? usdTicks : relTicks).filter(function (v) { return v >= bot && v <= top; });
    if (ST.mobile) {
      if (isPrice) {
        const keep = { 0.0001: 1, 0.001: 1, 0.01: 1, 0.1: 1, 1: 1, 10: 1, 20: 1, 100: 1, 1000: 1, 10000: 1, 100000: 1, 1e6: 1, 1e9: 1, 1e10: 1, 1e11: 1, 1e12: 1, 1e13: 1 };
        const topTick = ticks[ticks.length - 1];
        let kept = ticks.filter(function (v) { return keep[v]; });
        const prevKept = kept[kept.length - 1];
        if (!keep[topTick] && (!prevKept || topTick / prevKept > 3)) kept.push(topTick);
        ticks = kept;
      } else {
        // Keep the 1× and 2× references visible on a narrow screen.
        const keep = { 0.5: 1, 1: 1, 2: 1, 4: 1, 16: 1 };
        ticks = ticks.filter(function (v) { return keep[v]; });
      }
    }
    if (zoomed && showPrice) {
      // A zoomed range can be narrower than the round levels: add finer
      // levels, then thin them so labels never crowd.
      const Tz = ST.plotT != null ? ST.plotT : ST.T;
      const Bz = ST.plotB != null ? ST.plotB : ST.B;
      const lt = Math.log10(top), lb = Math.log10(bot);
      const yOf = function (v) { return Tz + ((lt - Math.log10(v)) / (lt - lb)) * (Bz - Tz); };
      const minPx = ST.mobile ? 22 : 34;
      // Densest evenly-patterned set of levels whose labels don't crowd.
      const P2 = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
      const R2 = P2.concat([0.375, 0.75, 1.5, 3, 6, 12, 24, 48, 96]);
      const R3 = R2.concat([0.6, 0.7, 0.8, 0.9, 1.25, 1.75, 2.5, 3.5, 5, 7]);
      const sets = isPrice
        ? [[1, 2, 5], [1, 2, 3, 5, 7], [1, 1.5, 2, 3, 4, 5, 7], [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9]]
        : [P2, R2, R3];
      const build = function (list) {
        let out = [];
        if (isPrice) {
          for (let e = -8; e <= 13; e++) {
            list.forEach(function (m) { out.push(+(m * Math.pow(10, e)).toPrecision(4)); });
          }
        } else out = list.slice();
        return out.filter(function (v, i, a) { return v >= bot && v <= top && a.indexOf(v) === i; })
          .sort(function (p, q) { return p - q; });
      };
      const spaced = function (arr) {
        for (let k = 1; k < arr.length; k++) if (Math.abs(yOf(arr[k - 1]) - yOf(arr[k])) < minPx) return false;
        return true;
      };
      let best = null;
      sets.forEach(function (ms0) {
        const c = build(ms0);
        if (spaced(c) && (!best || c.length > best.length)) best = c;
      });
      if (!best || best.length < 2) {
        const c = build(sets[sets.length - 1]), picked = [];
        c.forEach(function (v) {
          if (!picked.length || Math.abs(yOf(picked[picked.length - 1]) - yOf(v)) >= minPx) picked.push(v);
        });
        best = picked;
      }
      if (!isPrice) [1, 2].forEach(function (v) {
        if (v >= bot && v <= top && best.indexOf(v) < 0) {
          best = best.filter(function (q) { return Math.abs(yOf(q) - yOf(v)) >= minPx * 0.8; });
          best.push(v);
        }
      });
      ticks = best.sort(function (p, q) { return p - q; });
    }
    const tickLab = isPrice ? usdTick : rTick;

    F(400, ST.fs);
    const labSamples = showPrice
      ? ["$100k", "$2.2T", "$200B", "$0.0001", "16x", "32x"].concat(ticks.map(tickLab))
      : [];
    if (showRsi) ["0", "30", "50", "70", "90", "100"].forEach(function (q) { labSamples.push(q); });
    const labW = Math.max.apply(null, labSamples.map(function (q) { return x.measureText(q).width; }));
    const L = Math.round(Pd + (ST.mobile ? 8 : 12) + labW);
    const Rx = Wd - Pd - Rgt;
    const T = showPrice ? (ST.plotT != null ? ST.plotT : ST.T) : (ST.rsiT != null ? ST.rsiT : ST.T);
    const B = showPrice ? (ST.plotB != null ? ST.plotB : ST.B) : (ST.rsiB != null ? ST.rsiB : ST.B);
    const axisB = ST.axisB != null ? ST.axisB : B;
    const l1 = Math.log10(top), l0 = Math.log10(bot);
    const Yr = function (v) { return T + ((l1 - Math.log10(v)) / (l1 - l0)) * (B - T); };
    const X = function (t) { return L + ((t - tStart) / (tEnd - tStart)) * (Rx - L); };

    if (showPrice) ticks.forEach(function (v) {
      const y = Math.round(Yr(v));
      const is1 = !isPrice && v === 1;
      const is2 = !isPrice && v === 2;
      if (is1) {
        x.fillStyle = LINE;
        x.fillRect(L, y, Rx - L, 1);
      } else if (is2) {
        // Drawn as a dashed reference after the other ticks.
      } else {
        x.fillStyle = GRID;
        x.fillRect(L, y, Rx - L, 1);
      }
      F(400, ST.fs);
      Tx(tickLab(v), L - 6, y + ST.fs * 0.35, (is1 || is2) ? GREY : AX, "right");
    });

    // Subtle dashed 2× reference in the relative view, even if 2
    // was filtered from the tick list (it almost never is).
    if (showPrice && !isPrice) {
      const y2 = Yr(2);
      if (y2 >= T - 1 && y2 <= B + 1) {
        drawDashed(x, function () {
          x.moveTo(L, y2);
          x.lineTo(Rx, y2);
        }, "rgba(107,117,131,0.72)", ST.mobile ? 1 : 1.25, ST.mobile ? [3, 3] : [5, 4]);
        if (!ticks.some(function (v) { return v === 2; })) {
          F(400, ST.fs);
          Tx("2x", L - 6, y2 + ST.fs * 0.35, GREY, "right");
        }
      }
    }

    F(400, ST.fs);
    if (zoomed) drawTimeTicks(x, ST, L, Rx, axisB, tStart, tEnd, X, F, Tx);
    else {
    const y0 = new Date(tStart).getUTCFullYear();
    const y1 = new Date(tEnd).getUTCFullYear();
    const step = ST.yearStep || 2;
    let yy0 = y0;
    const rem = ((yy0 % step) + step) % step;
    if (rem) yy0 += step - rem;
    const minGap = ST.mobile ? 8 : 10;
    let lastRight = L - minGap;
    for (let yy = yy0; yy <= y1; yy += step) {
      const tw = x.measureText(String(yy)).width;
      let xx = X(Date.UTC(yy, 0, 1));
      // Nudge a first year that sits against the left axis, but only if the
      // nudged label won't collide with the next year.
      if (xx >= L - 8 && xx - tw / 2 < L + 2 && xx + tw / 2 < Rx) {
        const nudged = L + tw / 2 + (ST.mobile ? 3 : 4);
        const nextX = X(Date.UTC(yy + step, 0, 1));
        if (nudged + tw / 2 + minGap <= nextX - tw / 2) {
          xx = nudged;
        } else {
          continue;
        }
      }
      const left = xx - tw / 2, right = xx + tw / 2;
      if (left < L || right > Rx || left < lastRight + minGap) continue;
      Tx(String(yy), xx, axisB + ST.yr, AX, "center");
      lastRight = right;
    }
    }

    const pts = [];
    const weekMs = 7 * DAY;
    let iA = f, iB = W.length - 1;
    if (zoomed) {
      while (iA < W.length - 1 && barEnd(iA) <= tStart) iA++;
      while (iB > iA && ms(W[iB][0]) >= tEnd) iB--;
      iA = Math.max(f, iA - 1);
      iB = Math.min(W.length - 1, iB + 1);
    }
    for (let i = iA; i <= iB; i++) {
      const t = ms(W[i][0]);
      const t1 = isMonth ? ms(addMonthsIso(W[i][0], 1)) : t + weekMs;
      const x0 = X(t), x1 = X(t1);
      pts.push({
        x: (x0 + x1) / 2,
        x0: x0,
        x1: x1,
        cx: (x0 + x1) / 2,
        i: i,
        t: W[i][0],
        p: cl[i],
        lo: loA[i],
        hi: hiA[i],
        s: sm[i],
        r: cl[i] / sm[i],
        rLo: loA[i] / sm[i],
        rHi: hiA[i] / sm[i],
        rsi: DATA.rsi ? DATA.rsi[i] : null,
        isPrice: isPrice,
        yp: showPrice ? Yr(isPrice ? cl[i] : cl[i] / sm[i]) : null,
        ys: showPrice ? Yr(isPrice ? sm[i] : 1) : null,
        y2: showPrice ? Yr(isPrice ? 2 * sm[i] : 2) : null,
      });
    }

    if (showPrice && isPrice) {
      let linePts = pts;
      if (DATA.smaWeekly && DATA.smaWeekly.length) {
        linePts = DATA.smaWeekly.map(function (q) {
          return { x: X(q.t + 3.5 * DAY), ys: Yr(q.s), y2: Yr(2 * q.s) };
        });
      }
      x.save();
      if (zoomed) {
        x.beginPath();
        x.rect(L, T, Math.max(0, Rx - L), Math.max(0, B - T));
        x.clip();
      }
      x.lineJoin = "round";
      x.lineCap = "round";
      x.beginPath();
      linePts.forEach(function (q, k) { k ? x.lineTo(q.x, q.ys) : x.moveTo(q.x, q.ys); });
      x.strokeStyle = SMA_C;
      x.lineWidth = ST.smaw;
      x.stroke();
      drawDashed(x, function () {
        linePts.forEach(function (q, k) { k ? x.lineTo(q.x, q.y2) : x.moveTo(q.x, q.y2); });
      }, "rgba(107,117,131,0.85)", ST.mobile ? 1.1 : 1.35, ST.mobile ? [3, 3] : [5, 4]);
      x.restore();
      // Legend for the two reference lines (replaces right-edge labels).
      const lgF = ST.mobile ? 10.5 : 15;
      F(500, lgF);
      const segW = ST.mobile ? 14 : 22, segGap = ST.mobile ? 5 : 8, itemGap = ST.mobile ? 12 : 22;
      const t1 = "200W SMA", t2 = "2\u00d7 200W SMA";
      const lgW = segW + segGap + x.measureText(t1).width + itemGap + segW + segGap + x.measureText(t2).width;
      const inGap = ST.mobile ? 12 : 26;
      let lx, ly;
      if (false) {
        lx = titleEnd + inGap; ly = ST.ty - (ST.mobile ? 2 : 4);
      } else {
        lx = L; ly = axisB + ST.yr + (ST.mobile ? 22 : 32) + PRICE_LEGEND_DY;
        if (ST.share) ly += SHARE_KEY_SHIFT;
      }
      const midY = ly - lgF * 0.33;
      x.save();
      x.strokeStyle = SMA_C; x.lineWidth = ST.smaw; x.lineCap = "round";
      x.beginPath(); x.moveTo(lx, midY); x.lineTo(lx + segW, midY); x.stroke();
      x.restore();
      Tx(t1, lx + segW + segGap, ly, SMA_C);
      const lx2 = lx + segW + segGap + x.measureText(t1).width + itemGap;
      drawDashed(x, function () { x.moveTo(lx2, midY); x.lineTo(lx2 + segW, midY); },
        "rgba(138,145,156,0.95)", ST.mobile ? 1.1 : 1.35, ST.mobile ? [3, 3] : [5, 4]);
      Tx(t2, lx2 + segW + segGap, ly, SMA_C);
    }
    if (showPrice) {
      if (ST.style === "line") drawZonedLine(x, pts, ST, L, Rx, T, B);
      else if (!DATA.missingHL) drawZonedBars(x, pts, ST, L, Rx, T, B, Yr, zoomed);
    }

    if (showRsi && ST.rsiT != null) {
      drawRsiPanel(x, ST, L, Rx, ST.rsiT, ST.rsiB, F, Tx);
      drawZonedRsi(x, pts, ST, L, Rx, ST.rsiT, ST.rsiB);
    }

    const last = pts[pts.length - 1];
    const price = DATA.lastPx, smaV = DATA.lastSma, mult = price / smaV;
    const zNow = zoneOfR(mult);
    const zCol = ZONES[zNow].color;
    last.zone = zNow;
    last.lw = ST.lw;

    const metaNow = {
      L: L, Rx: Rx, T: T, B: B, axisB: axisB,
      showPrice: showPrice, showRsi: showRsi,
      rsiT: ST.rsiT, rsiB: ST.rsiB,
      top: top, bot: bot, t0: tStart, t1: tEnd,
    };
    // Committed drawings go on the chart (and on Share). The selected
    // delete button is overlay-only, so it never appears on the PNG.
    if (ST.drawings && ST.drawings.length) {
      drawCommittedLines(x, ST.drawings, metaNow, ST, null, false);
    }

    x.fillStyle = "#2c333d";
    x.fillRect(Pd, ST.ny, Wd - 2 * Pd, 1);

    const unitLab = (COIN.unit || "Price").toUpperCase();
    const ratioLab = COIN.unit === "Market cap" ? "CAP / " + def.short : "PRICE / " + def.short;
    const nums = [
      [unitLab, fv(price), INK],
      [def.smaLabel, fv(smaV), INK],
      [ratioLab, mult.toFixed(2) + "x", zCol],
    ];
    const cw = (Wd - 2 * Pd) / 3;
    nums.forEach(function (q, jj) {
      F(400, ST.ml); Tx(q[0], Pd + jj * cw, ST.ny + ST.mly, ST.mlc);
      F(800, ST.mv); Tx(q[1], Pd + jj * cw, ST.ny + ST.mvy, q[2]);
    });
    // Distance from the 200W SMA in %, next to the multiple, same zone colour.
    const pctTxt = "(" + pctText(mult) + ")";
    F(800, ST.mv);
    const multW = x.measureText(nums[2][1]).width;
    F(700, Math.round(ST.mv * 0.62));
    Tx(pctTxt, Pd + 2 * cw + multW + (ST.mobile ? 5 : 10), ST.ny + ST.mvy, zCol);

    const lastRsi = DATA.rsi ? DATA.rsi[DATA.rsi.length - 1] : null;
    return {
      L: L, Rx: Rx, T: T, B: B, axisB: axisB, top: top, bot: bot, ticks: ticks,
      showPrice: showPrice, showRsi: showRsi, rsiT: ST.rsiT, rsiB: ST.rsiB,
      title: title, lastRsi: lastRsi,
      t0: tStart, t1: tEnd, dom: dom, zoomed: zoomed, pts: pts,
      style: ST.style === "line" ? "line" : "candle",
      last: last, price: price, sma: smaV, mult: mult, zone: zNow,
      layout: ST.mobile ? "mobile" : "desktop", W: Wd, H: H,
      start: DATA.start, n: DATA.n, smaLabel: def.smaLabel,
      closedN: DATA.closedN,
      closedPaddle: DATA.closedPaddle,
      closedRide: DATA.closedRide,
      closedKick: DATA.closedKick,
      closedLowAtOrBelow1: DATA.closedLowAtOrBelow1,
      closedHighAtOrAbove2: DATA.closedHighAtOrAbove2,
      closedInside12: DATA.closedInside12,
      closedBoth: DATA.closedBoth,
      missingHL: DATA.missingHL,
      interval: DATA.interval,
      liveZone: DATA.liveZone,
    };
  }

  const cards = {};
  let SHARED = null;

  function attachCard(def, datas) {
    const root = document.querySelector('.card[data-card="' + def.id + '"]');
    if (!root) throw new Error("missing card " + def.id);
    const canvas = root.querySelector("canvas");
    const stage = root.querySelector(".stage");
    const group = root.querySelector('.toolbar .toggle:not(.toggle-tf)');
    const groupTf = root.querySelector(".toggle-tf");
    const groupStyle = root.querySelector(".toggle-style");
    const groupRange = root.querySelector(".toggle-range");
    const groupPanels = root.querySelector(".toggle-panels");
    const groupTools = root.querySelector(".toggle-tools");
    const shareBtn = root.querySelector(".share");
    let MODE = START;
    let TF = START_TF;
    let lastCssW = 0;
    // Chart style (candle = the zone-split high-low bars), visible range
    // ("all", "1y", "4y" or "custom" with VIEW in ms) and crosshair state.
    let STYLE = START_STYLE;
    let RANGE = START_RANGE.range;
    let VIEW = START_RANGE.view || null;
    let META = null, LAYOUT = null;
    let HOVER = null; // crosshair x in layout units, or null
    let PANELS = { showPrice: START_PANELS.showPrice, showRsi: START_PANELS.showRsi };
    let TOOL = null; // "trend" | "horiz" | null (select / pan)
    let SELECTED = null;
    let PENDING = null; // first point of an in-progress trend line
    let HANDLE = null; // { id, end: 0|1, panel }
    let DEL_RECT = null;
    const DRAW_STORE = loadDrawStore();
    function storeKey() { return COIN.id + ":" + (MODE === "price" ? "price" : "relative"); }
    function currentLines() { return (DRAW_STORE[storeKey()] || []).slice(); }
    function setLines(arr) {
      DRAW_STORE[storeKey()] = arr;
      saveDrawStore(DRAW_STORE);
    }
    function syncToolCursor() {
      if (HANDLE) canvas.classList.add("is-dragging");
      else canvas.classList.remove("is-dragging");
      if (TOOL) canvas.classList.add("is-drawing");
      else canvas.classList.remove("is-drawing");
      canvas.style.touchAction = (TOOL || HANDLE) ? "none" : "";
    }

    function activeData() { return datas[TF] || datas.weekly; }

    const DATA0 = datas.weekly;
    if (DATA0.insufficient) {
      root.classList.add("is-short");
      if (stage && !stage.querySelector(".short-msg")) {
        const msg = document.createElement("p");
        msg.className = "short-msg";
        msg.textContent = "Not enough history yet: a zone appears after 200 weekly closes.";
        stage.appendChild(msg);
      }
      return {
        id: def.id, root: root,
        setMode: function () { return { insufficient: true }; },
        getMode: function () { return MODE; },
        onResize: function () {},
        exportPng: function () { return null; },
        shareInfo: function () { return { insufficient: true }; },
      };
    }

    function displayLayout(mode) {
      let layout;
      if (SHARE) layout = desktopLayout(mode);
      else {
        const cssW = stage && stage.clientWidth ? stage.clientWidth : (window.innerWidth || SHARE_W);
        if (cssW < MOBILE_MAX) layout = mobileLayout(cssW, mode);
        else {
          layout = desktopLayout(mode);
          layout.ty -= PRICE_TITLE_DY;
        }
      }
      return applyPanelLayout(layout, PANELS);
    }

    function minSpan(DATA) {
      return DATA.interval === "monthly" ? 10 * 30.44 * DAY : 12 * 7 * DAY;
    }
    // Right-edge geometry. "All" leaves an empty gap after the live bar
    // (PADW weeks / PADM months). Every zoomed view keeps the same gap as a
    // share of the visible span, so the live bar never sits on the edge.
    function edgeInfo(DATA) {
      const dom = fullDomain(DATA);
      const W = DATA.W, n = W.length - 1;
      const lastEnd = DATA.interval === "monthly" ? ms(addMonthsIso(W[n][0], 1)) : ms(W[n][0]) + 7 * DAY;
      const padFrac = (dom.t1 - lastEnd) / (dom.t1 - dom.t0);
      const leftFrac = (dom.first - dom.t0) / (dom.t1 - dom.t0);
      return { dom: dom, lastEnd: lastEnd, padFrac: padFrac, leftFrac: leftFrac };
    }
    function maxT1(E, span) { return E.lastEnd + E.padFrac * span; }
    function atEnd(v, E) { return v.t1 >= maxT1(E, v.t1 - v.t0) - 0.5 * DAY; }
    function clampView(v, DATA) {
      const E = edgeInfo(DATA), dom = E.dom;
      const full = dom.t1 - dom.t0;
      let span = Math.max(minSpan(DATA), v.t1 - v.t0);
      if (span >= full) return null;
      let t0 = v.t0, t1 = t0 + span;
      const mn = dom.t0; // same few-bar margin as "All"; panning stops there
      if (t0 < mn) { t0 = mn; t1 = t0 + span; }
      const mx = maxT1(E, span);
      if (t1 > mx) { t1 = mx; t0 = t1 - span; }
      return { t0: t0, t1: t1 };
    }
    function presetView(range, DATA) {
      const E = edgeInfo(DATA);
      const R = (range === "1y" ? 1 : 4) * 365.25 * DAY;
      // R of history before the live bar's end, plus the same right gap as "All".
      const span = R / (1 - E.padFrac);
      const t1 = maxT1(E, span);
      return clampView({ t0: t1 - span, t1: t1 }, DATA);
    }
    function resolveView(DATA) {
      if (RANGE === "all") return null;
      if (RANGE === "custom") return VIEW ? clampView(VIEW, DATA) : null;
      return presetView(RANGE, DATA);
    }

    function draw(mode) {
      const layout = displayLayout(mode);
      const x = sizeCanvas(canvas, layout);
      lastCssW = layout.mobile ? layout.W : (stage && stage.clientWidth) || layout.W;
      const DATA = activeData();
      layout.view = resolveView(DATA);
      layout.style = STYLE;
      layout.drawings = currentLines();
      const meta = drawInto(x, mode, layout, DATA, def);
      META = meta; LAYOUT = layout;
      drawOverlay();
      const tfWord = DATA.interval === "monthly" ? "monthly" : "weekly";
      canvas.setAttribute(
        "aria-label",
        (mode === "price" ? def.ariaPrice : def.ariaRel) +
          ", " + tfWord + " high-low bars. " + (COIN.unit === "Market cap" ? "Market cap " : "Price ") + fv(DATA.lastPx) + ", " + def.smaLabel + " " + fv(DATA.lastSma) +
          ", " + (DATA.lastPx / DATA.lastSma).toFixed(2) + " times, " +
          ZONES[zoneOfR(DATA.lastPx / DATA.lastSma)].name + " zone."
      );
      return meta;
    }

    // Write the current chart state to the URL (defaults are left out).
    let urlT = 0;
    function writeUrl() {
      if (SHARE || !window.history || !history.replaceState) return;
      clearTimeout(urlT);
      urlT = setTimeout(function () {
        const P = new URLSearchParams(location.search);
        ["coin", "view", "mode", "tf", "style", "range", "from", "to", "panels"].forEach(function (k) { P.delete(k); });
        if (COIN.id !== "btc") P.set("coin", COIN.id);
        if (MODE === "price") P.set("view", "regular");
        if (TF === "monthly") P.set("tf", "monthly");
        if (STYLE === "line") P.set("style", "line");
        if (PANELS.showPrice && PANELS.showRsi) P.set("panels", "both");
        else if (!PANELS.showPrice && PANELS.showRsi) P.set("panels", "rsi");
        if (RANGE === "1y" || RANGE === "4y") P.set("range", RANGE);
        else if (RANGE === "custom" && VIEW) {
          const iso = function (t) { return new Date(t).toISOString().slice(0, 10); };
          P.set("from", iso(VIEW.t0));
          P.set("to", iso(VIEW.t1));
        }
        const qs = P.toString();
        const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
        if (next !== location.pathname + location.search + location.hash) {
          try { history.replaceState(history.state, "", next); } catch (e) { /* ignore */ }
        }
      }, 120);
    }

    function syncToggles() {
      writeUrl();
      group.querySelectorAll("[data-mode]").forEach(function (b) {
        b.setAttribute("aria-checked", b.getAttribute("data-mode") === MODE ? "true" : "false");
      });
      if (groupTf) {
        groupTf.querySelectorAll("[data-tf]").forEach(function (b) {
          b.setAttribute("aria-checked", b.getAttribute("data-tf") === TF ? "true" : "false");
        });
      }
      if (groupStyle) {
        groupStyle.querySelectorAll("[data-style]").forEach(function (b) {
          b.setAttribute("aria-checked", b.getAttribute("data-style") === STYLE ? "true" : "false");
        });
      }
      if (groupRange) {
        groupRange.querySelectorAll("[data-range]").forEach(function (b) {
          b.setAttribute("aria-checked", b.getAttribute("data-range") === RANGE ? "true" : "false");
        });
      }
      if (groupPanels) {
        groupPanels.querySelectorAll("[data-panel]").forEach(function (b) {
          const on = b.getAttribute("data-panel") === "rsi" ? PANELS.showRsi : PANELS.showPrice;
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      if (groupTools) {
        groupTools.querySelectorAll("[data-tool]").forEach(function (b) {
          b.setAttribute("aria-checked", b.getAttribute("data-tool") === TOOL ? "true" : "false");
        });
      }
      syncToolCursor();
    }

    function setStyle(style, opts) {
      STYLE = style === "line" ? "line" : "candle";
      syncToggles();
      const meta = draw(MODE);
      if (opts && opts.focus && groupStyle) {
        const el = groupStyle.querySelector('[data-style="' + STYLE + '"]');
        if (el) el.focus();
      }
      return meta;
    }

    function setRange(range, opts) {
      if (range && typeof range === "object") {
        const v = clampView(range, activeData());
        RANGE = v ? "custom" : "all";
        VIEW = v;
      } else {
        RANGE = range === "1y" || range === "4y" ? range : "all";
        VIEW = null;
      }
      syncToggles();
      const meta = draw(MODE);
      if (opts && opts.focus && groupRange) {
        const el = groupRange.querySelector('[data-range="' + RANGE + '"]');
        if (el) el.focus();
      }
      return meta;
    }

    function setPanels(spec, opts) {
      let next;
      if (spec === "price") next = { showPrice: true, showRsi: false };
      else if (spec === "rsi") next = { showPrice: false, showRsi: true };
      else if (spec === "both") next = { showPrice: true, showRsi: true };
      else if (spec && typeof spec === "object") {
        next = { showPrice: !!spec.showPrice, showRsi: !!spec.showRsi };
      } else return PANELS;
      if (!next.showPrice && !next.showRsi) return PANELS;
      PANELS = next;
      if (SELECTED) {
        const ln = currentLines().filter(function (q) { return q.id === SELECTED; })[0];
        if (ln && ((ln.panel === "price" && !PANELS.showPrice) || (ln.panel === "rsi" && !PANELS.showRsi))) {
          SELECTED = null;
        }
      }
      PENDING = null;
      syncToggles();
      const meta = draw(MODE);
      if (opts && opts.focus && groupPanels) {
        const el = groupPanels.querySelector("[data-panel]");
        if (el) el.focus();
      }
      return meta;
    }
    function togglePanel(name) {
      const next = { showPrice: PANELS.showPrice, showRsi: PANELS.showRsi };
      if (name === "rsi") next.showRsi = !next.showRsi;
      else next.showPrice = !next.showPrice;
      if (!next.showPrice && !next.showRsi) return; // keep at least one on
      setPanels(next);
    }
    function setTool(tool, opts) {
      const t = tool === "trend" || tool === "horiz" ? tool : null;
      TOOL = TOOL === t ? null : t;
      PENDING = null;
      syncToggles();
      drawOverlay();
      if (opts && opts.focus && groupTools) {
        const el = groupTools.querySelector('[data-tool="' + (TOOL || "trend") + '"]');
        if (el) el.focus();
      }
      return TOOL;
    }

    function setMode(mode, opts) {
      MODE = mode === "price" ? "price" : "relative";
      SELECTED = null;
      PENDING = null;
      HANDLE = null;
      syncToggles();
      const meta = draw(MODE);
      if (opts && opts.focus) {
        const el = group.querySelector('[data-mode="' + MODE + '"]');
        if (el) el.focus();
      }
      return meta;
    }

    function setTf(tf, opts) {
      TF = tf === "monthly" ? "monthly" : "weekly";
      syncToggles();
      const meta = draw(MODE);
      if (opts && opts.focus && groupTf) {
        const el = groupTf.querySelector('[data-tf="' + TF + '"]');
        if (el) el.focus();
      }
      return meta;
    }

    function setView(mode, tf, opts) {
      if (tf) TF = tf === "monthly" ? "monthly" : "weekly";
      return setMode(mode == null ? MODE : mode, opts);
    }

    function drawShareExtras(x, mode, ST, meta) {
      const F = function (w, z) { x.font = w + " " + z + "px " + FONT; };
      const Tx = function (s, X, Y, col, al) {
        x.fillStyle = col; x.textAlign = al || "left"; x.fillText(s, X, Y);
      };
      x.textBaseline = "alphabetic";
      const wmX = ST.W - ST.Pd;
      // Small author credit under the site name.
      const wmY = ST.wmY != null ? ST.wmY : ST.ty;
      F(500, 13);
      Tx("by @_CryptoSurf", wmX, wmY + SHARE_HANDLE_DY, ST.wmc, "right");

      // Zone key is about the 200W SMA, so it stays off an RSI-only share.
      if (ST.showPrice === false) return;

      const items = [
        { name: "ACCUMULATION", range: "", color: "#0CD7F1" },
        { name: "NEUTRAL", range: "", color: "#e6e8eb" },
        { name: "DISTRIBUTION", range: "", color: "#ff9800" },
      ];
      const keySize = 15, itemGap = 28, rangeCol = "#c9ced6";
      const widths = items.map(function (it) {
        F(700, keySize);
        const nw = x.measureText(it.name).width;
        F(600, keySize);
        return { nw: nw, rw: x.measureText(it.range).width, w: nw + x.measureText(it.range).width };
      });
      let total = 0;
      widths.forEach(function (w, i) { total += w.w + (i ? itemGap : 0); });
      const isPrice = mode === "price";
      // Same row as the Price-view SMA legend (share Multiple also uses that band).
      const y = (meta.axisB != null ? meta.axisB : meta.B) + ST.yr + 32 + SHARE_KEY_SHIFT + (isPrice ? PRICE_LEGEND_DY : 0);
      let cx = (meta.L + meta.Rx) / 2 - total / 2;
      items.forEach(function (it, i) {
        F(700, keySize); Tx(it.name, cx, y, it.color);
        cx += widths[i].nw;
        F(600, keySize); Tx(it.range, cx, y, rangeCol);
        cx += widths[i].rw + itemGap;
      });
    }

    function renderShareCanvas(mode, tf) {
      const prev = TF;
      if (tf) TF = tf === "monthly" ? "monthly" : "weekly";
      const DATA = activeData();
      const layout = desktopLayout(mode);
      // Export what is on screen: same chart style and visible range.
      // The crosshair lives on its own overlay, so it never gets in here.
      layout.view = resolveView(DATA);
      layout.style = STYLE;
      // Same plot bottom as Price, so the zone key gets a clear row under the years.
      // RSI-only has no zone key: keep the full plot so the panel isn't short.
      if (mode !== "price" && PANELS.showPrice) layout.B = 488;
      layout.share = true;
      // Line the site name up with the title (cap-height, same header row).
      // Handle stays under the site name. On-page typography is unchanged.
      layout.wmY = layout.ty - Math.round((layout.tt - layout.wm) * 0.75);
      // Push the plot and footer down together and grow the canvas by the
      // same amount, so only the header-to-plot gap changes. Then add a
      // little more room between the years and the zone key (and the
      // metrics row below it) so nothing gets squeezed.
      layout.T += SHARE_PLOT_SHIFT;
      layout.B += SHARE_PLOT_SHIFT;
      const keyShift = PANELS.showPrice ? SHARE_KEY_SHIFT : 0;
      layout.ny += SHARE_PLOT_SHIFT + keyShift;
      layout.H += SHARE_PLOT_SHIFT + keyShift;
      applyPanelLayout(layout, PANELS);
      layout.drawings = currentLines();
      const off = document.createElement("canvas");
      off.width = SHARE_W * SHARE_D;
      off.height = layout.H * SHARE_D;
      const x = off.getContext("2d");
      x.scale(SHARE_D, SHARE_D);
      const meta = drawInto(x, mode, layout, DATA, def);
      drawShareExtras(x, mode, layout, meta);
      TF = prev;
      const out = document.createElement("canvas");
      out.width = SHARE_W;
      out.height = layout.H;
      const c = out.getContext("2d");
      c.imageSmoothingEnabled = true;
      c.drawImage(off, 0, 0, SHARE_W, layout.H);
      return out;
    }

    function downloadPng() {
      const out = renderShareCanvas(MODE, TF);
      const name = def.file + "-" + TF + "-" + MODE + ".png";
      const url = out.toDataURL("image/png");
      // Phones: open the native share sheet with the PNG (sync blob keeps the tap's user activation).
      const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.share && navigator.canShare && window.File) {
        try {
          const bin = atob(url.split(",")[1]);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const file = new File([arr], name, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file] }).catch(function (err) {
              if (err && err.name === "AbortError") return;
              saveLink(URL.createObjectURL(file), name);
            });
            return;
          }
        } catch (e) { /* fall through to download */ }
      }
      saveLink(url, name);
    }
    function saveLink(href, name) {
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); if (href.indexOf("blob:") === 0) URL.revokeObjectURL(href); }, 1500);
    }

    group.addEventListener("click", function (e) {
      const b = e.target.closest("[data-mode]");
      if (!b) return;
      setMode(b.getAttribute("data-mode"));
    });
    group.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      if (e.key === "Home") return setMode("relative", { focus: true });
      if (e.key === "End") return setMode("price", { focus: true });
      setMode(MODE === "relative" ? "price" : "relative", { focus: true });
    });
    if (groupTf) {
      groupTf.addEventListener("click", function (e) {
        const b = e.target.closest("[data-tf]");
        if (!b) return;
        setTf(b.getAttribute("data-tf"));
      });
      groupTf.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Home" && e.key !== "End") return;
        e.preventDefault();
        if (e.key === "Home") return setTf("weekly", { focus: true });
        if (e.key === "End") return setTf("monthly", { focus: true });
        setTf(TF === "weekly" ? "monthly" : "weekly", { focus: true });
      });
    }
    shareBtn.addEventListener("click", downloadPng);

    function bindRadio(el, attr, apply, values) {
      if (!el) return;
      el.addEventListener("click", function (e) {
        const b = e.target.closest("[" + attr + "]");
        if (!b) return;
        apply(b.getAttribute(attr));
      });
      el.addEventListener("keydown", function (e) {
        const k = e.key;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(k) < 0) return;
        e.preventDefault();
        const curB = el.querySelector('[aria-checked="true"]');
        let i = values.indexOf(curB ? curB.getAttribute(attr) : values[0]);
        if (k === "Home") i = 0;
        else if (k === "End") i = values.length - 1;
        else if (k === "ArrowLeft" || k === "ArrowUp") i = (Math.max(i, 0) - 1 + values.length) % values.length;
        else i = (i + 1) % values.length;
        apply(values[i], { focus: true });
      });
    }
    bindRadio(groupStyle, "data-style", setStyle, ["candle", "line"]);
    bindRadio(groupRange, "data-range", setRange, ["1y", "4y", "all"]);
    if (groupPanels) {
      groupPanels.addEventListener("click", function (e) {
        const b = e.target.closest("[data-panel]");
        if (!b) return;
        togglePanel(b.getAttribute("data-panel"));
      });
    }
    if (groupTools) {
      groupTools.addEventListener("click", function (e) {
        const b = e.target.closest("[data-tool]");
        if (!b) return;
        setTool(b.getAttribute("data-tool"));
      });
      groupTools.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { setTool(null); return; }
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(e.key) < 0) return;
        e.preventDefault();
        const vals = ["trend", "horiz"];
        let i = vals.indexOf(TOOL);
        if (e.key === "Home") i = 0;
        else if (e.key === "End") i = vals.length - 1;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (Math.max(i, 0) - 1 + vals.length) % vals.length;
        else i = (i + 1) % vals.length;
        TOOL = null;
        setTool(vals[i], { focus: true });
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        if (PENDING) { PENDING = null; drawOverlay(); return; }
        if (TOOL) { setTool(null); return; }
        if (SELECTED) { SELECTED = null; drawOverlay(); }
      } else if ((e.key === "Delete" || e.key === "Backspace") && SELECTED) {
        e.preventDefault();
        setLines(currentLines().filter(function (q) { return q.id !== SELECTED; }));
        SELECTED = null;
        draw(MODE);
      }
    });

    // ---- Crosshair overlay (on-page only; Share renders off-screen) ----
    const overlay = document.createElement("canvas");
    overlay.className = "xhair";
    overlay.setAttribute("aria-hidden", "true");
    if (stage) stage.appendChild(overlay);

    function toUnits(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const k = LAYOUT ? LAYOUT.W / (r.width || LAYOUT.W) : 1;
      return { x: (clientX - r.left) * k, y: (clientY - r.top) * k };
    }
    function nearestPt(ux) {
      if (!META || !META.pts || !META.pts.length) return null;
      let best = null, bd = Infinity;
      META.pts.forEach(function (q) {
        if (q.cx < META.L - 0.5 || q.cx > META.Rx + 0.5) return;
        const d = Math.abs(q.cx - ux);
        if (d < bd) { bd = d; best = q; }
      });
      return best;
    }
    function fmtBarDate(iso) {
      if (activeData().interval !== "monthly") return fmtDay(iso);
      const m = /^(\d{4})-(\d{2})/.exec(iso || "");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return m ? months[+m[2] - 1] + " " + m[1] : iso;
    }
    function drawOverlay() {
      if (!LAYOUT) return;
      const r = canvas.getBoundingClientRect();
      overlay.style.left = canvas.offsetLeft + "px";
      overlay.style.top = canvas.offsetTop + "px";
      overlay.style.width = r.width + "px";
      overlay.style.height = r.height + "px";
      if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
      }
      const x = overlay.getContext("2d");
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, overlay.width, overlay.height);
      DEL_RECT = null;
      const hasSel = !!(SELECTED || PENDING);
      const q = (HOVER != null && META) ? nearestPt(HOVER) : null;
      if (!q && !hasSel) { overlay.hidden = true; return; }
      overlay.hidden = false;
      const ST = LAYOUT;
      x.setTransform(ST.dpr, 0, 0, ST.dpr, 0, 0);
      if (q && !HANDLE && !TOOL) {
        const L = META.L, Rx = META.Rx;
        const top = plotTop(), bot = plotBot();
        const cx = Math.round(q.cx * ST.dpr) / ST.dpr + 0.5 / ST.dpr;
        x.save();
        x.strokeStyle = "rgba(201,206,214,0.55)";
        x.lineWidth = 1;
        x.setLineDash(ST.mobile ? [3, 3] : [4, 4]);
        x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, bot); x.stroke();
        x.restore();
        // Small ring on the close.
        if (META.showPrice && q.yp != null && q.yp >= META.T && q.yp <= META.B) {
          x.beginPath();
          x.arc(q.cx, q.yp, ST.mobile ? 3 : 4, 0, Math.PI * 2);
          x.fillStyle = BG; x.fill();
          x.lineWidth = ST.mobile ? 1.5 : 2;
          x.strokeStyle = INK; x.stroke();
        }
        if (META.showRsi && q.rsi != null && isFinite(q.rsi)) {
          const ry = rsiYAt(q.rsi, META.rsiT, META.rsiB);
          if (ry >= META.rsiT && ry <= META.rsiB) {
            x.beginPath();
            x.arc(q.cx, ry, ST.mobile ? 3 : 4, 0, Math.PI * 2);
            x.fillStyle = BG; x.fill();
            x.lineWidth = ST.mobile ? 1.5 : 2;
            x.strokeStyle = "#e6e8eb"; x.stroke();
          }
        }
        // Readout box.
        const fsz = ST.mobile ? 11 : 14, lh = ST.mobile ? 15 : 20, pad = ST.mobile ? 7 : 10;
        const rows = [
          [COIN.unit || "Price", fv(q.p), INK],
          [def.smaLabel, fv(q.s), INK],
          ["Multiple", q.r.toFixed(2) + "x", zoneColor(q.r)],
        ];
        if (META.showRsi && q.rsi != null && isFinite(q.rsi)) {
          rows.push(["RSI", q.rsi.toFixed(1), "#e6e8eb"]);
        }
        const title = fmtBarDate(q.t);
        x.font = "600 " + fsz + "px " + FONT;
        let lw = x.measureText(title).width, vw = 0, kw = 0;
        rows.forEach(function (rw) {
          x.font = "400 " + fsz + "px " + FONT; kw = Math.max(kw, x.measureText(rw[0]).width);
          x.font = "700 " + fsz + "px " + FONT; vw = Math.max(vw, x.measureText(rw[1]).width);
        });
        const gap = ST.mobile ? 10 : 16;
        const bw = Math.ceil(Math.max(lw, kw + gap + vw) + pad * 2);
        const bh = Math.ceil(pad * 2 + lh * (rows.length + 1) - (lh - fsz) + 2);
        const off = ST.mobile ? 10 : 14;
        let bx = q.cx + off;
        if (bx + bw > Rx) bx = q.cx - off - bw;
        if (bx < L) bx = Math.min(Rx - bw, L + 2);
        const by = top + (ST.mobile ? 4 : 8);
        x.fillStyle = "rgba(18,22,28,0.94)";
        x.strokeStyle = "#2c333d";
        x.lineWidth = 1;
        x.beginPath();
        if (x.roundRect) x.roundRect(bx + 0.5, by + 0.5, bw, bh, 6); else x.rect(bx + 0.5, by + 0.5, bw, bh);
        x.fill(); x.stroke();
        x.textBaseline = "alphabetic";
        let ty = by + pad + fsz;
        x.textAlign = "left";
        x.font = "600 " + fsz + "px " + FONT; x.fillStyle = INK; x.fillText(title, bx + pad, ty);
        rows.forEach(function (rw) {
          ty += lh;
          x.textAlign = "left"; x.font = "400 " + fsz + "px " + FONT; x.fillStyle = "#a7adb6";
          x.fillText(rw[0], bx + pad, ty);
          x.textAlign = "right"; x.font = "700 " + fsz + "px " + FONT; x.fillStyle = rw[2];
          x.fillText(rw[1], bx + bw - pad, ty);
        });
      }
      if (PENDING && META && HOVER != null) {
        const x1 = Math.max(META.L, Math.min(META.Rx, HOVER));
        const y1 = PENDING.hy != null ? PENDING.hy : valueToY(PENDING.v, PENDING.panel, META);
        const x0 = timeToX(PENDING.t, META), y0 = valueToY(PENDING.v, PENDING.panel, META);
        x.save();
        const clip = panelClip(PENDING.panel, META);
        x.beginPath();
        x.rect(META.L, clip.T, Math.max(0, META.Rx - META.L), Math.max(0, clip.B - clip.T));
        x.clip();
        x.strokeStyle = GREY;
        x.lineWidth = ST.mobile ? 1.25 : 1.45;
        x.setLineDash([5, 4]);
        x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
        x.setLineDash([]);
        x.beginPath(); x.arc(x0, y0, 4, 0, Math.PI * 2);
        x.fillStyle = BG; x.fill(); x.strokeStyle = INK; x.lineWidth = 1.5; x.stroke();
        x.restore();
      }
      if (SELECTED && META) {
        const sel = currentLines().filter(function (q) { return q.id === SELECTED; });
        DEL_RECT = drawCommittedLines(x, sel, META, ST, SELECTED, true);
        drawDeleteBtn(x, DEL_RECT);
      }
    }

    // ---- Zoom, pan, and drawing tools ----
    let raf = 0;
    function redrawSoon() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; draw(MODE); });
    }
    function curView() {
      const DATA = activeData();
      return resolveView(DATA) || fullDomain(DATA);
    }
    function setCustom(v) {
      const c = clampView(v, activeData());
      RANGE = c ? "custom" : "all";
      VIEW = c;
      syncToggles();
      redrawSoon();
    }
    function timeAt(ux, v) {
      const L = META.L, Rx = META.Rx;
      return v.t0 + ((ux - L) / (Rx - L)) * (v.t1 - v.t0);
    }
    function zoomAt(ux, factor) {
      if (!META) return;
      const v = curView();
      const E = edgeInfo(activeData());
      const span = (v.t1 - v.t0) * factor;
      if (atEnd(v, E)) {
        // Showing the live bar: zoom keeps it and its right gap in place.
        const t1 = maxT1(E, span);
        setCustom({ t0: t1 - span, t1: t1 });
        return;
      }
      const ta = timeAt(Math.max(META.L, Math.min(META.Rx, ux)), v);
      const k = span / (v.t1 - v.t0);
      setCustom({ t0: ta - (ta - v.t0) * k, t1: ta - (ta - v.t0) * k + span });
    }
    function plotTop() {
      if (!META) return 0;
      return META.showPrice ? META.T : META.rsiT;
    }
    function plotBot() {
      if (!META) return 0;
      return META.axisB != null ? META.axisB : (META.showRsi ? META.rsiB : META.B);
    }
    function inPlot(u) {
      return META && u.x >= META.L && u.x <= META.Rx && u.y >= plotTop() - 4 && u.y <= plotBot() + 4;
    }
    function panelAt(y) {
      if (!META) return null;
      if (META.showPrice && y >= META.T - 6 && y <= META.B + 6) return "price";
      if (META.showRsi && y >= META.rsiT - 6 && y <= META.rsiB + 6) return "rsi";
      return null;
    }
    function hitDelete(u) {
      if (!DEL_RECT) return false;
      return Math.abs(u.x - DEL_RECT.x) <= DEL_RECT.r + 3 && Math.abs(u.y - DEL_RECT.y) <= DEL_RECT.r + 3;
    }
    function hitHandle(u) {
      if (!SELECTED || !META) return null;
      const ln = currentLines().filter(function (q) { return q.id === SELECTED; })[0];
      if (!ln) return null;
      if (ln.panel === "price" && !META.showPrice) return null;
      if (ln.panel === "rsi" && !META.showRsi) return null;
      const ends = lineEnds(ln, META);
      const rad = (LAYOUT && LAYOUT.mobile) ? 14 : 10;
      if (Math.hypot(u.x - ends.x0, u.y - ends.y0) <= rad) return { id: ln.id, end: 0, panel: ln.panel };
      if (Math.hypot(u.x - ends.x1, u.y - ends.y1) <= rad) return { id: ln.id, end: 1, panel: ln.panel };
      return null;
    }
    function hitLine(u) {
      if (!META) return null;
      const thresh = (LAYOUT && LAYOUT.mobile) ? 14 : 8;
      let best = null, bd = thresh;
      currentLines().forEach(function (ln) {
        if (ln.panel === "price" && !META.showPrice) return;
        if (ln.panel === "rsi" && !META.showRsi) return;
        const ends = lineEnds(ln, META);
        const d = distToSeg(u.x, u.y, ends.x0, ends.y0, ends.x1, ends.y1);
        if (d <= bd) { bd = d; best = ln; }
      });
      return best;
    }

    canvas.addEventListener("wheel", function (e) {
      // Plain wheel / trackpad scroll scrolls the page. Zoom needs Ctrl or
      // Cmd (a trackpad pinch arrives as a Ctrl + wheel event).
      if (!e.ctrlKey && !e.metaKey) return;
      const u = toUnits(e.clientX, e.clientY);
      if (!inPlot(u)) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(u.x, Math.exp(Math.max(-0.5, Math.min(0.5, dy * 0.0018))));
      HOVER = u.x;
    }, { passive: false });

    const ptrs = new Map();
    let drag = null, pinch = null, drawAct = null;
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const u = toUnits(e.clientX, e.clientY);
      ptrs.set(e.pointerId, { x: u.x, y: u.y });
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (hitDelete(u)) {
        setLines(currentLines().filter(function (q) { return q.id !== SELECTED; }));
        SELECTED = null;
        drawAct = "delete";
        e.preventDefault();
        draw(MODE);
        return;
      }
      const h = hitHandle(u);
      if (h) {
        HANDLE = h;
        drawAct = "handle";
        HOVER = null;
        syncToolCursor();
        e.preventDefault();
        return;
      }
      const pan = panelAt(u.y);
      if (TOOL === "horiz" && pan && META && u.x >= META.L && u.x <= META.Rx) {
        const v = yToValue(u.y, pan, META);
        const ln = { id: newDrawId(), kind: "horiz", panel: pan, t0: META.t0, t1: META.t1, v0: v, v1: v };
        const arr = currentLines(); arr.push(ln); setLines(arr);
        SELECTED = ln.id;
        PENDING = null;
        drawAct = "place";
        e.preventDefault();
        draw(MODE);
        return;
      }
      if (TOOL === "trend" && pan && META && u.x >= META.L && u.x <= META.Rx) {
        const t = xToTime(u.x, META), v = yToValue(u.y, pan, META);
        if (!PENDING || PENDING.panel !== pan) {
          PENDING = { panel: pan, t: t, v: v };
          drawAct = "place";
          e.preventDefault();
          drawOverlay();
          return;
        }
        if (Math.hypot(timeToX(PENDING.t, META) - u.x, valueToY(PENDING.v, pan, META) - u.y) < 4) {
          drawAct = "place";
          e.preventDefault();
          return;
        }
        const ln = { id: newDrawId(), kind: "trend", panel: pan, t0: PENDING.t, v0: PENDING.v, t1: t, v1: v };
        const arr = currentLines(); arr.push(ln); setLines(arr);
        SELECTED = ln.id;
        PENDING = null;
        drawAct = "place";
        e.preventDefault();
        draw(MODE);
        return;
      }
      const hit = hitLine(u);
      if (hit) {
        SELECTED = hit.id;
        drawAct = "select";
        HOVER = null;
        e.preventDefault();
        drawOverlay();
        return;
      }
      if (SELECTED) { SELECTED = null; drawOverlay(); }
      if (e.pointerType === "mouse") {
        if (!inPlot(u) || TOOL) return;
        drag = { x: u.x, v: curView(), moved: false };
        canvas.classList.add("is-dragging");
        e.preventDefault();
      } else if (ptrs.size === 1) {
        // Touch / pen: one finger shows and scrubs the crosshair.
        HOVER = u.x; drawOverlay();
      } else if (ptrs.size === 2) {
        const a = Array.from(ptrs.values());
        HOVER = null; drawOverlay();
        pinch = {
          d: Math.max(10, Math.abs(a[0].x - a[1].x)),
          m: (a[0].x + a[1].x) / 2,
          v: curView(),
        };
        pinch.tm = timeAt(pinch.m, pinch.v);
      }
    });
    canvas.addEventListener("pointermove", function (e) {
      const u = toUnits(e.clientX, e.clientY);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: u.x, y: u.y });
      if (HANDLE && META) {
        const lines = currentLines();
        let ln = null;
        for (let i = 0; i < lines.length; i++) if (lines[i].id === HANDLE.id) ln = lines[i];
        if (ln) {
          const clip = panelClip(ln.panel, META);
          const y = Math.max(clip.T, Math.min(clip.B, u.y));
          const v = yToValue(y, ln.panel, META);
          if (ln.kind === "horiz") { ln.v0 = v; ln.v1 = v; }
          else {
            const px = Math.max(META.L, Math.min(META.Rx, u.x));
            const t = xToTime(px, META);
            if (HANDLE.end === 0) { ln.t0 = t; ln.v0 = v; }
            else { ln.t1 = t; ln.v1 = v; }
          }
          DRAW_STORE[storeKey()] = lines;
          redrawSoon();
        }
        return;
      }
      if (PENDING) {
        PENDING.hy = u.y;
        HOVER = u.x;
        drawOverlay();
        return;
      }
      if (e.pointerType === "mouse") {
        if (drag) {
          const dx = u.x - drag.x;
          if (Math.abs(dx) > 2) drag.moved = true;
          const dt = dx * (drag.v.t1 - drag.v.t0) / (META.Rx - META.L);
          setCustom({ t0: drag.v.t0 - dt, t1: drag.v.t1 - dt });
        }
        HOVER = inPlot(u) || drag ? u.x : null;
        if (!drag) drawOverlay();
        return;
      }
      if (pinch && ptrs.size >= 2) {
        const a = Array.from(ptrs.values());
        const d = Math.max(10, Math.abs(a[0].x - a[1].x));
        const m = (a[0].x + a[1].x) / 2;
        const span = (pinch.v.t1 - pinch.v.t0) * pinch.d / d;
        const E = edgeInfo(activeData());
        if (atEnd(pinch.v, E)) {
          const t1 = maxT1(E, span);
          setCustom({ t0: t1 - span, t1: t1 });
          return;
        }
        const frac = (m - META.L) / (META.Rx - META.L);
        const t0 = pinch.tm - frac * span;
        setCustom({ t0: t0, t1: t0 + span });
        return;
      }
      if (ptrs.size === 1 && ptrs.has(e.pointerId)) {
        HOVER = u.x; drawOverlay();
      }
    });
    function endPtr(e) {
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (HANDLE) {
        saveDrawStore(DRAW_STORE);
        HANDLE = null;
        syncToolCursor();
        draw(MODE);
      }
      drawAct = null;
      if (e.pointerType === "mouse") {
        drag = null;
        canvas.classList.remove("is-dragging");
      } else if (e.type === "pointercancel") {
        // The page took the gesture (vertical scroll): drop the crosshair.
        HOVER = null; drawOverlay();
      }
    }
    canvas.addEventListener("pointerup", endPtr);
    canvas.addEventListener("pointercancel", endPtr);
    canvas.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse" && !drag && !HANDLE) { HOVER = null; drawOverlay(); }
    });
    canvas.addEventListener("dblclick", function () { if (!TOOL && !PENDING) setRange("all"); });
    // Tap anywhere else hides a touch crosshair.
    document.addEventListener("pointerdown", function (e) {
      if (HOVER != null && e.target !== canvas) { HOVER = null; drawOverlay(); }
    });

    function onResize() {
      if (SHARE) return;
      const w = stage ? stage.clientWidth : 0;
      if (Math.abs(w - lastCssW) < 1) return;
      draw(MODE);
    }

    if (RANGE === "custom") {
      VIEW = VIEW ? clampView(VIEW, activeData()) : null;
      if (!VIEW) RANGE = "all";
    }
    setMode(MODE);

    return {
      id: def.id,
      def: def,
      data: datas,
      root: root,
      canvas: canvas,
      getMode: function () { return MODE; },
      getTf: function () { return TF; },
      setMode: setMode,
      setTf: setTf,
      setView: setView,
      setStyle: setStyle,
      setRange: setRange,
      getStyle: function () { return STYLE; },
      getRange: function () { return { range: RANGE, view: resolveView(activeData()) }; },
      getMeta: function () { return META; },
      setHover: function (ux) { HOVER = ux; drawOverlay(); return nearestPt(ux); },
      setPanels: setPanels,
      getPanels: function () { return { showPrice: PANELS.showPrice, showRsi: PANELS.showRsi }; },
      setTool: setTool,
      getTool: function () { return TOOL; },
      getDrawings: function () { return currentLines(); },
      setDrawings: function (arr) { setLines(arr || []); SELECTED = null; PENDING = null; draw(MODE); },
      selectDrawing: function (id) { SELECTED = id || null; drawOverlay(); return SELECTED; },
      getSelected: function () { return SELECTED; },
      getDelRect: function () { return DEL_RECT; },
      draw: draw,
      onResize: onResize,
      exportPng: function (mode, tf) { return renderShareCanvas(mode || MODE, tf || TF).toDataURL("image/png"); },
      shareInfo: function (mode, tf) {
        const m = mode || MODE;
        const prev = TF;
        if (tf) TF = tf === "monthly" ? "monthly" : "weekly";
        const DATA = activeData();
        const layout = desktopLayout(m);
        layout.view = resolveView(DATA);
        layout.style = STYLE;
        const off = document.createElement("canvas");
        off.width = 8; off.height = 8;
        const meta = drawInto(off.getContext("2d"), m, layout, DATA, def);
        TF = prev;
        const last = meta.last || {};
        return {
          id: def.id, mode: m, tf: TF, interval: meta.interval,
          price: meta.price, sma: meta.sma, mult: meta.mult,
          zone: meta.zone,
          L: meta.L, Rx: meta.Rx, T: meta.T, B: meta.B, W: meta.W, H: meta.H,
          top: meta.top, bot: meta.bot, ticks: meta.ticks,
          start: meta.start, n: meta.n, smaLabel: def.smaLabel,
          closedN: meta.closedN,
          closedPaddle: meta.closedPaddle,
          closedRide: meta.closedRide,
          closedKick: meta.closedKick,
          closedLowAtOrBelow1: meta.closedLowAtOrBelow1,
          closedHighAtOrAbove2: meta.closedHighAtOrAbove2,
          closedInside12: meta.closedInside12,
          closedBoth: meta.closedBoth,
          liveZone: meta.liveZone,
          last: {
            x: last.x, yp: last.yp, p: last.p, s: last.s, r: last.r,
            zone: last.zone, dotR: last.dotR, dotStroke: last.dotStroke, lw: last.lw
          }
        };
      },
    };
  }

  function setNote() {
    const el = document.getElementById("note");
    if (!el || !SHARED) return;
    const live = SHARED.live;
    const first = SHARED.cards[0];
    if (first.liveOn) {
      const d = new Date(live.at);
      el.textContent = "Live price \u00b7 updated " + fmtHM(d);
      el.title = (live && live.source ? live.source : LIVE_SRC) + " \u00b7 " + d.toLocaleString();
    } else if (COIN.unit === "Market cap") {
      el.textContent = "Market cap \u00b7 last weekly close \u00b7 " + fmtCached(first.pass);
      el.title = first.source || "cached";
    } else {
      el.textContent = "Cached close \u00b7 " + fmtCached(first.pass);
      el.title = first.source || "cached";
    }
  }

  // Small grey line under the chart: when the numbers were last updated,
  // in the visitor's time zone.
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function fmtStamp(d) {
    let tz = "";
    try {
      const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(d).filter(function (q) { return q.type === "timeZoneName"; })[0];
      tz = part ? part.value : "";
    } catch (e) { tz = ""; }
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + fmtHM(d) + (tz ? " " + tz : "");
  }
  function passDate(pass) {
    const m = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(?:\s+(CEST|CET|UTC))?/.exec(pass || "");
    if (!m) return null;
    const off = m[3] === "CEST" ? "+02:00" : m[3] === "UTC" ? "Z" : "+01:00";
    const d = new Date(m[1] + "T" + m[2] + ":00" + off);
    return isFinite(d.getTime()) ? d : null;
  }
  function setSourceLine() {
    const el = document.getElementById("chart-src");
    if (!el || !SHARED) return;
    const first = SHARED.cards[0];
    const live = SHARED.live;
    const seg = function (t) { return '<span class="nowrap">' + t + "</span>"; };
    let text;
    if (first.liveOn && live) {
      text = "Updated " + fmtStamp(new Date(live.at));
    } else {
      const d = passDate(first.pass);
      text = "Updated " + (d ? fmtStamp(d) : (first.pass || ""));
    }
    el.innerHTML = seg(text);
    el.hidden = false;
  }

  function setPageCopy() {
    if (!SHARED) return;
    setNote();
    setSourceLine();
    const d = SHARED.weekly || SHARED.cards[0];
    const mo = SHARED.monthly;
    const unitLower = COIN.unit === "Market cap" ? "market cap" : "price";
    const unitLabel = COIN.unit === "Market cap" ? "Market cap" : "Price";
    const tag = document.getElementById("tagline");
    if (tag) {
      tag.textContent = "Crypto value zones, simplified.";
    }
    const lead = document.getElementById("howto-lead");
    if (lead) {
      lead.innerHTML = "Zones are set by where the chart sits versus its <span class=\"nowrap\">200-week</span> SMA:";
    }
    document.querySelectorAll(".unit-word").forEach(function (el) {
      el.textContent = unitLabel;
    });
    const h = document.getElementById("topline");
    if (h) {
      if (d.insufficient) {
        h.textContent = COIN.name + " does not have enough history for the 200-week average yet.";
      } else {
        const z = ZONES[d.liveZone];
        h.innerHTML = COIN.name + " is in the " +
          '<span class="zone z-' + z.id + ' nowrap">' + z.name + "</span>" +
          " zone";
      }
    }
    window.__PAGE = {
      coin: COIN.id,
      name: COIN.name,
      zone: d.liveZone,
      mult: d.liveMult,
      price: d.lastPx,
      sma: d.lastSma,
      lastWeek: d.lastWeek,
      start: d.start,
      closedN: d.closedN,
      closedPaddle: d.closedPaddle,
      closedRide: d.closedRide,
      closedKick: d.closedKick,
      closedLowAtOrBelow1: d.closedLowAtOrBelow1,
      closedHighAtOrAbove2: d.closedHighAtOrAbove2,
      closedInside12: d.closedInside12,
      closedBoth: d.closedBoth,
      missingHL: d.missingHL,
      source: d.source,
      monthlySource: mo && mo.source,
      monthly: mo && {
        start: mo.start, last: mo.lastWeek,
        closedN: mo.closedN,
        closedLowAtOrBelow1: mo.closedLowAtOrBelow1,
        closedHighAtOrAbove2: mo.closedHighAtOrAbove2,
        closedInside12: mo.closedInside12,
        closedBoth: mo.closedBoth,
        missingHL: mo.missingHL,
        sma: mo.lastSma, mult: mo.liveMult, zone: mo.liveZone,
      },
    };
  }

  function bindCoinDropdown(btn, menu, nav) {
    function options() {
      return Array.prototype.slice.call(menu.querySelectorAll("a[data-coin]"));
    }
    function isOpen() {
      return btn.getAttribute("aria-expanded") === "true";
    }
    function openMenu() {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      const cur = menu.querySelector("a.is-current") || options()[0];
      if (cur) cur.focus();
    }
    function closeMenu(opts) {
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      if (!opts || opts.focus !== false) btn.focus();
    }
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) closeMenu({ focus: false });
      else openMenu();
    });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOpen()) openMenu();
      }
    });
    menu.addEventListener("keydown", function (e) {
      const items = options();
      const i = items.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(Math.max(i, 0) + 1) % items.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(i <= 0 ? items.length : i) - 1].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (e.key === "Tab") {
        closeMenu({ focus: false });
      }
    });
    document.addEventListener("click", function (e) {
      if (isOpen() && !nav.contains(e.target)) closeMenu({ focus: false });
    });
  }

  function initChrome() {
    document.title = COIN.name + " 200W \u00b7 SurfCharts";
    const btn = document.getElementById("coin-dd-btn");
    const menu = document.getElementById("coin-dd");
    const nav = document.querySelector(".coin-nav");
    if (btn) {
      btn.textContent = COIN.name;
      btn.setAttribute("aria-label", "Choose coin or market cap, current " + COIN.name);
    }
    document.querySelectorAll(".coin-dd a[data-coin]").forEach(function (a) {
      const on = a.getAttribute("data-coin") === COIN.id;
      a.classList.toggle("is-current", on);
      if (on) {
        a.setAttribute("aria-current", "page");
        a.setAttribute("aria-checked", "true");
      } else {
        a.removeAttribute("aria-current");
        a.removeAttribute("aria-checked");
      }
    });
    document.querySelectorAll(".coin-fact").forEach(function (el) {
      el.hidden = el.getAttribute("data-coin") !== COIN.id;
    });
    if (btn && menu && nav) bindCoinDropdown(btn, menu, nav);
  }

  function boot() {
    initChrome();
    if (SHARE) {
      document.body.classList.add("share-only");
      const el = document.querySelector('.card[data-card="' + (SHARE_CARD || "200w") + '"]') ||
                 document.querySelector(".card");
      if (el) el.classList.add("share-target");
    }
    function loadJson(url, label) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(label + " http " + r.status);
        return r.json();
      });
    }
    return Promise.all([
      loadJson(COIN.data, "weekly"),
      loadJson(COIN.monthly, "monthly"),
    ]).then(function (pack) {
        const jw = pack[0], jm = pack[1];
        if (!jw || !jw.W || !jw.W.length) throw new Error("weekly OHLC missing");
        if (!jm || !(jm.M || jm.W) || !(jm.M || jm.W).length) throw new Error("monthly OHLC missing");
        var liveP = (SHARE || !LIVE_URL) ? Promise.resolve(null) : fetchLive().catch(function () { return null; });
        return liveP.then(function (live) {
          const def = CARD_DEFS[0];
          const weekly = applyCard(jw, live, def);
          const monthly = applyMonthly(jm, weekly, live, def);
          const built = [weekly];
          SHARED = {
            live: live, weekly: weekly, monthly: monthly, cards: built,
            source: jw.source, pass: jw.pass,
            monthlySource: jm.source, monthlyPass: jm.pass,
          };
          const inst = attachCard(def, { weekly: weekly, monthly: monthly });
          cards[inst.id] = inst;
          setPageCopy();
          let rt = 0;
          const kick = function () {
            clearTimeout(rt);
            rt = setTimeout(function () {
              Object.keys(cards).forEach(function (id) { cards[id].onResize(); });
            }, 80);
          };
          window.addEventListener("resize", kick);
          window.addEventListener("orientationchange", function () { setTimeout(kick, 160); });
          if (window.ResizeObserver) {
            Object.keys(cards).forEach(function (id) {
              new ResizeObserver(kick).observe(cards[id].root.querySelector(".stage"));
            });
          }
          window.__LIVE = {
            ok: !!(live && live.price > 0),
            source: live && live.price > 0 ? live.source : "cached",
            url: live && live.url ? live.url : null,
            price: weekly.lastPx,
            cachedClose: weekly.cachedClose,
            pass: weekly.pass,
            sourceWeekly: weekly.source,
            sourceMonthly: monthly.source,
            lastWeek: weekly.lastWeek,
            lastMonth: monthly.lastWeek,
            at: live && live.at,
            coin: COIN.id,
            zone: weekly.liveZone,
            mult: weekly.liveMult,
          };
          window.__MONTHLY = {
            source: monthly.source, pass: monthly.pass,
            start: monthly.start, last: monthly.lastWeek,
            closedN: monthly.closedN,
            closedLowAtOrBelow1: monthly.closedLowAtOrBelow1,
            closedHighAtOrAbove2: monthly.closedHighAtOrAbove2,
            closedInside12: monthly.closedInside12,
            closedBoth: monthly.closedBoth,
            missingHL: monthly.missingHL,
            sma: monthly.lastSma, mult: monthly.liveMult, zone: monthly.liveZone,
            insufficient: !!monthly.insufficient,
          };
          window.__CARDS = built.map(function (d) {
            return {
              id: d.id, n: d.n, smaLabel: d.smaLabel, start: d.start, lastWeek: d.lastWeek,
              price: d.lastPx, sma: d.lastSma,
              mult: d.liveMult,
              zone: d.liveZone,
              closedN: d.closedN,
              closedPaddle: d.closedPaddle,
              closedRide: d.closedRide,
              closedKick: d.closedKick,
              closedLowAtOrBelow1: d.closedLowAtOrBelow1,
              closedHighAtOrAbove2: d.closedHighAtOrAbove2,
              closedInside12: d.closedInside12,
              closedBoth: d.closedBoth,
              missingHL: d.missingHL,
              insufficient: !!d.insufficient,
              weeks: d.weeks, need: d.need,
            };
          });
          window.__READY = true;
          return window.__CARDS;
        });
      })
      .catch(function (e) {
        window.__ERR = String(e && e.stack ? e.stack : e);
        const el = document.getElementById("note");
        if (el) el.textContent = "Could not load the weekly or monthly data.";
        throw e;
      });
  }

  window.RUN = boot;
  window.__draw = function (cardId, mode, tf) {
    if (cardId === "relative" || cardId === "price") {
      tf = mode; mode = cardId; cardId = null;
    }
    if (cardId === "weekly" || cardId === "monthly") {
      tf = cardId; cardId = null;
    }
    if (mode === "weekly" || mode === "monthly") {
      tf = mode; mode = null;
    }
    const go = function (id) { return cards[id].setView(mode, tf); };
    if (!cardId) {
      return Object.keys(cards).map(go);
    }
    return go(cardId);
  };
  window.__card = function (id) { return cards[id || "200w"]; };
  window.__exportPng = function (cardId, mode, tf) {
    const id = cardId || SHARE_CARD || "200w";
    return cards[id].exportPng(mode, tf);
  };
  window.__shareInfo = function (cardId, mode, tf) {
    const id = cardId || SHARE_CARD || "200w";
    return cards[id].shareInfo(mode, tf);
  };
  boot();
})();
