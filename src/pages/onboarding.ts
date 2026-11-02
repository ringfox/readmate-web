import { el } from '../ui/dom';
import { navigate } from '../router';
import { getApiKey, loadData } from '../store/storage';
import { saveAndValidateKey, fullSync } from '../sync/sync';
import type { SyncProgress } from '../store/types';
import { WereadError } from '../api/weread';

export function renderOnboarding(app: HTMLElement): void {
  const existing = getApiKey();
  const status = el('p', { className: 'status', text: '' });
  const progress = el('div', { className: 'progress hidden' }, [
    el('div', { className: 'progress-track' }, [el('div', { className: 'progress-bar' })]),
    el('p', { className: 'progress-text', text: '' }),
  ]);
  const bar = progress.querySelector('.progress-bar') as HTMLElement;
  const progressText = progress.querySelector('.progress-text') as HTMLElement;

  const input = el('input', {
    className: 'input',
    type: 'password',
    placeholder: 'wrk-xxxxxxxx',
    autocomplete: 'off',
    spellcheck: 'false',
  }) as HTMLInputElement;
  if (existing) input.value = existing;

  const btn = el('button', {
    className: 'btn primary',
    type: 'button',
    text: existing ? '重新验证并同步' : '保存并同步',
  }) as HTMLButtonElement;

  const setProgress = (p: SyncProgress) => {
    progress.classList.remove('hidden');
    progressText.textContent = p.message;
    if (p.total && p.current != null) {
      const pct = Math.round((p.current / Math.max(p.total, 1)) * 100);
      bar.style.width = `${pct}%`;
    } else if (p.phase === 'done') {
      bar.style.width = '100%';
    } else if (p.phase === 'validating' || p.phase === 'shelf') {
      bar.style.width = '15%';
    }
  };

  btn.addEventListener('click', async () => {
    status.textContent = '';
    status.classList.remove('error', 'ok');
    btn.disabled = true;
    try {
      await saveAndValidateKey(input.value, setProgress);
      status.classList.add('ok');
      status.textContent = 'Key 有效，开始同步…';
      await fullSync(setProgress);
      status.textContent = `完成：已缓存 ${Object.keys(loadData().books).length} 本书`;
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      status.classList.add('error');
      status.textContent =
        err instanceof WereadError || err instanceof Error
          ? err.message
          : String(err);
      progress.classList.add('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  app.append(
    el('header', { className: 'page-header' }, [
      el('p', { className: 'eyebrow', text: '开始使用' }),
      el('h1', { className: 'page-title', text: '连接微信读书' }),
      el('p', {
        className: 'page-desc',
        text: 'API Key 与划线数据只保存在本机浏览器 localStorage，不经过我们的服务器。',
      }),
    ]),
    el('section', { className: 'card stack' }, [
      el('label', { className: 'label', text: '微信读书 Skill API Key' }),
      input,
      el('ol', { className: 'help-list' }, [
        el('li', {
          text: '打开 https://weread.qq.com/r/weread-skills 登录并复制 Key（wrk-…）',
        }),
        el('li', { text: '或在 App：我 → 设置 → 微信读书技能 → 获取 API Key' }),
        el('li', { text: '粘贴后点保存；首次会同步笔记本与划线/想法' }),
      ]),
      btn,
      status,
      progress,
    ]),
  );
}
