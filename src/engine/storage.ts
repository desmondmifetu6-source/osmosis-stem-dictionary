import { DictionaryEntry, RevisionBookmark } from '../types';

const BOOKMARKS_KEY = 'osmosis_dict_bookmarks_v1';
const SEARCH_HISTORY_KEY = 'osmosis_dict_search_history_v1';
const RECENT_VIEWED_KEY = 'osmosis_dict_recent_viewed_v1';
const THEME_KEY = 'osmosis_dict_theme';
const QUIZ_STATS_KEY = 'osmosis_dict_quiz_stats_v1';

const IDB_NAME = 'osmosis_stem_dictionary_db';
const IDB_VERSION = 1;
const IDB_STORE_VIEWED = 'viewed_entries';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_VIEWED)) {
          db.createObjectStore(IDB_STORE_VIEWED, { keyPath: 'word' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function cacheViewedEntry(entry: DictionaryEntry): Promise<void> {
  // Update fast localStorage MRU list (up to 40 terms)
  try {
    const raw = localStorage.getItem(RECENT_VIEWED_KEY);
    const list: Array<{ word: string; displayWord: string; subject: string; viewedAt: number }> = raw
      ? JSON.parse(raw)
      : [];
    const filtered = list.filter((item) => item.word.toLowerCase() !== entry.word.toLowerCase());
    filtered.unshift({
      word: entry.word,
      displayWord: entry.displayWord,
      subject: entry.subject,
      viewedAt: Date.now(),
    });
    localStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(filtered.slice(0, 40)));
  } catch {
    // ignore storage quota errors
  }

  // Persist full definition payload into IndexedDB for offline history inspection
  const db = await openDatabase();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE_VIEWED, 'readwrite');
    tx.objectStore(IDB_STORE_VIEWED).put({
      word: entry.word.toLowerCase(),
      displayWord: entry.displayWord,
      subject: entry.subject,
      definition: entry.definition,
      synonyms: entry.synonyms,
      diagramPath: entry.diagramPath,
      viewedAt: Date.now(),
    });
  } catch {
    // ignore
  }
}

export function getRecentViewed(): Array<{
  word: string;
  displayWord: string;
  subject: string;
  viewedAt: number;
}> {
  try {
    const raw = localStorage.getItem(RECENT_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadBookmarks(): RevisionBookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(bookmarks: RevisionBookmark[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}

export function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(term: string): string[] {
  const clean = term.trim();
  if (clean.length < 2) return loadSearchHistory();
  const prev = loadSearchHistory().filter((t) => t.toLowerCase() !== clean.toLowerCase());
  const next = [clean, ...prev].slice(0, 12);
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function getSavedTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export interface QuizStats {
  totalAnswered: number;
  totalCorrect: number;
  bestBlitzScore: number;
}

export function loadQuizStats(): QuizStats {
  try {
    const raw = localStorage.getItem(QUIZ_STATS_KEY);
    return raw ? JSON.parse(raw) : { totalAnswered: 0, totalCorrect: 0, bestBlitzScore: 0 };
  } catch {
    return { totalAnswered: 0, totalCorrect: 0, bestBlitzScore: 0 };
  }
}

export function recordQuizResult(correctCount: number, totalQuestions: number, isBlitz: boolean): QuizStats {
  const prev = loadQuizStats();
  const next: QuizStats = {
    totalAnswered: prev.totalAnswered + totalQuestions,
    totalCorrect: prev.totalCorrect + correctCount,
    bestBlitzScore: isBlitz ? Math.max(prev.bestBlitzScore, correctCount) : prev.bestBlitzScore,
  };
  try {
    localStorage.setItem(QUIZ_STATS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
