export interface Highlight {
  id: string;
  bookId: string;
  chapterUid?: number;
  chapterTitle?: string;
  markText: string;
  createTime: number;
  range?: string;
  colorStyle?: number;
}

export interface Thought {
  id: string;
  bookId: string;
  content: string;
  abstract?: string;
  range?: string;
  chapterUid?: number;
  chapterIdx?: number;
  chapterName?: string;
  createTime: number;
  star?: number;
}

export interface BookRecord {
  bookId: string;
  title: string;
  author: string;
  cover?: string;
  category?: string;
  readerLink?: string;
  deepLink?: string;
  noteCount: number;
  reviewCount: number;
  bookmarkCount: number;
  readingProgress?: number;
  markedStatus?: number;
  sort?: number;
  finishReading?: number;
  readUpdateTime?: number;
  highlights: Highlight[];
  thoughts: Thought[];
  notesSyncedAt?: number;
}

export interface AppData {
  version: 1;
  books: Record<string, BookRecord>;
  shelfSyncedAt?: number;
  notebooksSyncedAt?: number;
  lastFullSyncAt?: number;
}

export type SyncPhase =
  | 'idle'
  | 'validating'
  | 'notebooks'
  | 'shelf'
  | 'notes'
  | 'done'
  | 'error';

export interface SyncProgress {
  phase: SyncPhase;
  message: string;
  current?: number;
  total?: number;
}
