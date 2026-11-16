import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Brain,
  Compass,
  Download,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import {
  DiagramHubItem,
  DictionaryEntry,
  RevisionBookmark,
  SUBJECT_FILTERS,
  SubjectCategory,
  SubjectCounts,
} from './types';
import {
  dictionaryService,
  playSound,
  speakText,
  stopSpeaking,
} from './engine/dictionaryService';
import {
  addSearchHistory,
  cacheViewedEntry,
  clearSearchHistory,
  getRecentViewed,
  loadBookmarks,
  loadQuizStats,
  loadSearchHistory,
  saveBookmarks,
} from './engine/storage';
import { AppView, Header } from './components/Header';
import { DefinitionCard } from './components/DefinitionCard';
import { DiagramModal } from './components/DiagramModal';
import { QuizModal } from './components/QuizModal';
import { RevisionDrawer } from './components/RevisionDrawer';
import { DiagramHubView } from './components/DiagramHubView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DevExportModal } from './components/DevExportModal';

const ALPHABET = ['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const PAGE_SIZE = 24;

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('lexicon');

  // Dictionary loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allEntries, setAllEntries] = useState<DictionaryEntry[]>([]);
  const [subjectCounts, setSubjectCounts] = useState<SubjectCounts>({
    All: 0,
    Biology: 0,
    Chemistry: 0,
    Physics: 0,
    'Agric Science': 0,
    'Computing / ICT': 0,
    Mathematics: 0,
    'General STEM': 0,
  });
  const [diagramHubItems, setDiagramHubItems] = useState<DiagramHubItem[]>([]);

  // Search & Filters
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<SubjectCategory>('All');
  const [letterFilter, setLetterFilter] = useState<string>('ALL');
  const [diagramOnly, setDiagramOnly] = useState(false);
  const [filteredIndices, setFilteredIndices] = useState<number[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [focusedEntry, setFocusedEntry] = useState<DictionaryEntry | null>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadSearchHistory());

  // Audio state
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [speechPaused, setSpeechPaused] = useState(false);

  // Persistence: Bookmarks & History
  const [bookmarks, setBookmarks] = useState<RevisionBookmark[]>(() => loadBookmarks());
  const [recentViewed, setRecentViewed] = useState(() => getRecentViewed());
  const [revisionOpen, setRevisionOpen] = useState(false);

  // Cover Lightbox state (cloned from dict_cover_lightbox.js)
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [devExportOpen, setDevExportOpen] = useState(false);

  // Diagram Modal
  const [diagramModal, setDiagramModal] = useState<{
    isOpen: boolean;
    title: string;
    imagePath: string;
    definition?: string;
    subject?: string;
  }>({ isOpen: false, title: '', imagePath: '' });

  // Quiz Modal
  const [quizModal, setQuizModal] = useState<{
    isOpen: boolean;
    mode: 'single' | 'blitz';
    entry: DictionaryEntry | null;
  }>({ isOpen: false, mode: 'single', entry: null });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxWrapRef = useRef<HTMLDivElement>(null);

  // Ensure strict light dictionary theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Bootstrap dictionary, Trie Web Worker, and URL shortcuts
  useEffect(() => {
    let cancelled = false;
    dictionaryService
      .init()
      .then(({ entries, counts }) => {
        if (cancelled) return;
        setAllEntries(entries);
        setSubjectCounts(counts);
        setDiagramHubItems(dictionaryService.getDiagramHubItems());

        const osmosis =
          entries.find((e) => e.word.toLowerCase() === 'osmosis') ||
          entries.find((e) => e.diagramPath !== null) ||
          entries[0] ||
          null;
        setFocusedEntry(osmosis);
        setLoading(false);

        const params = new URLSearchParams(window.location.search);
        const modeParam = params.get('mode');
        const focusParam = params.get('focus');
        if (modeParam === 'blitz') {
          setQuizModal({ isOpen: true, mode: 'blitz', entry: null });
        } else if (modeParam === 'revision') {
          setRevisionOpen(true);
        } else if (focusParam === 'search') {
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message || 'Unable to load the STEM dictionary dataset.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keyboard shortcuts ("/" focuses search, Escape closes lightbox)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && coverLightboxOpen) {
        setCoverLightboxOpen(false);
        return;
      }
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setActiveView('lexicon');
        searchInputRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (searchBoxWrapRef.current && !searchBoxWrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [coverLightboxOpen]);

  // Run Web Worker filter whenever query, subject, letter, or diagramOnly changes
  useEffect(() => {
    if (loading || allEntries.length === 0) return;
    let active = true;

    dictionaryService
      .filterEntries({
        query,
        subject: subjectFilter,
        letter: letterFilter,
        diagramOnly,
      })
      .then((indices) => {
        if (!active) return;
        setFilteredIndices(indices);
        setVisibleLimit(PAGE_SIZE);
      });

    return () => {
      active = false;
    };
  }, [loading, allEntries.length, query, subjectFilter, letterFilter, diagramOnly]);

  // Run zero-latency Trie autocomplete in Web Worker
  useEffect(() => {
    if (loading) return;
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setActiveSuggestionIdx(-1);
      return;
    }

    let active = true;
    dictionaryService.autocomplete(trimmed, subjectFilter, 8).then((items) => {
      if (!active) return;
      setSuggestions(items);
      setActiveSuggestionIdx(-1);
    });

    return () => {
      active = false;
    };
  }, [loading, query, subjectFilter]);

  const bookmarkedSet = useMemo(
    () => new Set(bookmarks.map((b) => b.word.toLowerCase())),
    [bookmarks]
  );

  const visibleEntries = useMemo(() => {
    const slice = filteredIndices.slice(0, visibleLimit);
    return slice.map((idx) => allEntries[idx]).filter(Boolean);
  }, [filteredIndices, visibleLimit, allEntries]);

  const featuredTerms = useMemo(() => {
    if (allEntries.length === 0) return [];
    const targets = ['osmosis', 'photosynthesis', 'mitosis', 'capacitor', 'algorithm', 'quadratic equation'];
    const found: DictionaryEntry[] = [];
    for (const t of targets) {
      const hit = allEntries.find((e) => e.word.toLowerCase() === t);
      if (hit) found.push(hit);
    }
    return found;
  }, [allEntries]);

  const selectEntry = useCallback((entry: DictionaryEntry) => {
    playSound('chip');
    setFocusedEntry(entry);
    setQuery(entry.word);
    setSubmittedQuery(entry.word);
    setShowDropdown(false);
    setActiveView('lexicon');
    setSearchHistory(addSearchHistory(entry.displayWord));
    void cacheViewedEntry(entry).then(() => {
      setRecentViewed(getRecentViewed());
    });
  }, []);

  const handlePerformSearch = useCallback(() => {
    const trimmed = query.trim();
    setShowDropdown(false);
    if (!trimmed) return;
    playSound('click');
    setSubmittedQuery(trimmed);
    setSearchHistory(addSearchHistory(trimmed));
    if (visibleEntries[0]) {
      setFocusedEntry(visibleEntries[0]);
      void cacheViewedEntry(visibleEntries[0]).then(() => setRecentViewed(getRecentViewed()));
      playSound('chip');
    } else {
      playSound('error');
    }
  }, [query, visibleEntries]);

  const handlePronounce = useCallback((entryOrWord: DictionaryEntry | string) => {
    const text = typeof entryOrWord === 'string' ? entryOrWord : entryOrWord.displayWord;
    if (typeof entryOrWord !== 'string') {
      void cacheViewedEntry(entryOrWord).then(() => setRecentViewed(getRecentViewed()));
    }
    setSpeakingWord(null);
    setSpeechPaused(false);
    speakText(text, { rate: 0.9 });
  }, []);

  const handleToggleReadMeaning = useCallback(
    (entry: DictionaryEntry) => {
      if (speakingWord === entry.word) {
        stopSpeaking();
        setSpeakingWord(null);
        setSpeechPaused(false);
        return;
      }
      void cacheViewedEntry(entry).then(() => setRecentViewed(getRecentViewed()));
      setSpeakingWord(entry.word);
      setSpeechPaused(false);
      speakText(`${entry.displayWord}. ${entry.definition}`, {
        rate: 0.95,
        onend: () => {
          setSpeakingWord(null);
          setSpeechPaused(false);
        },
        onerror: () => {
          setSpeakingWord(null);
          setSpeechPaused(false);
        },
      });
    },
    [speakingWord]
  );

  const handleTogglePauseSpeech = useCallback(() => {
    const vm = window.VoiceManager as unknown as { togglePause?: () => boolean } | undefined;
    if (vm?.togglePause) {
      const paused = vm.togglePause();
      setSpeechPaused(paused);
    }
  }, []);

  const handleToggleBookmark = useCallback((entry: DictionaryEntry) => {
    const key = entry.word.toLowerCase();
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.word.toLowerCase() === key);
      let next: RevisionBookmark[];
      if (exists) {
        playSound('click');
        next = prev.filter((b) => b.word.toLowerCase() !== key);
      } else {
        playSound('gem');
        const newItem: RevisionBookmark = {
          word: entry.word,
          displayWord: entry.displayWord,
          subject: entry.subject,
          definition: entry.definition,
          synonyms: entry.synonyms,
          diagramPath: entry.diagramPath,
          savedAt: Date.now(),
          reviewCount: 0,
          masteryLevel: 0,
          nextReviewAt: Date.now(),
        };
        next = [newItem, ...prev];
      }
      saveBookmarks(next);
      return next;
    });
  }, []);

  const handleReviewFlashcard = useCallback((word: string, mastered: boolean) => {
    playSound(mastered ? 'success' : 'chip');
    const now = Date.now();
    const intervals = [10 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000];
    setBookmarks((prev) => {
      const next = prev.map((item) => {
        if (item.word.toLowerCase() !== word.toLowerCase()) return item;
        const nextLevel = mastered ? Math.min(3, item.masteryLevel + 1) : 0;
        return {
          ...item,
          reviewCount: item.reviewCount + 1,
          masteryLevel: nextLevel,
          lastReviewedAt: now,
          nextReviewAt: now + intervals[nextLevel],
        };
      });
      saveBookmarks(next);
      return next;
    });
  }, []);

  const handleRemoveBookmark = useCallback((word: string) => {
    playSound('click');
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.word.toLowerCase() !== word.toLowerCase());
      saveBookmarks(next);
      return next;
    });
  }, []);

  const handleOpenDiagramForEntry = useCallback((entry: DictionaryEntry) => {
    if (!entry.diagramPath) return;
    playSound('click');
    void cacheViewedEntry(entry).then(() => setRecentViewed(getRecentViewed()));
    setDiagramModal({
      isOpen: true,
      title: entry.displayWord,
      imagePath: entry.diagramPath,
      definition: entry.definition,
      subject: entry.subject,
    });
  }, []);

  const handleOpenDiagramItem = useCallback(
    (item: DiagramHubItem) => {
      playSound('click');
      const matchedEntry = item.entryIdx !== null ? allEntries[item.entryIdx] : null;
      setDiagramModal({
        isOpen: true,
        title: matchedEntry ? matchedEntry.displayWord : item.primaryTerm,
        imagePath: item.image,
        definition: matchedEntry?.definition,
        subject: matchedEntry?.subject,
      });
    },
    [allEntries]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handlePerformSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target =
        activeSuggestionIdx >= 0 ? suggestions[activeSuggestionIdx] : suggestions[0];
      if (target) {
        selectEntry(target);
      } else {
        handlePerformSearch();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const getMatchBadge = (entry: DictionaryEntry) => {
    const q = query.trim().toLowerCase();
    if (!q) return { label: 'term', cls: 'bg-slate-900/10 text-slate-600 dark:bg-white/10 dark:text-slate-300' };
    if (entry.word.toLowerCase().startsWith(q)) {
      return { label: 'prefix', cls: 'bg-indigo-600/15 text-indigo-800 dark:bg-indigo-400/20 dark:text-indigo-200' };
    }
    if (entry.synonyms.some((s) => s.toLowerCase().includes(q))) {
      return { label: 'alias', cls: 'bg-purple-600/15 text-purple-800 dark:bg-purple-400/20 dark:text-purple-200' };
    }
    return { label: 'contains', cls: 'bg-slate-900/10 text-slate-600 dark:bg-white/10 dark:text-slate-300' };
  };

  const quizStats = useMemo(() => loadQuizStats(), [quizModal.isOpen]);

  return (
    <div className="relative min-h-screen min-w-0 overflow-x-hidden pb-24 lg:pb-12">
      {/* Exact Main App Cover Backdrop + Overlay */}
      <div className="dict-cover-bg" aria-hidden="true">
        <img src="./assets/stem_dictionary_cover.png" alt="" className="dict-cover-bg-img" />
      </div>
      <div className="dict-cover-overlay" aria-hidden="true" />

      <div className="relative z-10 min-w-0">
        <Header
          activeView={activeView}
          onChangeView={(v) => {
            playSound('click');
            setActiveView(v);
          }}
          onOpenBlitz={() => {
            playSound('click');
            setQuizModal({ isOpen: true, mode: 'blitz', entry: null });
          }}
          onOpenRevision={() => {
            playSound('click');
            setRevisionOpen(true);
          }}
          bookmarkCount={bookmarks.length}
        />

        <main className="mx-auto max-w-6xl px-2.5 pt-3 sm:px-6 sm:pt-7">
          {activeView === 'diagrams' ? (
            <DiagramHubView items={diagramHubItems} onOpenDiagramItem={handleOpenDiagramItem} />
          ) : (
            <div className="dict-main-card rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-8">
              {/* Cloned Dictionary Book Hero from module_library.html */}
              <div className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setCoverLightboxOpen(true);
                  }}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg"
                  title="Tap cover to enlarge"
                >
                  <img
                    src="./assets/stem_dictionary_cover.png"
                    alt="Science, Technology and Mathematics Dictionary cover"
                    className="dict-book-thumb"
                  />
                </button>
                <p className="mt-2.5 text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-400">
                  Tap cover to enlarge
                </p>

                <h1 className="dict-page-title mt-3 text-slate-900 dark:text-white">
                  Dictionary
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
                  Search the official Osmosis STEM dictionary for scientific definitions.
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                  <span className="dict-source-tag">
                    Science · Technology · Mathematics
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setQuizModal({ isOpen: true, mode: 'blitz', entry: null });
                    }}
                    className="osmosis-btn-gold inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Take a 5-Word Quiz</span>
                  </button>
                </div>
              </div>

              {/* Cloned Search Bar + Frosted Autocomplete Dropdown */}
              <section
                ref={searchBoxWrapRef}
                className="mx-auto mt-6 max-w-3xl"
                aria-label="Dictionary search and filters"
              >
                <div className="relative flex flex-row items-stretch gap-2 sm:gap-3">
                  <div className="relative flex-1 min-w-0">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setShowDropdown(true);
                        if (letterFilter !== 'ALL') setLetterFilter('ALL');
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search a STEM term..."
                      autoComplete="off"
                      aria-label="Search a word"
                      aria-expanded={showDropdown && suggestions.length > 0}
                      aria-autocomplete="list"
                      className="h-12 w-full rounded-xl border-2 border-black/20 bg-white/85 px-3.5 sm:px-4 pr-10 text-left text-base font-medium text-slate-900 placeholder:text-slate-500 focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setSubmittedQuery('');
                          setSuggestions([]);
                          setShowDropdown(false);
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Frosted Glass Autocomplete Dropdown matching module_library.html */}
                    {showDropdown && (suggestions.length > 0 || (!query.trim() && searchHistory.length > 0)) && (
                      <div
                        role="listbox"
                        className="osmosis-autocomplete-dropdown absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[50dvh] sm:max-h-80 overflow-y-auto overscroll-contain"
                      >
                        {query.trim() ? (
                          suggestions.map((item, idx) => {
                            const badge = getMatchBadge(item);
                            const isActive = idx === activeSuggestionIdx;
                            return (
                              <button
                                key={`${item.word}-${item.idx}`}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => selectEntry(item)}
                                className={`block min-h-[48px] w-full border-b border-indigo-600/10 border-l-[3px] px-3.5 sm:px-4 py-2.5 text-left transition-colors last:border-b-0 ${
                                  isActive
                                    ? 'border-l-[#4F46E5] bg-indigo-600/10'
                                    : 'border-l-transparent hover:border-l-[#4F46E5] hover:bg-indigo-600/8'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[13.5px] font-extrabold uppercase tracking-[0.04em] text-slate-900">
                                    {item.displayWord}
                                  </span>
                                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                </div>
                                <div className="mt-0.5 truncate text-[11.5px] font-medium text-slate-600">
                                  {item.definition}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3">
                            <div className="mb-2 flex items-center justify-between px-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Recent Searches
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  clearSearchHistory();
                                  setSearchHistory([]);
                                }}
                                className="min-h-[32px] px-1 text-xs font-semibold text-indigo-700 hover:underline"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {searchHistory.map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => {
                                    setQuery(h);
                                    setSubmittedQuery(h);
                                    setShowDropdown(false);
                                  }}
                                  className="min-h-[38px] rounded-lg border border-indigo-600/20 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handlePerformSearch}
                    className="osmosis-btn-indigo min-h-[48px] rounded-xl px-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider shrink-0 sm:px-7"
                  >
                    Search
                  </button>
                </div>

                {/* Subject Filter Pills + Diagram Filter */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:pb-0"
                    role="tablist"
                    aria-label="Filter by STEM subject"
                  >
                    {SUBJECT_FILTERS.map((subj) => {
                      const active = subjectFilter === subj;
                      const count = subjectCounts[subj] ?? 0;
                      return (
                        <button
                          key={subj}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            playSound('chip');
                            setSubjectFilter(subj);
                          }}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                            active
                              ? 'border-[#4F46E5] bg-[#4F46E5] text-white shadow-sm'
                              : 'border-black/15 bg-white/70 text-slate-800 hover:bg-white'
                          }`}
                        >
                          <span>{subj}</span>
                          {!loading && count > 0 && (
                            <span className={`tabular-nums text-[11px] ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                              ({count.toLocaleString()})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    aria-pressed={diagramOnly}
                    onClick={() => {
                      playSound('chip');
                      setDiagramOnly((d) => !d);
                    }}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 sm:self-auto ${
                      diagramOnly
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-black/15 bg-white/70 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>With Diagrams</span>
                  </button>
                </div>

                {/* A–Z Scrub Bar */}
                <div
                  className="mt-2.5 flex items-center gap-1 overflow-x-auto border-t border-black/10 pt-2.5 no-scrollbar"
                  role="tablist"
                  aria-label="Jump to starting letter"
                >
                  {ALPHABET.map((l) => {
                    const active = letterFilter === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setLetterFilter(l);
                          if (l !== 'ALL') {
                            setQuery('');
                            setSubmittedQuery('');
                          }
                        }}
                        className={`min-h-[38px] min-w-[36px] rounded-lg px-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-700 hover:bg-white/70 hover:text-indigo-800'
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Main Split Stage inside the Library Card */}
              <div className="mt-7">
                {loadError ? (
                  <div className="dict-definition-box p-8 text-center">
                    <p className="font-display text-lg font-bold text-rose-600 dark:text-rose-400">
                      Unable to Load Dictionary Engine
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
                  </div>
                ) : loading ? (
                  <div className="space-y-4">
                    {[1, 2].map((n) => (
                      <div key={n} className="dict-definition-box animate-pulse p-6 space-y-4">
                        <div className="h-7 w-52 rounded-lg bg-white/60 dark:bg-slate-800" />
                        <div className="flex gap-2">
                          <div className="h-10 w-28 rounded-full bg-white/60 dark:bg-slate-800" />
                          <div className="h-10 w-32 rounded-full bg-white/60 dark:bg-slate-800" />
                          <div className="h-10 w-28 rounded-full bg-white/60 dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 w-full rounded bg-white/60 dark:bg-slate-800" />
                          <div className="h-4 w-5/6 rounded bg-white/60 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_300px] lg:gap-6">
                    {/* Left Column: Definition Results or Exact Sketch Empty State */}
                    <div className="min-w-0 space-y-5">
                      {/* Mobile Study Strip (parity with desktop companion rail) */}
                      {featuredTerms.length > 0 && (
                        <div className="space-y-2.5 lg:hidden">
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white/55 px-3 py-2">
                            <div className="flex items-center gap-3 text-xs font-semibold tabular-nums text-slate-700">
                              <span>
                                Accuracy:{' '}
                                <strong className="text-slate-900">
                                  {quizStats.totalAnswered > 0
                                    ? `${Math.round((quizStats.totalCorrect / quizStats.totalAnswered) * 100)}%`
                                    : '0%'}
                                </strong>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Best Blitz: <strong className="text-[#4F46E5]">{quizStats.bestBlitzScore}/5</strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRevisionOpen(true)}
                              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-indigo-600/12 px-2.5 py-1 text-xs font-bold text-[#4F46E5]"
                            >
                              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Flashcards ({bookmarks.length})</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-600 pr-1">
                              Quick Jumps:
                            </span>
                            {featuredTerms.map((term) => (
                              <button
                                key={term.word}
                                type="button"
                                onClick={() => selectEntry(term)}
                                className="min-h-[36px] shrink-0 rounded-full border border-indigo-600/20 bg-white/75 px-3 py-1 text-xs font-bold capitalize text-[#4F46E5] hover:bg-white whitespace-nowrap"
                              >
                                {term.displayWord}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {focusedEntry && !query && letterFilter === 'ALL' && subjectFilter === 'All' && !diagramOnly && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                              Featured Definition
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const pool = allEntries.filter((e) => e.diagramPath !== null);
                                const pick =
                                  pool[Math.floor(Math.random() * pool.length)] ||
                                  allEntries[Math.floor(Math.random() * allEntries.length)];
                                if (pick) {
                                  playSound('warp');
                                  setFocusedEntry(pick);
                                }
                              }}
                              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-indigo-800 hover:bg-white/50 hover:underline"
                            >
                              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Random Illustrated Term</span>
                            </button>
                          </div>
                          <DefinitionCard
                            entry={focusedEntry}
                            featured
                            isBookmarked={bookmarkedSet.has(focusedEntry.word.toLowerCase())}
                            isReadingThis={speakingWord === focusedEntry.word}
                            isPaused={speechPaused}
                            onPronounce={handlePronounce}
                            onToggleReadMeaning={handleToggleReadMeaning}
                            onTogglePauseSpeech={handleTogglePauseSpeech}
                            onToggleBookmark={handleToggleBookmark}
                            onQuizMyself={(entry) => {
                              playSound('click');
                              setQuizModal({ isOpen: true, mode: 'single', entry });
                            }}
                            onOpenDiagram={handleOpenDiagramForEntry}
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                        <span>
                          Showing {visibleEntries.length.toLocaleString()} of{' '}
                          {filteredIndices.length.toLocaleString()} matching{' '}
                          {filteredIndices.length === 1 ? 'entry' : 'entries'}
                          {subjectFilter !== 'All' ? ` in ${subjectFilter}` : ''}
                          {letterFilter !== 'ALL' ? ` starting with "${letterFilter}"` : ''}
                        </span>
                        {(query || subjectFilter !== 'All' || letterFilter !== 'ALL' || diagramOnly) && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery('');
                              setSubmittedQuery('');
                              setSubjectFilter('All');
                              setLetterFilter('ALL');
                              setDiagramOnly(false);
                            }}
                            className="font-bold text-[#4F46E5] hover:underline dark:text-indigo-400"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>

                      {/* Exact Sketch Empty State from module_library.html */}
                      {visibleEntries.length === 0 ? (
                        <div
                          className="rounded-[20px] border-[1.5px] border-dashed border-slate-500/40 bg-white/75 px-6 py-8 text-center backdrop-blur-md dark:border-slate-600 dark:bg-slate-900/80"
                          role="status"
                          aria-live="polite"
                        >
                          <div className="mx-auto mb-4 h-24 w-24">
                            <svg className="sketch-float h-full w-full" viewBox="0 0 100 100" fill="none">
                              <rect x="20" y="15" width="60" height="70" rx="6" stroke="#64748b" strokeWidth="2.5" fill="#ffffff" />
                              <path d="M66 15 L80 29 L66 29 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
                              <line x1="28" y1="28" x2="56" y2="28" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                              <rect x="28" y="38" width="44" height="14" rx="4" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="3 3" fill="#f8fafc" />
                              <path d="M48 42 C48 40.5 49 39.5 50.5 39.5 C52 39.5 53 40.5 53 41.8 C53 43.5 50.5 44.2 50.5 46.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                              <circle cx="50.5" cy="49" r="1" fill="#ef4444" />
                              <line x1="28" y1="60" x2="72" y2="60" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                              <line x1="28" y1="68" x2="64" y2="68" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                              <line x1="28" y1="76" x2="52" y2="76" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </div>
                          <h3 className="font-display text-xl font-bold text-slate-800 dark:text-white">
                            No definition found
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            No STEM entry found for{' '}
                            <span className="font-bold text-[#4F46E5] dark:text-indigo-400">
                              "{submittedQuery || query || 'this filter'}"
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {visibleEntries.map((entry, idx) => {
                            const showReplacedNotice =
                              idx === 0 &&
                              query.trim().length >= 3 &&
                              entry.word.toLowerCase() !== query.trim().toLowerCase();
                            return (
                              <DefinitionCard
                                key={`${entry.idx}-${entry.word}`}
                                entry={entry}
                                replacedQuery={showReplacedNotice ? query.trim() : null}
                                isBookmarked={bookmarkedSet.has(entry.word.toLowerCase())}
                                isReadingThis={speakingWord === entry.word}
                                isPaused={speechPaused}
                                onPronounce={handlePronounce}
                                onToggleReadMeaning={handleToggleReadMeaning}
                                onTogglePauseSpeech={handleTogglePauseSpeech}
                                onToggleBookmark={handleToggleBookmark}
                                onQuizMyself={(e) => {
                                  playSound('click');
                                  setQuizModal({ isOpen: true, mode: 'single', entry: e });
                                }}
                                onOpenDiagram={handleOpenDiagramForEntry}
                              />
                            );
                          })}
                        </div>
                      )}

                      {visibleEntries.length < filteredIndices.length && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((n) => n + PAGE_SIZE)}
                            className="osmosis-btn-indigo min-h-[46px] w-full sm:w-auto rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
                          >
                            Load More Terms ({(filteredIndices.length - visibleEntries.length).toLocaleString()} remaining)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right Sidebar (Desktop Companion Rail) */}
                    <aside className="hidden space-y-4 lg:block" aria-label="Study companion panel">
                      <div className="dict-definition-box p-5">
                        <div className="flex items-center justify-between">
                          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                            My Exam Revision
                          </h2>
                          <span className="text-xs font-bold tabular-nums text-[#4F46E5] dark:text-indigo-400">
                            {bookmarks.length} saved
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          Bookmark definitions to practice spaced-repetition flashcards and export revision sheets offline.
                        </p>
                        <button
                          type="button"
                          onClick={() => setRevisionOpen(true)}
                          className="osmosis-btn-indigo mt-4 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide"
                        >
                          <Layers className="h-4 w-4" />
                          <span>Open Flashcards</span>
                        </button>
                      </div>

                      {featuredTerms.length > 0 && (
                        <div className="dict-definition-box p-5">
                          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                            Quick Curriculum Jumps
                          </h2>
                          <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
                            {featuredTerms.map((term) => (
                              <li key={term.word} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                                <button
                                  type="button"
                                  onClick={() => selectEntry(term)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="font-serif-dict truncate text-sm font-bold capitalize text-[#4F46E5] hover:underline dark:text-indigo-400">
                                    {term.displayWord}
                                  </p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    {term.subject}
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePronounce(term)}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                                  aria-label={`Pronounce ${term.displayWord}`}
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="dict-definition-box p-5">
                        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                          Recall Practice
                        </h2>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-950/50">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Accuracy</p>
                            <p className="mt-0.5 font-display text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                              {quizStats.totalAnswered > 0
                                ? `${Math.round((quizStats.totalCorrect / quizStats.totalAnswered) * 100)}%`
                                : '0%'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-950/50">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Best Blitz</p>
                            <p className="mt-0.5 font-display text-lg font-extrabold tabular-nums text-[#4F46E5] dark:text-indigo-400">
                              {quizStats.bestBlitzScore}/5
                            </p>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                )}
              </div>

              {/* Simple Copyright Footer matching module_library.html */}
              <p className="mt-8 text-center text-xs font-medium text-slate-700/80 dark:text-slate-400">
                &copy; {new Date().getFullYear()} Osmosis STEM Dictionary &mdash; NaCCA &amp; CSIR Endorsed Scientific Lexicon · Architected by Desmond Mifetu.
              </p>

              {import.meta.env.DEV && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDevExportOpen(true)}
                    className="osmosis-btn-indigo inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Download Full Project Folder (ZIP)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Thumb-Zone Navigation Bar (<= 56px) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/10 bg-white/90 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="grid h-14 grid-cols-4 items-center">
          <button
            type="button"
            onClick={() => {
              if (activeView === 'lexicon') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => searchInputRef.current?.focus(), 200);
              } else {
                setActiveView('lexicon');
              }
            }}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
              activeView === 'lexicon' ? 'text-[#4F46E5]' : 'text-slate-600'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Dictionary</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('diagrams');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
              activeView === 'diagrams' ? 'text-[#4F46E5]' : 'text-slate-600'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span>Diagrams</span>
          </button>
          <button
            type="button"
            onClick={() => setQuizModal({ isOpen: true, mode: 'blitz', entry: null })}
            className="flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-slate-600 hover:text-[#4F46E5]"
          >
            <Brain className="h-5 w-5" />
            <span>5-Word Quiz</span>
          </button>
          <button
            type="button"
            onClick={() => setRevisionOpen(true)}
            className="flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-slate-600 hover:text-[#4F46E5]"
          >
            <BookMarked className="h-5 w-5" />
            <span className="tabular-nums">Saved ({bookmarks.length})</span>
          </button>
        </div>
      </nav>

      {/* Cloned Book Cover Lightbox (from dict_cover_lightbox.js) */}
      {coverLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-5 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Dictionary cover preview"
          onClick={() => setCoverLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCoverLightboxOpen(false);
            }}
            className="absolute left-5 top-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-indigo-950/15 bg-white/85 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-[#1a237e] shadow-lg hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div className="flex w-full max-w-lg items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src="./assets/stem_dictionary_cover.png"
              alt="Science, Technology and Mathematics Dictionary cover enlarged"
              className="max-h-[80vh] w-full rounded-2xl object-contain shadow-2xl ring-4 ring-white/80"
            />
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <DiagramModal
        isOpen={diagramModal.isOpen}
        title={diagramModal.title}
        imagePath={diagramModal.imagePath}
        definition={diagramModal.definition}
        subject={diagramModal.subject}
        isSpeaking={speakingWord === diagramModal.title}
        onPronounce={(text) => handlePronounce(text)}
        onToggleReadMeaning={(def) => {
          if (speakingWord === diagramModal.title) {
            stopSpeaking();
            setSpeakingWord(null);
          } else {
            setSpeakingWord(diagramModal.title);
            speakText(`${diagramModal.title}. ${def}`, {
              rate: 0.92,
              onend: () => setSpeakingWord(null),
              onerror: () => setSpeakingWord(null),
            });
          }
        }}
        onClose={() => setDiagramModal((d) => ({ ...d, isOpen: false }))}
      />

      <QuizModal
        isOpen={quizModal.isOpen}
        mode={quizModal.mode}
        initialEntry={quizModal.entry}
        initialSubject={subjectFilter}
        allEntries={allEntries}
        bookmarkedWords={bookmarkedSet}
        onToggleBookmark={handleToggleBookmark}
        onClose={() => setQuizModal((q) => ({ ...q, isOpen: false }))}
      />

      <RevisionDrawer
        isOpen={revisionOpen}
        bookmarks={bookmarks}
        recentViewed={recentViewed}
        onClose={() => setRevisionOpen(false)}
        onPronounce={(word) => handlePronounce(word)}
        onSelectTerm={(word) => {
          const entry = dictionaryService.getEntryByWord(word);
          if (entry) {
            selectEntry(entry);
          } else {
            setQuery(word);
            setActiveView('lexicon');
          }
        }}
        onRemoveBookmark={handleRemoveBookmark}
        onReviewFlashcard={handleReviewFlashcard}
      />

      <OfflineIndicator />

      {import.meta.env.DEV && (
        <DevExportModal isOpen={devExportOpen} onClose={() => setDevExportOpen(false)} />
      )}
    </div>
  );
}
