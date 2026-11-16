import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  CheckCircle2,
  Copy,
  Download,
  History,
  Layers,
  RotateCw,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { RevisionBookmark } from '../types';
import { ScienceText } from './ScienceText';

interface RevisionDrawerProps {
  isOpen: boolean;
  bookmarks: RevisionBookmark[];
  recentViewed: Array<{ word: string; displayWord: string; subject: string; viewedAt: number }>;
  onClose: () => void;
  onPronounce: (word: string) => void;
  onSelectTerm: (word: string) => void;
  onRemoveBookmark: (word: string) => void;
  onReviewFlashcard: (word: string, mastered: boolean) => void;
}

const MASTERY_LABELS = ['New', 'Learning', 'Familiar', 'Mastered'];

export const RevisionDrawer: React.FC<RevisionDrawerProps> = ({
  isOpen,
  bookmarks,
  recentViewed,
  onClose,
  onPronounce,
  onSelectTerm,
  onRemoveBookmark,
  onReviewFlashcard,
}) => {
  const [tab, setTab] = useState<'list' | 'flashcards' | 'history'>('list');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const dueQueue = useMemo(() => {
    const now = Date.now();
    return [...bookmarks].sort((a, b) => {
      const aDue = a.nextReviewAt <= now ? 0 : 1;
      const bDue = b.nextReviewAt <= now ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return a.masteryLevel - b.masteryLevel;
    });
  }, [bookmarks]);

  if (!isOpen) return null;

  const activeFlashcard = dueQueue[cardIndex % Math.max(1, dueQueue.length)];

  const buildExportText = () => {
    const lines = [
      'OSMOSIS STEM DICTIONARY — MY EXAM REVISION SHEET',
      `Exported: ${new Date().toLocaleDateString()} · ${bookmarks.length} Terms`,
      '============================================================',
      '',
    ];
    bookmarks.forEach((b, idx) => {
      lines.push(`${idx + 1}. ${b.displayWord.toUpperCase()} [${b.subject}]`);
      if (b.synonyms.length > 0) lines.push(`   Synonyms: ${b.synonyms.join(', ')}`);
      lines.push(`   ${b.definition}`);
      lines.push('');
    });
    return lines.join('\n');
  };

  const handleCopyExport = async () => {
    if (bookmarks.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildExportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadExport = () => {
    if (bookmarks.length === 0) return;
    const blob = new Blob([buildExportText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osmosis-exam-revision-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/60 backdrop-blur-sm sm:items-stretch"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-drawer-title"
      onClick={onClose}
    >
      <aside
        className="flex h-[calc(100dvh-2.25rem)] w-full flex-col rounded-t-3xl border-t border-white/50 bg-white/95 shadow-2xl backdrop-blur-xl sm:h-full sm:max-w-lg sm:rounded-none sm:border-l sm:border-t-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-2">
            <h2 id="revision-drawer-title" className="font-serif-dict text-lg sm:text-xl font-bold text-[#4F46E5]">
              My Exam Revision
            </h2>
            <p className="truncate text-xs font-medium text-slate-500 tabular-nums">
              {bookmarks.length} bookmarked {bookmarks.length === 1 ? 'term' : 'terms'} · Spaced-repetition flashcards
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close My Revision drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 px-4 py-2.5 no-scrollbar sm:px-5">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
              tab === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved ({bookmarks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('flashcards');
              setFlipped(false);
            }}
            className={`inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
              tab === 'flashcards' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Flashcards</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
              tab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Recent ({recentViewed.length})</span>
          </button>
        </div>

        {tab === 'list' && bookmarks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-indigo-50/50 px-4 py-2.5 sm:px-5">
            <span className="text-xs font-semibold text-indigo-900">
              One-tap revision export
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyExport}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadExport}
                className="osmosis-btn-indigo inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export .txt</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-safe sm:p-5">
          {tab === 'list' && (
            <>
              {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
                  <Bookmark className="h-8 w-8 text-indigo-500" />
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                    No bookmarked terms yet
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Tap Bookmark on any definition card to build your exam revision deck and flashcards.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {bookmarks.map((item) => (
                    <li
                      key={item.word}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTerm(item.word);
                            onClose();
                          }}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                        >
                          <h3 className="font-serif-dict text-base sm:text-lg font-bold capitalize text-[#4F46E5] hover:underline break-words">
                            {item.displayWord}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {item.subject} · Mastery: {MASTERY_LABELS[item.masteryLevel] || 'New'}
                          </p>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onPronounce(item.displayWord)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-emerald-700 hover:bg-emerald-50"
                            aria-label={`Pronounce ${item.displayWord}`}
                            title="Pronounce"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveBookmark(item.word)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Remove ${item.displayWord} from revision`}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {item.definition}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'flashcards' && (
            <>
              {dueQueue.length === 0 || !activeFlashcard ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
                  <Layers className="h-8 w-8 text-indigo-500" />
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                    Add terms to study flashcards
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Bookmark terms across Science, Technology, and Mathematics to unlock spaced-repetition practice.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 tabular-nums">
                    <span>
                      Card {(cardIndex % dueQueue.length) + 1} of {dueQueue.length}
                    </span>
                    <span>
                      Level: {MASTERY_LABELS[activeFlashcard.masteryLevel] || 'New'}
                    </span>
                  </div>

                  <div
                    onClick={() => setFlipped((f) => !f)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setFlipped((f) => !f);
                      }
                    }}
                    className="min-h-[230px] sm:min-h-[260px] cursor-pointer rounded-2xl border-2 border-indigo-600/20 bg-indigo-50/40 p-4 sm:p-6 transition-colors hover:border-indigo-600/40 active:scale-[0.995]"
                  >
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-700">
                      <span>{flipped ? 'Definition' : activeFlashcard.subject}</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>Tap to flip</span>
                      </span>
                    </div>

                    {!flipped ? (
                      <div className="flex min-h-[175px] sm:min-h-[190px] flex-col items-center justify-center text-center">
                        <h3 className="font-serif-dict text-xl sm:text-2xl font-bold capitalize text-[#4F46E5] break-words">
                          {activeFlashcard.displayWord}
                        </h3>
                        {activeFlashcard.synonyms.length > 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            {activeFlashcard.synonyms.slice(0, 3).join(' · ')}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPronounce(activeFlashcard.displayWord);
                          }}
                          className="osmosis-btn-green-gradient mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide"
                        >
                          <Volume2 className="h-4 w-4" />
                          <span>Pronounce</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-800">
                        <ScienceText text={activeFlashcard.definition} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onReviewFlashcard(activeFlashcard.word, false);
                        setFlipped(false);
                        setCardIndex((i) => (i + 1) % dueQueue.length);
                      }}
                      className="min-h-[48px] rounded-xl border-2 border-amber-500/40 bg-amber-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-100"
                    >
                      Needs Review
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onReviewFlashcard(activeFlashcard.word, true);
                        setFlipped(false);
                        setCardIndex((i) => (i + 1) % dueQueue.length);
                      }}
                      className="osmosis-btn-green-gradient inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Got It</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {recentViewed.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
                  <History className="h-8 w-8 text-indigo-500" />
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                    No viewed terms yet
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Terms you search, pronounce, or quiz are cached here offline automatically.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentViewed.map((item) => (
                    <li key={item.word} className="flex items-center justify-between gap-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTerm(item.word);
                          onClose();
                        }}
                        className="min-w-0 flex-1 py-1 text-left"
                      >
                        <p className="truncate font-serif-dict text-base font-bold capitalize text-[#4F46E5] hover:underline">
                          {item.displayWord}
                        </p>
                        <p className="text-xs text-slate-500">{item.subject}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onPronounce(item.displayWord)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-emerald-700 hover:bg-emerald-50"
                        aria-label={`Pronounce ${item.displayWord}`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
