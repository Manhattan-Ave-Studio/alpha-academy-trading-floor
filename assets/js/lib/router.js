// Hash router: #/path/segments. Works on any static host (GitHub Pages) and inside embedded previews.

const routes = [];
let memoryPath = null;
let listener = null;

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/\/:([a-zA-Z]+)/g, (_, k) => {
      keys.push(k);
      return '/([^/]+)';
    }) + '/?$'
  );
  routes.push({ re, keys, handler, pattern });
}

export function currentPath() {
  if (memoryPath != null) return memoryPath;
  const h = (typeof location !== 'undefined' && location.hash) || '';
  const p = h.startsWith('#/') ? h.slice(1) : '/';
  return p.split('?')[0] || '/';
}

export function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1]);
      });
      return { handler: r.handler, params, pattern: r.pattern };
    }
  }
  return null;
}

export function navigate(path, { replace = false } = {}) {
  try {
    const target = '#' + path;
    if (location.hash === target) {
      dispatch();
      return;
    }
    memoryPath = null;
    if (replace && history.replaceState) {
      history.replaceState(null, '', target);
      dispatch();
    } else {
      location.hash = target;
    }
  } catch (_) {
    memoryPath = path;
    dispatch();
  }
}

function dispatch() {
  if (listener) listener(currentPath());
}

export function start(onRoute) {
  listener = onRoute;
  window.addEventListener('hashchange', () => {
    memoryPath = null;
    dispatch();
  });
  dispatch();
}
