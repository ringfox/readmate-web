import { el, highlightMatch } from '../ui/dom';
import { navigate } from '../router';
import { bookList, getApiKey, loadData } from '../store/storage';
import { renderChrome } from './shell';

interface Hit {
  kind: 'book' | 'highlight' | 'thought';
  bookId: string;
  title: string;
  author: string;
  snippet: string;
}

export function renderSearch(app: HTMLElement, initialQ = ''): void {
  if (!getApiKey()) {
    navigate('/onboarding');
    return;
  }

  const body = el('div', { className: 'stack' });
  const input = el('input', {
    className: 'input',
    type: 'search',
    placeholder: '搜书名、作者、划线…',
    value: initialQ,
  }) as HTMLInputElement;
  const results = el('div', { className: 'search-results' });

  const run = (qRaw: string) => {
    const q = qRaw.trim().toLowerCase();
    results.replaceChildren();
    if (!q) {
      results.append(
        el('p', { className: 'muted', text: '输入关键词，在本机缓存中搜索。' }),
      );
      return;
    }
    const hits: Hit[] = [];
    for (const b of bookList(loadData())) {
      if (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) {
        hits.push({
          kind: 'book',
          bookId: b.bookId,
          title: b.title,
          author: b.author,
          snippet: `${b.author} · ${b.highlights.length} 划线`,
        });
      }
      for (const h of b.highlights) {
        if (h.markText.toLowerCase().includes(q)) {
          hits.push({
            kind: 'highlight',
            bookId: b.bookId,
            title: b.title,
            author: b.author,
            snippet: h.markText,
          });
        }
      }
      for (const t of b.thoughts) {
        const blob = `${t.content || ''} ${t.abstract || ''}`.toLowerCase();
        if (blob.includes(q)) {
          hits.push({
            kind: 'thought',
            bookId: b.bookId,
            title: b.title,
            author: b.author,
            snippet: t.content || t.abstract || '',
          });
        }
      }
    }

    if (hits.length === 0) {
      results.append(el('p', { className: 'muted', text: '没有匹配结果。' }));
      return;
    }

    results.append(
      el('p', { className: 'muted small', text: `${hits.length} 条结果` }),
    );

    for (const hit of hits.slice(0, 200)) {
      const kindLabel =
        hit.kind === 'book' ? '书' : hit.kind === 'highlight' ? '划线' : '想法';
      const card = el('button', { className: 'search-card', type: 'button' });
      card.innerHTML = `
        <span class="chip">${kindLabel}</span>
        <strong>${highlightMatch(hit.title, qRaw)}</strong>
        <span class="muted small">${highlightMatch(hit.author, qRaw)}</span>
        <p class="snippet">${highlightMatch(hit.snippet, qRaw)}</p>
      `;
      card.addEventListener('click', () =>
        navigate(`/book/${encodeURIComponent(hit.bookId)}`),
      );
      results.append(card);
    }
  };

  input.addEventListener('input', () => {
    const q = input.value;
    const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
    history.replaceState(null, '', `#${url}`);
    run(q);
  });

  body.append(input, results);
  renderChrome(app, 'search', body);
  run(initialQ);
}
