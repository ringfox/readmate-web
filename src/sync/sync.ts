import {
  fetchAllNotebooks,
  fetchBookmarks,
  fetchMyReviews,
  fetchShelf,
  validateKey,
  WereadError,
} from '../api/weread';
import { loadData, saveData, setApiKey } from '../store/storage';
import type { AppData, BookRecord, Highlight, SyncProgress, Thought } from '../store/types';

export type ProgressCb = (p: SyncProgress) => void;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function saveAndValidateKey(
  key: string,
  onProgress?: ProgressCb,
): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed.startsWith('wrk-')) {
    throw new WereadError('API Key 格式应为 wrk- 开头');
  }
  onProgress?.({ phase: 'validating', message: '正在验证 API Key…' });
  await validateKey(trimmed);
  setApiKey(trimmed);
  onProgress?.({ phase: 'done', message: 'API Key 有效' });
}

export async function fullSync(onProgress?: ProgressCb): Promise<AppData> {
  const data = loadData();

  onProgress?.({ phase: 'notebooks', message: '拉取有笔记的书…' });
  const notebooks = await fetchAllNotebooks((got, total) => {
    onProgress?.({
      phase: 'notebooks',
      message: `笔记本 ${got}${total != null ? ` / ${total}` : ''}…`,
      current: got,
      total,
    });
  });

  onProgress?.({ phase: 'shelf', message: '同步书架封面与作者…' });
  let shelfMap = new Map<string, Awaited<ReturnType<typeof fetchShelf>>[number]>();
  try {
    const shelf = await fetchShelf();
    shelfMap = new Map(shelf.map((b) => [b.bookId, b]));
  } catch {
    // 书架失败不阻断笔记同步
  }

  const now = Math.floor(Date.now() / 1000);
  const nextBooks: Record<string, BookRecord> = { ...data.books };

  for (const nb of notebooks) {
    const id = nb.bookId;
    const shelf = shelfMap.get(id);
    const prev = nextBooks[id];
    nextBooks[id] = {
      bookId: id,
      title: nb.book?.title || shelf?.title || prev?.title || '未知书名',
      author: nb.book?.author || shelf?.author || prev?.author || '未知作者',
      cover: nb.book?.cover || shelf?.cover || prev?.cover,
      category: nb.book?.category || shelf?.category || prev?.category,
      readerLink: shelf?.readerLink || prev?.readerLink,
      deepLink: shelf?.deepLink || prev?.deepLink,
      noteCount: nb.noteCount ?? prev?.noteCount ?? 0,
      reviewCount: nb.reviewCount ?? prev?.reviewCount ?? 0,
      bookmarkCount: nb.bookmarkCount ?? prev?.bookmarkCount ?? 0,
      readingProgress: nb.readingProgress ?? prev?.readingProgress,
      markedStatus: nb.markedStatus ?? prev?.markedStatus,
      sort: nb.sort ?? prev?.sort,
      finishReading: shelf?.finishReading ?? prev?.finishReading,
      readUpdateTime: shelf?.readUpdateTime ?? prev?.readUpdateTime,
      highlights: prev?.highlights ?? [],
      thoughts: prev?.thoughts ?? [],
      notesSyncedAt: prev?.notesSyncedAt,
    };
  }

  // 合并书架上没有笔记的书（可选：只展示有笔记的；这里保留有笔记为主，书架补信息）
  data.books = nextBooks;
  data.notebooksSyncedAt = now;
  data.shelfSyncedAt = now;
  saveData(data);

  const ids = notebooks.map((n) => n.bookId);
  const total = ids.length;
  let i = 0;
  for (const bookId of ids) {
    i += 1;
    const book = data.books[bookId];
    onProgress?.({
      phase: 'notes',
      message: `拉取划线与想法 ${i}/${total}：${book?.title ?? bookId}`,
      current: i,
      total,
    });
    try {
      const [{ updated, chapters }, reviews] = await Promise.all([
        fetchBookmarks(bookId),
        fetchMyReviews(bookId),
      ]);
      const chapterMap = new Map(
        chapters
          .filter((c) => c.chapterUid != null)
          .map((c) => [c.chapterUid as number, c.title || '']),
      );

      const highlights: Highlight[] = updated
        .filter((u) => u.markText)
        .map((u) => ({
          id: u.bookmarkId || `${bookId}-${u.range}-${u.createTime}`,
          bookId,
          chapterUid: u.chapterUid,
          chapterTitle:
            u.chapterUid != null ? chapterMap.get(u.chapterUid) : undefined,
          markText: u.markText || '',
          createTime: u.createTime || 0,
          range: u.range,
          colorStyle: u.colorStyle,
        }));

      const thoughts: Thought[] = reviews
        .map((r) => r.review)
        .filter((r): r is NonNullable<typeof r> => !!r && !!(r.content || r.abstract))
        .map((r) => ({
          id: r.reviewId || `${bookId}-r-${r.createTime}`,
          bookId,
          content: r.content || '',
          abstract: r.abstract,
          range: r.range,
          chapterUid: r.chapterUid,
          chapterIdx: r.chapterIdx,
          chapterName: r.chapterName,
          createTime: r.createTime || 0,
          star: r.star,
        }));

      data.books[bookId] = {
        ...data.books[bookId],
        highlights,
        thoughts,
        noteCount: highlights.length,
        reviewCount: thoughts.length,
        notesSyncedAt: Math.floor(Date.now() / 1000),
      };
      saveData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onProgress?.({
        phase: 'notes',
        message: `跳过《${book?.title ?? bookId}》：${msg}`,
        current: i,
        total,
      });
    }
    // 轻微限速，避免打爆网关
    await sleep(80);
  }

  data.lastFullSyncAt = Math.floor(Date.now() / 1000);
  saveData(data);
  onProgress?.({
    phase: 'done',
    message: `同步完成：${total} 本书`,
    current: total,
    total,
  });
  return data;
}
