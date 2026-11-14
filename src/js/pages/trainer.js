import { $, toast } from "../core/dom.js";
import { escapeHtml } from "../core/format.js";
import { saveScore } from "../core/storage.js";
import { USER_KEY, LANG_KEY, RANDOM_LANG } from "../core/constants.js";
import { loadManifest, loadSnippets } from "../data/loader.js";
import "../components/header.js";

const USER = localStorage.getItem(USER_KEY) || "anonymous";
document.title = `CodeType — ${USER}`;

let languages = [];
let target = "";
let typed = [];
let startTime = null;
let finished = false;
let currentLang = RANDOM_LANG;
let actualLang = null;
let lastResult = null;

function langLabel(id) {
  const l = languages.find((x) => x.id === id);
  return l ? l.name : id;
}

function buildLangSelect() {
  const sel = $("lang");
  sel.innerHTML = "";

  const randomOpt = document.createElement("option");
  randomOpt.value = RANDOM_LANG;
  randomOpt.textContent = "🎲 Random";
  sel.appendChild(randomOpt);

  for (const l of languages) {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    sel.appendChild(opt);
  }

  const saved = localStorage.getItem(LANG_KEY);
  if (
    saved === RANDOM_LANG ||
    (saved && languages.some((l) => l.id === saved))
  ) {
    currentLang = saved;
  } else {
    currentLang = RANDOM_LANG;
    localStorage.setItem(LANG_KEY, RANDOM_LANG);
  }
  sel.value = currentLang;
}

function resolveLang() {
  if (currentLang === RANDOM_LANG && languages.length) {
    return languages[Math.floor(Math.random() * languages.length)].id;
  }
  return currentLang;
}

async function start() {
  finished = false;
  lastResult = null;
  typed = [];
  startTime = null;
  target = "";
  $("wpm").textContent = "0";
  $("acc").textContent = "100%";
  $("time").textContent = "0s";
  $("save").disabled = false;
  $("modal").classList.add("hidden");

  actualLang = resolveLang();
  $("actual-lang").textContent =
    currentLang === RANDOM_LANG ? `→ ${langLabel(actualLang)}` : "";

  const pool = await loadSnippets(actualLang);
  target = pool[Math.floor(Math.random() * pool.length)].code;
  render();
  $("text").focus();
}

function render() {
  let html = "";
  for (let i = 0; i < target.length; i++) {
    const t = target[i];
    let cls = "char";
    if (i < typed.length) cls += typed[i] === t ? " correct" : " incorrect";
    else if (i === typed.length) cls += " current";
    else cls += " pending";

    let content;
    if (t === "\n") content = "\n";
    else if (t === " ") content = " ";
    else if (t === "\t") content = "    ";
    else content = escapeHtml(t);

    html += `<span class="${cls}">${content}</span>`;
  }
  $("text").innerHTML = html;
}

function countCorrect() {
  let n = 0;
  const limit = Math.min(typed.length, target.length);
  for (let i = 0; i < limit; i++) if (typed[i] === target[i]) n++;
  return n;
}

function updateStats() {
  if (!startTime) return;
  const elapsed = (Date.now() - startTime) / 1000;
  const correct = countCorrect();
  const wpm = elapsed > 0 ? Math.round(correct / 5 / (elapsed / 60)) : 0;
  const acc =
    typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;
  $("wpm").textContent = wpm;
  $("acc").textContent = acc + "%";
  $("time").textContent = Math.round(elapsed) + "s";
}

function finish() {
  finished = true;
  const elapsed = Math.max(0.1, (Date.now() - startTime) / 1000);
  const correct = countCorrect();
  const wpm = Math.round(correct / 5 / (elapsed / 60));
  const acc =
    typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;

  $("r-wpm").textContent = wpm;
  $("r-acc").textContent = acc + "%";
  $("r-time").textContent = Math.round(elapsed) + "s";

  lastResult = {
    name: USER,
    wpm,
    accuracy: acc,
    time: Math.round(elapsed),
    lang: actualLang,
    correct,
    errors: Math.max(0, typed.length - correct),
    date: new Date().toISOString(),
  };

  $("save").disabled = false;
  $("modal").classList.remove("hidden");
}

function handleChar(ch) {
  if (finished || !target || typed.length >= target.length) return;
  if (!startTime) startTime = Date.now();
  typed.push(ch);
  render();
  updateStats();
  if (typed.length >= target.length) finish();
}

function handleBackspace() {
  if (finished || typed.length === 0) return;
  typed.pop();
  render();
  updateStats();
}

function handleTab() {
  if (finished || !target) return;
  if (!startTime) startTime = Date.now();

  let count = 0;
  while (
    typed.length + count < target.length &&
    (target[typed.length + count] === " " ||
      target[typed.length + count] === "\t")
  )
    count++;

  if (count === 0) return;

  for (let i = 0; i < count && typed.length < target.length; i++) {
    typed.push(target[typed.length]);
  }
  render();
  updateStats();
  if (typed.length >= target.length) finish();
}

function saveResult() {
  if (!lastResult || lastResult.saved) return;
  lastResult.saved = true;
  saveScore(lastResult);
  $("save").disabled = true;
  $("modal").classList.add("hidden");
  toast("saved ✓");
  $("text").focus();
}

document.addEventListener("keydown", (e) => {
  const modalOpen = !$("modal").classList.contains("hidden");

  if (modalOpen) {
    if (e.key === "Escape") {
      e.preventDefault();
      $("modal").classList.add("hidden");
      $("text").focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      saveResult();
    }
    return;
  }

  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === "Escape") {
    e.preventDefault();
    start();
    return;
  }
  if (finished) return;

  if (e.key === "Backspace") {
    e.preventDefault();
    handleBackspace();
    return;
  }
  if (e.key === "Tab") {
    if (e.shiftKey) return;
    e.preventDefault();
    handleTab();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    handleChar("\n");
    return;
  }
  if (e.key.length === 1) {
    e.preventDefault();
    handleChar(e.key);
  }
});

$("save").addEventListener("click", saveResult);
$("again").addEventListener("click", start);
$("restart").addEventListener("click", start);
$("text").addEventListener("click", () => $("text").focus());

$("lang").addEventListener("change", (e) => {
  currentLang = e.target.value;
  localStorage.setItem(LANG_KEY, currentLang);
  start();
});

// init
(async () => {
  try {
    const manifest = await loadManifest();
    languages = manifest.languages || [];
  } catch (e) {
    console.error(e);
  }
  buildLangSelect();
  await start();
})();
