function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function drawChart(canvas, values, opts = {}, progress = 1) {
  const color = opts.color || "#e2b714";
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 40,
    padR = 14,
    padT = 14,
    padB = 20;
  const iw = w - padL - padR;
  const ih = h - padT - padB;

  ctx.font = "10px ui-monospace, monospace";
  ctx.textBaseline = "middle";

  if (!values.length) {
    canvas._points = [];
    ctx.fillStyle = "#5a5a65";
    ctx.textAlign = "center";
    ctx.fillText("no data yet", w / 2, h / 2);
    return;
  }

  let lo, hi;
  if (opts.fixedMin != null && opts.fixedMax != null) {
    lo = opts.fixedMin;
    hi = opts.fixedMax;
  } else {
    lo = Math.min(...values);
    hi = Math.max(...values);
    if (lo === hi) {
      lo = Math.max(0, lo - 5);
      hi += 5;
    }
    const pad = (hi - lo) * 0.18;
    lo = Math.max(0, lo - pad);
    hi += pad;
  }

  const n = values.length;
  const X = (i) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih;

  ctx.strokeStyle = "#1e1e26";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#5a5a65";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const v = lo + (hi - lo) * (i / 4);
    const yy = Math.round(Y(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(padL + iw, yy);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), padL - 8, yy);
  }

  const count = Math.max(2, Math.ceil(n * progress));
  const drawn = values.slice(0, count);
  const pts = drawn.map((v, i) => ({ x: X(i), y: Y(v) }));

  if (pts.length) {
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ih);
    grad.addColorStop(0, hexA(color, 0.24));
    grad.addColorStop(1, hexA(color, 0));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[pts.length - 1].x, padT + ih);
    ctx.lineTo(pts[0].x, padT + ih);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (pts.length) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  if (n <= 40 && progress >= 1) {
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(X(i), Y(values[i]), 2.8, 0, Math.PI * 2);
      ctx.fillStyle = "#0b0b0d";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  canvas._points = values.map((v, i) => ({ x: X(i), y: Y(v), val: v }));
}

export function animateChart(canvas, values, opts) {
  if (!values.length) {
    drawChart(canvas, values, opts, 1);
    return;
  }
  const start = performance.now();
  const dur = 700;
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    drawChart(canvas, values, opts, eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function attachTooltip(wrapId, canvas, data, formatter) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  let tip = wrap.querySelector(".chart-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tip";
    wrap.appendChild(tip);
  }
  canvas.addEventListener("mousemove", (e) => {
    const pts = canvas._points || [];
    if (!pts.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - mx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const p = pts[best];
    tip.style.left = p.x + "px";
    tip.style.top = p.y - 12 + "px";
    tip.innerHTML = formatter(p.val, data.dates[best]);
    tip.classList.add("show");
  });
  canvas.addEventListener("mouseleave", () => tip.classList.remove("show"));
}

export function drawSpark(canvas, values) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (values.length < 2) return;

  const lo = Math.min(...values),
    hi = Math.max(...values);
  const pad = 4;
  const X = (i) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const Y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(226,183,20,0.35)");
  grad.addColorStop(1, "rgba(226,183,20,0)");

  ctx.beginPath();
  ctx.moveTo(X(0), Y(values[0]));
  for (let i = 1; i < values.length; i++) ctx.lineTo(X(i), Y(values[i]));
  ctx.lineTo(X(values.length - 1), h);
  ctx.lineTo(X(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(X(0), Y(values[0]));
  for (let i = 1; i < values.length; i++) ctx.lineTo(X(i), Y(values[i]));
  ctx.strokeStyle = "#e2b714";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();
}
