// Browser storage that never throws (private windows and embedded previews can block it).
const memory = new Map();

export function load(key, fallback = null) {
  try {
    const v = window.localStorage.getItem(key);
    if (v != null) return JSON.parse(v);
  } catch (_) {
    // fall through to memory
  }
  return memory.has(key) ? memory.get(key) : fallback;
}

export function save(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

export function remove(key) {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch (_) {
    // ignore
  }
}
