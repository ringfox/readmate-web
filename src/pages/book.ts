import { el, formatDate } from '../ui/dom';
import { navigate } from '../router';
import { loadData } from '../store/storage';
import type { Highlight, Thought } from '../store/types';

function thoughtsForHighlight(thoughts: Thought[], h: Highlight): Thought[] {
  if (!h.range) return [];
  return thoughts.filter((t) => t.range && t.range === h.range);
}

function renderHighlightCard(h: Highlight, thoughts: Thought[]): HTMLElement {
  const card = el('article', { className: 'note-card' }, [
    el('blockquote', { className: 'quote', text: h.markText }),
    el('p', {
      className: 'note-meta',
      text: [h.chapterTitle, formatDate(h.createTime)].filter(Boolean).join(' · '),
    }),
  ]);
  for (const t of thoughts) {
    card.append(
      el('div', { className: 'thought' }, [
        el('p', { className: 'thought-label', text: '我的想法' }),
        el('p', { className: 'thought-body', text: t.content }),
        el('p', { className: 'note-meta', text: formatDate(t.createTime) }),
      ]),
    );
  }
  return card;
}

function renderThoughtCard(t: Thought): HTMLElement {
  const kids: (Node | null)[] = [];
  if (t.abstract) {
    kids.push(el('blockquote', { className: 'quote muted-quote', text: t.abstract }));
  }
  kids.push(
    el('div', { className: 'thought' }, [
      el('p', {
        className: 'thought-label',
        text: t.chapterName ? `想法 · ${t.chapterName}` : '想法 / 点评',
      }),
      el('p', { className: 'thought-body', text: t.content || '（无正文）' }),
      el('p', { className: 'note-meta', text: formatDate(t.createTime) }),
    ]),
  );
  return el('article', { className: 'note-card' }, kids);
}

export function renderBook(app: HTMLElement, bookId: string): void {
  const data = loadData();
  const book = data.books[bookId];
  if (!book) {
    const back = el('button', { className: 'btn', type: 'button', text: '返回书架' });
    back.addEventListener('click', () => navigate('/'));
    app.append(
      el('div', { className: 'card stack' }, [
        el('p', { text: '未找到这本书的缓存。' }),
        back,
      ]),
    );
    return;
  }

  const mode = el('div', { className: 'seg' }, [
    el('button', {
      className: 'seg-btn active',
      type: 'button',
      'data-mode': 'chapter',
      text: '按章节',
    }),
    el('button', {
      className: 'seg-btn',
      type: 'button',
      'data-mode': 'time',
      text: '按时间',
    }),
  ]);

  const listHost = el('div', { className: 'notes-host' });

  const renderList = (by: 'chapter' | 'time') => {
    listHost.replaceChildren();
    const highlights = [...book.highlights];
    const orphanThoughts = book.thoughts.filter((t) => {
      if (!t.range) return true;
      return !highlights.some((h) => h.range === t.range);
    });

    if (highlights.length === 0 && book.thoughts.length === 0) {
      listHost.append(
        el('div', { className: 'card empty' }, [
          el('p', { text: '这本书还没有同步到划线或想法。' }),
        ]),
      );
      return;
    }

    if (by === 'time') {
      highlights.sort((a, b) => b.createTime - a.createTime);
      for (const h of highlights) {
        listHost.append(renderHighlightCard(h, thoughtsForHighlight(book.thoughts, h)));
      }
      for (const t of orphanThoughts.sort((a, b) => b.createTime - a.createTime)) {
        listHost.append(renderThoughtCard(t));
      }
      return;
    }

    const groups = new Map<string, Highlight[]>();
    for (const h of highlights) {
      const key =
        h.chapterTitle || (h.chapterUid != null ? `章节 ${h.chapterUid}` : '未分章');
      const arr = groups.get(key) || [];
      arr.push(h);
      groups.set(key, arr);
    }
    for (const [title, items] of groups) {
      items.sort((a, b) => a.createTime - b.createTime);
      listHost.append(el('h3', { className: 'chapter-title', text: title }));
      for (const h of items) {
        listHost.append(renderHighlightCard(h, thoughtsForHighlight(book.thoughts, h)));
      }
    }
    if (orphanThoughts.length) {
      listHost.append(el('h3', { className: 'chapter-title', text: '想法 / 点评' }));
      for (const t of orphanThoughts.sort((a, b) => a.createTime - b.createTime)) {
        listHost.append(renderThoughtCard(t));
      }
    }
  };

  mode.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const m = (btn as HTMLElement).dataset.mode === 'time' ? 'time' : 'chapter';
      renderList(m);
    });
  });

  const back = el('button', {
    className: 'btn ghost sm',
    type: 'button',
    text: '← 书架',
  });
  back.addEventListener('click', () => navigate('/'));

  const cover = book.cover
    ? el('img', {
        className: 'cover lg',
        src: book.cover,
        alt: '',
        referrerpolicy: 'no-referrer',
      })
    : el('div', { className: 'cover lg placeholder', text: '书' });

  app.append(
    el('div', { className: 'top-actions' }, [back]),
    el('section', { className: 'book-hero card' }, [
      cover,
      el('div', { className: 'book-meta' }, [
        el('h1', { className: 'book-title', text: book.title }),
        el('p', { className: 'book-author', text: book.author }),
        el('p', {
          className: 'book-stats',
          text: `${book.highlights.length} 划线 · ${book.thoughts.length} 想法${
            book.notesSyncedAt ? ` · 同步于 ${formatDate(book.notesSyncedAt)}` : ''
          }`,
        }),
      ]),
    ]),
    mode,
    listHost,
  );

  renderList('chapter');
}
