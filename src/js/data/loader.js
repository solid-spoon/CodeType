const cache = new Map();
let manifestPromise = null;

const FALLBACK = [{ id: "_fallback", tags: [], code: "console.log('hello');" }];

export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch("data/languages.json")
      .then((r) => r.json())
      .catch((e) => {
        console.error("manifest load failed", e);
        return { version: 1, languages: [] };
      });
  }
  return manifestPromise;
}

export async function loadSnippets(id) {
  if (cache.has(id)) return cache.get(id);
  try {
    const res = await fetch(`data/snippets/${id}.json`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.snippets) || !data.snippets.length) {
      throw new Error("empty");
    }
    cache.set(id, data.snippets);
    return data.snippets;
  } catch (e) {
    console.warn(`snippets for "${id}" unavailable:`, e);
    cache.set(id, FALLBACK);
    return FALLBACK;
  }
}
