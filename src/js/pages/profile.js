import { $, animateNumber, toast } from "../core/dom.js";
import { fmtDate, fmtDuration, escapeHtml } from "../core/format.js";
import {
  readLB,
  writeLB,
  myResults,
  clearMyResults,
  renameMy,
} from "../core/storage.js";
import {
  USER_KEY,
  NAME_KEY,
  LANG_KEY,
  SINCE_KEY,
  RANDOM_LANG,
  MAX_SHOWN,
} from "../core/constants.js";
import {
  animateChart,
  drawChart,
  drawSpark,
  attachTooltip,
} from "../components/chart.js";
import "../components/header.js";

let user = localStorage.getItem(USER_KEY);
if (!user) location.replace("login.html");

const byDateAsc = (a, b) => new Date(a.date) - new Date(b.date);
const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

function computeStreak(results) {
  if (!results.length) return 0;
  const days = new Set(results.map((r) => new Date(r.date).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function computeTrend(results) {
  if (results.length < 4) return null;
  const chrono = [...results].sort(byDateAsc).slice(-30);
  const mid = Math.floor(chrono.length / 2);
  const prev = chrono.slice(0, mid);
  const curr = chrono.slice(mid);
  const avg = (arr) => arr.reduce((s, r) => s + r.wpm, 0) / arr.length;
  return Math.round(avg(curr) - avg(prev));
}

function computeAchievements(results) {
  const out = [];
  const races = results.length;
  const best = races ? Math.max(...results.map((r) => r.wpm)) : 0;
  const streak = computeStreak(results);
  const langs = new Set(results.map((r) => r.lang)).size;
  const totalSec = results.reduce((s, r) => s + (r.time || 0), 0);
  const perfect = results.some((r) => r.accuracy === 100);

  if (races >= 1) out.push({ icon: "🚀", label: "first race", cls: "" });
  if (races >= 10) out.push({ icon: "📊", label: "10 races", cls: "" });
  if (races >= 50) out.push({ icon: "🏆", label: "50 races", cls: "" });
  if (best >= 50) out.push({ icon: "⚡", label: "50 wpm", cls: "" });
  if (best >= 100) out.push({ icon: "🔥", label: "100 wpm", cls: "" });
  if (streak >= 3)
    out.push({ icon: "🔥", label: `${streak}-day streak`, cls: "" });
  if (langs >= 3)
    out.push({ icon: "🌐", label: `${langs} languages`, cls: "" });
  if (perfect) out.push({ icon: "🎯", label: "perfect acc", cls: "" });
  if (totalSec >= 3600) out.push({ icon: "⏱️", label: "1h typed", cls: "" });
  return out;
}

function renderIdentity() {
  $("user-name").textContent = user;
  $("avatar").textContent = (user.trim().charAt(0) || "?").toUpperCase();
  document.title = `CodeType — ${user}`;

  const mine = myResults(user).sort(byDateAsc);
  const since = localStorage.getItem(SINCE_KEY);
  const first = since || (mine.length ? mine[0].date : null);
  $("user-since").textContent = first
    ? "joined " + fmtDate(first)
    : "no races yet";

  const bestWpm = mine.length ? Math.max(...mine.map((r) => r.wpm)) : 0;
  const lb = readLB();
  const rankIdx = lb.findIndex((r) => r.name === user && r.wpm === bestWpm);
  $("user-rank").textContent =
    rankIdx >= 0 ? "#" + (rankIdx + 1) + " globally" : "unranked";

  const ach = computeAchievements(mine);
  $("badges").innerHTML = ach.length
    ? ach
        .map(
          (a, i) =>
            `<span class="badge fade-in" style="animation-delay:${i * 40}ms">${a.icon} ${a.label}</span>`,
        )
        .join("")
    : '<span class="badge" style="opacity:.5">no achievements yet</span>';
}

function renderStats() {
  const mine = myResults(user);
  const races = mine.length;
  const best = races ? Math.max(...mine.map((r) => r.wpm)) : 0;
  const avg = races
    ? Math.round(mine.reduce((s, r) => s + r.wpm, 0) / races)
    : 0;
  const avgAcc = races
    ? Math.round(mine.reduce((s, r) => s + (r.accuracy || 0), 0) / races)
    : 0;
  const totalSec = mine.reduce((s, r) => s + (r.time || 0), 0);
  const chars = mine.reduce((s, r) => s + (r.correct || 0), 0);
  const streak = computeStreak(mine);
  const trend = computeTrend(mine);

  const feature = $("feature-value");
  if (!best) feature.innerHTML = "— <small>wpm</small>";
  else animateNumber(feature, best, " <small>wpm</small>");

  const chrono = [...mine].sort(byDateAsc).slice(-12);
  drawSpark(
    $("spark-best"),
    chrono.map((r) => r.wpm),
  );

  const tiles = [
    { label: "races", value: races, suffix: "" },
    { label: "avg wpm", value: avg, suffix: "", trend },
    { label: "avg accuracy", value: avgAcc, suffix: "%" },
    { label: "streak", value: streak, suffix: streak === 1 ? " day" : " days" },
    { label: "time typed", value: fmtDuration(totalSec), raw: true },
    {
      label: "chars typed",
      value: chars >= 1000 ? (chars / 1000).toFixed(1) + "k" : String(chars),
      raw: true,
    },
  ];

  $("stat-grid").innerHTML = tiles
    .map((t, i) => {
      let delta = "";
      if (t.trend != null) {
        const cls = t.trend > 0 ? "up" : t.trend < 0 ? "down" : "neutral";
        const arrow = t.trend > 0 ? "↑" : t.trend < 0 ? "↓" : "→";
        delta = `<span class="tile-delta ${cls}">${arrow} ${Math.abs(t.trend)} wpm</span>`;
      }
      const valueHtml = t.raw
        ? t.value
        : `<span class="value" data-count="${t.value}" data-suffix="${t.suffix}">0${t.suffix}</span>`;
      return `<div class="tile fade-in" style="animation-delay:${i * 30}ms">
      <span class="label">${t.label}</span>${valueHtml}${delta}
    </div>`;
    })
    .join("");

  document.querySelectorAll("#stat-grid .value[data-count]").forEach((el) => {
    animateNumber(el, parseFloat(el.dataset.count), el.dataset.suffix || "");
  });
}

function renderCharts(animated = true) {
  const chrono = myResults(user).sort(byDateAsc).slice(-30);
  const wpmVals = chrono.map((r) => r.wpm);
  const accVals = chrono.map((r) => r.accuracy);
  const dates = chrono.map((r) => r.date);

  const wpmOpts = { color: "#e2b714" };
  const accOpts = { color: "#7ee787", fixedMin: 0, fixedMax: 100 };

  if (animated) {
    animateChart($("chart-wpm"), wpmVals, wpmOpts);
    animateChart($("chart-acc"), accVals, accOpts);
  } else {
    drawChart($("chart-wpm"), wpmVals, wpmOpts, 1);
    drawChart($("chart-acc"), accVals, accOpts, 1);
  }

  attachTooltip(
    "wpm-wrap",
    $("chart-wpm"),
    { values: wpmVals, dates },
    (v, d) =>
      `<span class="tip-val">${v} wpm</span><span class="tip-date">${fmtDate(d)}</span>`,
  );
  attachTooltip(
    "acc-wrap",
    $("chart-acc"),
    { values: accVals, dates },
    (v, d) =>
      `<span class="tip-val">${v}%</span><span class="tip-date">${fmtDate(d)}</span>`,
  );

  const trendEl = $("wpm-trend");
  const trend = computeTrend(myResults(user));
  if (trend != null) {
    trendEl.textContent =
      (trend > 0 ? "↑ +" : trend < 0 ? "↓ " : "→ ") + trend + " vs previous";
    trendEl.style.color =
      trend > 0 ? "var(--green)" : trend < 0 ? "var(--red)" : "var(--text-3)";
  } else {
    trendEl.textContent = "";
  }
}

function renderLanguages() {
  const mine = myResults(user);
  const box = $("lang-breakdown");

  if (!mine.length) {
    box.innerHTML = `<div class="empty">
      <div class="empty-icon">📊</div>
      <div class="empty-title">No languages yet</div>
      <div>Complete a race to see your per-language breakdown.</div>
      <a class="btn btn-primary" href="trainer.html" style="margin-top:6px">Start racing →</a>
    </div>`;
    return;
  }

  const map = new Map();
  for (const r of mine) {
    const key = r.lang || "unknown";
    const e = map.get(key) || { n: 0, sum: 0, best: 0 };
    e.n++;
    e.sum += r.wpm;
    e.best = Math.max(e.best, r.wpm);
    map.set(key, e);
  }

  const rows = [...map.entries()]
    .map(([lang, e]) => ({
      lang,
      n: e.n,
      avg: Math.round(e.sum / e.n),
      best: e.best,
    }))
    .sort((a, b) => b.avg - a.avg);

  const maxAvg = Math.max(1, ...rows.map((r) => r.avg));
  const maxBest = Math.max(1, ...rows.map((r) => r.best));

  box.innerHTML = rows
    .map(
      (r) => `
    <div class="lang-row fade-in">
      <span class="name">${escapeHtml(r.lang)}</span>
      <div class="bar-stack">
        <div class="bar avg"><i style="width:${(r.avg / maxAvg) * 100}%"></i></div>
        <div class="bar best"><i style="width:${(r.best / maxBest) * 100}%"></i></div>
      </div>
      <span class="meta">${r.avg} <span style="opacity:.5">avg</span> · ${r.best} <span style="opacity:.5">best</span></span>
    </div>`,
    )
    .join("");
}

function renderHistory() {
  const all = myResults(user).sort(byDateDesc);
  const rows = all.slice(0, 20);
  const tbody = $("history");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:36px;color:var(--text-3)">
      No races yet — <a href="trainer.html" style="color:var(--accent);text-decoration:none">start racing →</a>
    </td></tr>`;
    return;
  }

  const bestWpm = Math.max(...all.map((r) => r.wpm));
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td class="dimc">${fmtDate(r.date)}</td>
      <td class="langc">${escapeHtml(r.lang || "—")}</td>
      <td class="num">${r.wpm}${r.wpm === bestWpm ? '<span class="best-mark">★</span>' : ""}</td>
      <td class="num">${r.accuracy}%</td>
      <td class="num dimc">${r.time}s</td>
    </tr>`,
    )
    .join("");
}

function renderLeaderboard() {
  const lb = readLB();
  const data = lb.slice(0, MAX_SHOWN);
  const list = $("lb-list");
  const medals = ["🥇", "🥈", "🥉"];

  if (!data.length) {
    list.innerHTML = `<li style="display:block;text-align:center;padding:32px;color:var(--text-3)">No results yet — be the first!</li>`;
    return;
  }

  list.innerHTML = data
    .map((r, i) => {
      const isMe = r.name === user;
      const rankHtml =
        i < 3
          ? `<span class="rank top">${medals[i]}</span>`
          : `<span class="rank">#${i + 1}</span>`;
      return `<li class="${isMe ? "me" : ""}">
      ${rankHtml}
      <span class="name ${isMe ? "me" : ""}">${escapeHtml(r.name || "anonymous")}</span>
      <span class="wpm">${r.wpm} <small>wpm</small></span>
      <span class="acc">${r.accuracy}%</span>
      <span class="langc">${escapeHtml(r.lang || "")}</span>
    </li>`;
    })
    .join("");

  const myBest = myResults(user).reduce((m, r) => Math.max(m, r.wpm), 0);
  const myRank = lb.findIndex((r) => r.name === user && r.wpm === myBest);
  const callout = $("my-rank-callout");
  callout.innerHTML =
    myRank >= 0
      ? `<span class="rank-callout">you're #${myRank + 1}</span>`
      : "";
}

function renderAll(animated = true) {
  renderIdentity();
  renderStats();
  renderCharts(animated);
  renderLanguages();
  renderHistory();
  renderLeaderboard();
}

$("rename").addEventListener("click", () => {
  const next = prompt("New nickname:", user);
  if (next === null) return;
  const name = next.trim().replace(/\s+/g, " ").slice(0, 20);
  if (!name || name === user) return;

  const mine = myResults(user);
  const renameHistory =
    mine.length > 0 &&
    confirm(`Also rename your ${mine.length} past result(s)?`);
  if (renameHistory) renameMy(user, name);

  localStorage.setItem(USER_KEY, name);
  localStorage.setItem(NAME_KEY, name);
  user = name;
  renderAll();
  toast("renamed to " + name);
});

$("share").addEventListener("click", async () => {
  const mine = myResults(user);
  const best = mine.length ? Math.max(...mine.map((r) => r.wpm)) : 0;
  const avg = mine.length
    ? Math.round(mine.reduce((s, r) => s + r.wpm, 0) / mine.length)
    : 0;
  const text = `${user} on CodeType — ${best} wpm best · ${avg} wpm avg · ${mine.length} races`;
  try {
    await navigator.clipboard.writeText(text);
    toast("stats copied to clipboard");
  } catch (e) {
    prompt("Copy your stats:", text);
  }
});

$("export").addEventListener("click", () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    name: user,
    lang: localStorage.getItem(LANG_KEY) || RANDOM_LANG,
    leaderboard: readLB(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codetype-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("exported");
});

$("import").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (Array.isArray(data.leaderboard)) {
        const existing = readLB();
        const seen = new Set();
        const merged = [...existing, ...data.leaderboard].filter((r) => {
          if (!r || typeof r.wpm !== "number") return false;
          const key = `${r.name}|${r.wpm}|${r.accuracy}|${r.time}|${r.date}|${r.lang}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        merged.sort((a, b) => b.wpm - a.wpm);
        writeLB(merged);
      }
      if (typeof data.lang === "string")
        localStorage.setItem(LANG_KEY, data.lang);
      renderAll();
      toast("import complete");
    } catch (err) {
      console.error(err);
      alert("Import failed: " + err.message);
    }
  });
  input.click();
});

$("clear").addEventListener("click", () => {
  const mine = myResults(user);
  if (!mine.length) {
    toast("nothing to clear");
    return;
  }
  if (!confirm(`Delete your ${mine.length} result(s)? This cannot be undone.`))
    return;
  clearMyResults(user);
  renderAll();
  toast("cleared");
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderCharts(false);
    const chrono = myResults(user).sort(byDateAsc).slice(-12);
    drawSpark(
      $("spark-best"),
      chrono.map((r) => r.wpm),
    );
  }, 150);
});

renderAll(true);
