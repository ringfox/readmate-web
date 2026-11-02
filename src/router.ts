export type Route =
  | { name: 'home' }
  | { name: 'book'; bookId: string }
  | { name: 'search'; q?: string }
  | { name: 'settings' }
  | { name: 'onboarding' };

type Listener = (route: Route) => void;

const listeners = new Set<Listener>();

function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'book' && parts[1]) return { name: 'book', bookId: decodeURIComponent(parts[1]) };
  if (parts[0] === 'search') return { name: 'search', q: params.get('q') || '' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'onboarding') return { name: 'onboarding' };
  return { name: 'home' };
}

export function currentRoute(): Route {
  return parseHash(location.hash || '#/');
}

export function navigate(to: string): void {
  const next = to.startsWith('#') ? to : `#${to}`;
  if (location.hash === next) {
    emit();
    return;
  }
  location.hash = next;
}

export function onRoute(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  const r = currentRoute();
  for (const fn of listeners) fn(r);
}

export function startRouter(): void {
  window.addEventListener('hashchange', emit);
  if (!location.hash) location.hash = '#/';
  else emit();
}
