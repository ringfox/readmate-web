import { el, formatDate } from '../ui/dom';
import { navigate } from '../router';
import { bookList, getApiKey, loadData } from '../store/storage';
import { renderChrome } from './shell';
import { fullSync } from '../sync/sync';

export function renderHome(app: HTMLElement): void {
  if (!getApiKey()) {
    navigate('/onboarding');
    return;
  }

  const data = loadData();
  const books = bookList(data);

  const body = el('div', { className: 'stack' });

  const syncRow = el('div', { className: 'row between' }, [
    el('p', {
      className: 'muted small',
      text: data.lastFullSyncAt
        ? `上次同步 ${formatDate(data.lastFullSyncAt)}`
        : '尚未完整同步',
    }),
  ]);
  const syncBtn = el('button', {
    className: 'btn ghost sm',
    type: 'button',
    text: '重新同步',
  }) as HTMLButtonElement;
  const syncStatus = el('p', { className: 'status small', text: '' });
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncStatus.classList.remove('error', 'ok');
    syncStatus.textContent = '同步中…';
    try {
      await fullSync((p) => {
        syncStatus.textContent = p.message;
      });
      syncStatus.classList.add('ok');
      navigate('/');
    } catch (err) {
      syncStatus.classList.add('error');
      syncStatus.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      syncBtn.disabled = false;
    }
  });
  syncRow.append(syncBtn);
  body.append(syncRow, syncStatus);

  if (books.length === 0) {
    body.append(
      el('div', { className: 'card empty' }, [
        el('p', { text: '还没有缓存书籍。点「重新同步」拉取笔记本与划线。' }),
      ]),
    );
  } else {
    const list = el('div', { className: 'book-list' });
    for (const b of books) {
      const count = b.highlights.length || b.noteCount || 0;
      const thought = b.thoughts.length || b.reviewCount || 0;
      const card = el('button', {
        className: 'book-card',
        type: 'button',
      });
      const cover = b.cover
        ? el('img', {
            className: 'cover',
            src: b.cover,
            alt: '',
            loading: 'lazy',
            referrerpolicy: 'no-referrer',
          })
        : el('div', { className: 'cover placeholder', text: '书' });
      card.append(
        cover,
        el('div', { className: 'book-meta' }, [
          el('h2', { className: 'book-title', text: b.title }),
          el('p', { className: 'book-author', text: b.author }),
          el('p', {
            className: 'book-stats',
            text: `${count} 划线 · ${thought} 想法`,
          }),
        ]),
      );
      card.addEventListener('click', () => navigate(`/book/${encodeURIComponent(b.bookId)}`));
      list.append(card);
    }
    body.append(list);
  }

  renderChrome(app, 'home', body);
}
