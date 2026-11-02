import { el } from '../ui/dom';
import { navigate } from '../router';
import { getApiKey, bookList, totalHighlights } from '../store/storage';

export function renderChrome(
  app: HTMLElement,
  active: 'home' | 'search' | 'settings',
  body: HTMLElement,
): void {
  const hasKey = !!getApiKey();
  const books = bookList();
  const hl = totalHighlights();

  const nav = el('nav', { className: 'tabbar' }, [
    el('button', {
      className: `tab ${active === 'home' ? 'active' : ''}`,
      type: 'button',
      text: '书架',
    }),
    el('button', {
      className: `tab ${active === 'search' ? 'active' : ''}`,
      type: 'button',
      text: '搜索',
    }),
    el('button', {
      className: `tab ${active === 'settings' ? 'active' : ''}`,
      type: 'button',
      text: '设置',
    }),
  ]);
  const tabs = nav.querySelectorAll('button');
  tabs[0]?.addEventListener('click', () => navigate('/'));
  tabs[1]?.addEventListener('click', () => navigate('/search'));
  tabs[2]?.addEventListener('click', () => navigate('/settings'));

  const headerMeta = hasKey
    ? el('p', {
        className: 'page-desc',
        text: `${books.length} 本 · ${hl} 条划线（本机缓存）`,
      })
    : el('p', { className: 'page-desc', text: '粘贴微信读书 Skill API Key 开始' });

  app.append(
    el('header', { className: 'page-header' }, [
      el('p', { className: 'eyebrow', text: 'Readmate Web' }),
      el('h1', { className: 'page-title', text: '我的划线' }),
      headerMeta,
    ]),
    body,
    nav,
  );
}
