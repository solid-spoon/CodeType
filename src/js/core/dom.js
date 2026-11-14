export const $ = (id) => document.getElementById(id);

export function animateNumber(el, target, suffix = "") {
  const dur = 800;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.innerHTML = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let _toastEl = null;
let _toastTimer = 0;
export function toast(msg) {
  if (!_toastEl) {
    _toastEl = document.createElement("div");
    _toastEl.className = "toast";
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = msg;
  _toastEl.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl.classList.remove("show"), 1800);
}
