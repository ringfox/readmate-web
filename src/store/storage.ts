import type { AppData } from './types';

const KEY_API = 'readmate.apiKey';
const KEY_DATA = 'readmate.data';
const KEY_PROXY = 'readmate.preferProxy';
const KEY_PROXY_URL = 'readmate.proxyUrl';

const emptyData = (): AppData => ({ version: 1, books: {} });

export function getApiKey(): string | null {
  const v = localStorage.getItem(KEY_API);
  return v && v.trim() ? v.trim() : null;
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_API, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_API);
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY_DATA);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || parsed.version !== 1 || typeof parsed.books !== 'object') {
      return emptyData();
    }
    return parsed;
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY_DATA, JSON.stringify(data));
}

export function clearData(): void {
  localStorage.removeItem(KEY_DATA);
}

export function resetAll(): void {
  clearApiKey();
  clearData();
  localStorage.removeItem(KEY_PROXY);
  // keep custom proxy URL preference if set
}

export function getPreferProxy(): boolean {
  return localStorage.getItem(KEY_PROXY) === '1';
}

export function setPreferProxy(v: boolean): void {
  localStorage.setItem(KEY_PROXY, v ? '1' : '0');
}

export function getProxyUrl(): string {
  const stored = localStorage.getItem(KEY_PROXY_URL);
  if (stored && stored.trim()) return stored.trim().replace(/\/$/, '');
  const env = import.meta.env.VITE_WEREAD_PROXY_URL;
  if (env && String(env).trim()) return String(env).trim().replace(/\/$/, '');
  // 本地 Vite 开发：走同域代理
  if (typeof location !== 'undefined' && /localhost|127\.0\.0\.1/.test(location.hostname)) {
    return '/api/weread';
  }
  // 生产默认：已部署的无状态 CORS 代理（不存 Key）
  return 'https://readmate-weread-proxy.5151app.workers.dev';
}

export function setProxyUrl(url: string): void {
  localStorage.setItem(KEY_PROXY_URL, url.trim().replace(/\/$/, ''));
}

export function bookList(data: AppData = loadData()) {
  return Object.values(data.books).sort((a, b) => {
    const sa = a.sort ?? a.readUpdateTime ?? 0;
    const sb = b.sort ?? b.readUpdateTime ?? 0;
    return sb - sa;
  });
}

export function totalHighlights(data: AppData = loadData()): number {
  return Object.values(data.books).reduce((n, b) => n + b.highlights.length, 0);
}

export function totalThoughts(data: AppData = loadData()): number {
  return Object.values(data.books).reduce((n, b) => n + b.thoughts.length, 0);
}
