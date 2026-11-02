export function clear(el: HTMLElement): void {
  el.replaceChildren();
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, string | number | boolean | null | undefined> & {
    className?: string;
    text?: string;
    html?: string;
  },
  children?: (Node | string | null | undefined)[],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    const { className, text, html, ...rest } = props;
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    if (html != null) node.innerHTML = html;
    for (const [k, v] of Object.entries(rest)) {
      if (v == null || v === false) continue;
      if (k === 'value' && 'value' in node) {
        (node as HTMLInputElement).value = String(v);
        continue;
      }
      if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, String(v));
    }
  }
  if (children) {
    for (const c of children) {
      if (c == null) continue;
      node.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return node;
}

export function formatDate(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlightMatch(text: string, q: string): string {
  if (!q.trim()) return escapeHtml(text);
  const lower = text.toLowerCase();
  const needle = q.trim().toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const mid = escapeHtml(text.slice(idx, idx + needle.length));
  const after = escapeHtml(text.slice(idx + needle.length));
  return `${before}<mark>${mid}</mark>${after}`;
}
