import { el, formatDate } from '../ui/dom';
import { navigate } from '../router';
import {
  bookList,
  clearData,
  getApiKey,
  getPreferProxy,
  getProxyUrl,
  loadData,
  resetAll,
  setPreferProxy,
  setProxyUrl,
  totalHighlights,
  totalThoughts,
} from '../store/storage';
import { renderChrome } from './shell';
import { fullSync, saveAndValidateKey } from '../sync/sync';

export function renderSettings(app: HTMLElement): void {
  const key = getApiKey();
  const data = loadData();
  const body = el('div', { className: 'stack' });

  const keyInput = el('input', {
    className: 'input',
    type: 'password',
    placeholder: 'wrk-xxxxxxxx',
    value: key || '',
  }) as HTMLInputElement;

  const proxyInput = el('input', {
    className: 'input',
    type: 'url',
    placeholder: '/api/weread 或 https://your-worker.workers.dev',
    value: getProxyUrl(),
  }) as HTMLInputElement;

  const prefer = el('label', { className: 'check' }, []) as HTMLLabelElement;
  const preferBox = el('input', {
    type: 'checkbox',
  }) as HTMLInputElement;
  preferBox.checked = getPreferProxy();
  prefer.append(preferBox, document.createTextNode(' 优先走 CORS 代理（微信读书网关通常禁止浏览器直连）'));

  const status = el('p', { className: 'status', text: '' });

  const saveKeyBtn = el('button', {
    className: 'btn primary',
    type: 'button',
    text: '保存 Key',
  }) as HTMLButtonElement;
  saveKeyBtn.addEventListener('click', async () => {
    status.classList.remove('error', 'ok');
    try {
      await saveAndValidateKey(keyInput.value);
      setProxyUrl(proxyInput.value || getProxyUrl());
      setPreferProxy(preferBox.checked);
      status.classList.add('ok');
      status.textContent = '已保存';
    } catch (err) {
      status.classList.add('error');
      status.textContent = err instanceof Error ? err.message : String(err);
    }
  });

  const syncBtn = el('button', {
    className: 'btn',
    type: 'button',
    text: '立即同步',
  }) as HTMLButtonElement;
  syncBtn.addEventListener('click', async () => {
    setProxyUrl(proxyInput.value || getProxyUrl());
    setPreferProxy(preferBox.checked);
    status.classList.remove('error', 'ok');
    syncBtn.disabled = true;
    try {
      await fullSync((p) => {
        status.textContent = p.message;
      });
      status.classList.add('ok');
      navigate('/settings');
    } catch (err) {
      status.classList.add('error');
      status.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      syncBtn.disabled = false;
    }
  });

  const clearBtn = el('button', {
    className: 'btn danger',
    type: 'button',
    text: '清除本机数据与 Key',
  }) as HTMLButtonElement;
  clearBtn.addEventListener('click', () => {
    if (!confirm('确定清除本机 API Key 和所有缓存划线？')) return;
    resetAll();
    clearData();
    navigate('/onboarding');
  });

  body.append(
    el('section', { className: 'card stack' }, [
      el('h2', { className: 'section-title', text: '账号' }),
      el('p', {
        className: 'muted small',
        text: key
          ? `已保存 Key（${key.slice(0, 8)}…）· 本机 localStorage`
          : '尚未配置 Key',
      }),
      el('label', { className: 'label', text: 'API Key' }),
      keyInput,
      saveKeyBtn,
    ]),
    el('section', { className: 'card stack' }, [
      el('h2', { className: 'section-title', text: '网络' }),
      el('label', { className: 'label', text: '代理地址' }),
      proxyInput,
      prefer,
      el('p', {
        className: 'muted small',
        text: '直连 https://i.weread.qq.com 的 CORS 只允许 weread.qq.com。网页端默认尝试直连，失败后自动改走代理。',
      }),
      syncBtn,
      status,
    ]),
    el('section', { className: 'card stack' }, [
      el('h2', { className: 'section-title', text: '本机缓存' }),
      el('p', {
        className: 'muted',
        text: `${bookList(data).length} 本书 · ${totalHighlights(data)} 划线 · ${totalThoughts(data)} 想法`,
      }),
      el('p', {
        className: 'muted small',
        text: data.lastFullSyncAt
          ? `上次完整同步 ${formatDate(data.lastFullSyncAt)}`
          : '尚未同步',
      }),
      clearBtn,
    ]),
    el('section', { className: 'card stack' }, [
      el('h2', { className: 'section-title', text: '关于' }),
      el('p', {
        className: 'muted small',
        text: '非官方网页版，调用腾讯微信读书 Skills 网关。数据仅存浏览器。',
      }),
      el('a', {
        className: 'link',
        href: 'https://github.com/Tencent/WeChatReading',
        target: '_blank',
        rel: 'noopener',
        text: '官方 Skills 文档',
      }),
    ]),
  );

  renderChrome(app, 'settings', body);
}
