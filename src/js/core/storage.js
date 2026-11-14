import { LB_KEY, MAX_STORED } from "./constants.js";

export function normalizeResult(r) {
  if (!r || typeof r !== "object") return null;
  const wpm = Number(r.wpm);
  const accuracy = Number(r.accuracy);
  if (!isFinite(wpm) || !isFinite(accuracy)) return null;
  return {
    name: String(r.name || "anonymous").slice(0, 20),
    wpm: Math.round(wpm),
    accuracy: Math.round(accuracy),
    time: Math.max(0, Math.round(Number(r.time) || 0)),
    lang: String(r.lang || "unknown"),
    correct: Math.max(0, Math.round(Number(r.correct) || 0)),
    errors: Math.max(0, Math.round(Number(r.errors) || 0)),
    date: r.date || new Date().toISOString(),
  };
}

export function readLB() {
  try {
    const v = JSON.parse(localStorage.getItem(LB_KEY) || "[]");
    if (!Array.isArray(v)) return [];
    return v.map(normalizeResult).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function writeLB(list) {
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
  } catch (e) {
    /* quota exceeded — ignore */
  }
}

export function saveScore(result) {
  const n = normalizeResult(result);
  if (!n) return;
  const data = readLB();
  data.push(n);
  data.sort((a, b) => b.wpm - a.wpm);
  writeLB(data);
}

export function myResults(user) {
  return readLB().filter((r) => r.name === user);
}

export function clearMyResults(user) {
  writeLB(readLB().filter((r) => r.name !== user));
}

export function renameMy(user, next) {
  writeLB(readLB().map((r) => (r.name === user ? { ...r, name: next } : r)));
}
