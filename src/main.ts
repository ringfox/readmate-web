import './style.css';
import { onRoute, startRouter, type Route } from './router';
import { clear } from './ui/dom';
import { getApiKey } from './store/storage';
import { renderOnboarding } from './pages/onboarding';
import { renderHome } from './pages/home';
import { renderBook } from './pages/book';
import { renderSearch } from './pages/search';
import { renderSettings } from './pages/settings';

const mount = document.querySelector('#app');
if (!(mount instanceof HTMLElement)) throw new Error('#app missing');
const app: HTMLElement = mount;

let token = 0;

function render(route: Route): void {
  const t = ++token;
  clear(app);
  app.classList.remove('fade-in');
  void app.offsetWidth;
  app.classList.add('fade-in');

  const hasKey = !!getApiKey();
  if (!hasKey && route.name !== 'onboarding' && route.name !== 'settings') {
    renderOnboarding(app);
  } else {
    switch (route.name) {
      case 'onboarding':
        renderOnboarding(app);
        break;
      case 'home':
        renderHome(app);
        break;
      case 'book':
        renderBook(app, route.bookId);
        break;
      case 'search':
        renderSearch(app, route.q || '');
        break;
      case 'settings':
        renderSettings(app);
        break;
    }
  }

  if (t !== token) return;

  document.title =
    route.name === 'book'
      ? `书籍 · Readmate`
      : route.name === 'search'
        ? `搜索 · Readmate`
        : route.name === 'settings'
          ? `设置 · Readmate`
          : route.name === 'onboarding'
            ? `连接 · Readmate`
            : `Readmate Web`;
  window.scrollTo(0, 0);
}

onRoute((r) => render(r));
startRouter();
