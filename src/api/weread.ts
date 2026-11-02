import { getApiKey, getPreferProxy, getProxyUrl, setPreferProxy } from '../store/storage';

export const SKILL_VERSION = '1.0.5';
export const DIRECT_GATEWAY = 'https://i.weread.qq.com/api/agent/gateway';

export class WereadError extends Error {
  errcode?: number;
  constructor(message: string, errcode?: number) {
    super(message);
    this.name = 'WereadError';
    this.errcode = errcode;
  }
}

type GatewayBody = Record<string, unknown> & {
  api_name: string;
  skill_version?: string;
};

async function postOnce(
  url: string,
  apiKey: string,
  body: GatewayBody,
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ skill_version: SKILL_VERSION, ...body }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new WereadError(`响应不是 JSON（HTTP ${res.status}）`);
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'errmsg' in data
        ? String((data as { errmsg?: string }).errmsg)
        : `HTTP ${res.status}`;
    throw new WereadError(msg, res.status);
  }

  if (data && typeof data === 'object') {
    const obj = data as {
      errcode?: number;
      errmsg?: string;
      upgrade_info?: { message?: string };
    };
    if (obj.upgrade_info?.message) {
      throw new WereadError(
        `Skill 需要升级：${obj.upgrade_info.message}`,
        obj.errcode,
      );
    }
    if (typeof obj.errcode === 'number' && obj.errcode !== 0) {
      throw new WereadError(obj.errmsg || `错误码 ${obj.errcode}`, obj.errcode);
    }
  }

  return data;
}

function isCorsOrNetwork(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    err.name === 'TypeError' ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('cors') ||
    m.includes('load failed')
  );
}

/** 直连优先，失败则走代理；也可强制代理 */
export async function gateway<T = unknown>(
  body: GatewayBody,
  opts?: { apiKey?: string; forceProxy?: boolean },
): Promise<T> {
  const apiKey = opts?.apiKey ?? getApiKey();
  if (!apiKey) throw new WereadError('尚未配置 API Key');

  const proxyUrl = getProxyUrl();
  const force = opts?.forceProxy ?? getPreferProxy();

  if (force) {
    return (await postOnce(proxyUrl, apiKey, body)) as T;
  }

  try {
    const data = (await postOnce(DIRECT_GATEWAY, apiKey, body)) as T;
    return data;
  } catch (err) {
    if (!isCorsOrNetwork(err)) throw err;
    // 浏览器直连大概率被 CORS 拦：记一次偏好代理，后续少试错
    setPreferProxy(true);
    return (await postOnce(proxyUrl, apiKey, body)) as T;
  }
}

export async function validateKey(apiKey: string): Promise<{ bookCount: number }> {
  // 轻量校验：笔记本第一页
  const data = await gateway<{
    totalBookCount?: number;
    books?: unknown[];
  }>(
    { api_name: '/user/notebooks', count: 1 },
    { apiKey, forceProxy: getPreferProxy() || undefined },
  );
  return { bookCount: data.totalBookCount ?? data.books?.length ?? 0 };
}

export interface NotebookItem {
  bookId: string;
  book?: {
    bookId?: string;
    title?: string;
    author?: string;
    cover?: string;
    category?: string;
  };
  reviewCount?: number;
  noteCount?: number;
  bookmarkCount?: number;
  readingProgress?: number;
  markedStatus?: number;
  sort?: number;
}

export async function fetchAllNotebooks(
  onPage?: (got: number, total?: number) => void,
): Promise<NotebookItem[]> {
  const all: NotebookItem[] = [];
  let lastSort: number | undefined;
  let guard = 0;
  let total: number | undefined;

  while (guard++ < 200) {
    const body: GatewayBody = { api_name: '/user/notebooks', count: 100 };
    if (lastSort != null) body.lastSort = lastSort;
    const page = await gateway<{
      books?: NotebookItem[];
      hasMore?: number;
      totalBookCount?: number;
    }>(body);
    const books = page.books ?? [];
    total = page.totalBookCount ?? total;
    all.push(...books);
    onPage?.(all.length, total);
    if (!page.hasMore || books.length === 0) break;
    const sort = books[books.length - 1]?.sort;
    if (sort == null) break;
    lastSort = sort;
  }
  return all;
}

export interface ShelfBook {
  bookId: string;
  title?: string;
  author?: string;
  cover?: string;
  category?: string;
  readerLink?: string;
  deepLink?: string;
  readUpdateTime?: number;
  finishReading?: number;
  isTop?: number;
}

export async function fetchShelf(): Promise<ShelfBook[]> {
  const data = await gateway<{ books?: ShelfBook[] }>({ api_name: '/shelf/sync' });
  return data.books ?? [];
}

export interface BookmarkRaw {
  bookmarkId?: string;
  bookId?: string;
  chapterUid?: number;
  markText?: string;
  createTime?: number;
  range?: string;
  colorStyle?: number;
  type?: number;
}

export interface ChapterInfo {
  chapterUid?: number;
  chapterIdx?: number;
  title?: string;
}

export async function fetchBookmarks(bookId: string): Promise<{
  updated: BookmarkRaw[];
  chapters: ChapterInfo[];
}> {
  const data = await gateway<{
    updated?: BookmarkRaw[];
    chapters?: ChapterInfo[];
  }>({ api_name: '/book/bookmarklist', bookId });
  return { updated: data.updated ?? [], chapters: data.chapters ?? [] };
}

export interface ReviewRaw {
  review?: {
    reviewId?: string;
    content?: string;
    abstract?: string;
    range?: string;
    chapterUid?: number;
    chapterIdx?: number;
    chapterName?: string;
    createTime?: number;
    star?: number;
  };
}

export async function fetchMyReviews(bookId: string): Promise<ReviewRaw[]> {
  const all: ReviewRaw[] = [];
  let synckey = 0;
  let guard = 0;
  while (guard++ < 100) {
    const page = await gateway<{
      reviews?: ReviewRaw[];
      hasMore?: number;
      synckey?: number;
    }>({
      api_name: '/review/list/mine',
      bookid: bookId,
      synckey,
      count: 50,
    });
    const reviews = page.reviews ?? [];
    all.push(...reviews);
    if (!page.hasMore || reviews.length === 0) break;
    synckey = page.synckey ?? synckey;
    if (!page.synckey) break;
  }
  return all;
}
