import React, { useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Brain,
  FlaskConical,
  Maximize2,
  Pause,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { DictionaryEntry } from '../types';
import { ScienceText } from './ScienceText';

interface DefinitionCardProps {
  entry: DictionaryEntry;
  isBookmarked: boolean;
  isReadingThis: boolean;
  isPaused: boolean;
  replacedQuery?: string | null;
  onPronounce: (entry: DictionaryEntry) => void;
  onToggleReadMeaning: (entry: DictionaryEntry) => void;
  onTogglePauseSpeech: () => void;
  onToggleBookmark: (entry: DictionaryEntry) => void;
  onQuizMyself: (entry: DictionaryEntry) => void;
  onOpenDiagram: (entry: DictionaryEntry) => void;
  featured?: boolean;
}

export const DefinitionCard: React.FC<DefinitionCardProps> = ({
  entry,
  isBookmarked,
  isReadingThis,
  isPaused,
  replacedQuery,
  onPronounce,
  onToggleReadMeaning,
  onTogglePauseSpeech,
  onToggleBookmark,
  onQuizMyself,
  onOpenDiagram,
  featured = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const visibleSynonyms = entry.synonyms
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== entry.word.toLowerCase())
    .slice(0, 4);

  return (
    <article
      className={`dict-definition-box p-4 transition-colors sm:p-6 ${
        featured ? 'ring-2 ring-indigo-600/25' : ''
      }`}
    >
      {/* "Showing X instead of Y" notice banner */}
      {replacedQuery && (
        <div className="mb-3.5 rounded-xl border border-indigo-600/25 bg-indigo-600/10 px-3.5 py-2 text-xs font-medium text-indigo-900 sm:text-sm">
          Showing definition for <strong className="font-bold">"{entry.word}"</strong> instead of{' '}
          <em className="text-slate-600">"{replacedQuery}"</em>
        </div>
      )}

      {/* .dict-word (Playfair Display serif in #4F46E5) + .dict-phonetic */}
      <div className="border-b border-black/10 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-serif-dict text-xl font-bold capitalize tracking-tight text-[#4F46E5] sm:text-[1.9rem]">
            {entry.displayWord}
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 sm:text-xs">
            {entry.subject}
          </span>
        </div>

        <p className="mt-1 text-xs italic text-slate-600 sm:text-sm">
          Osmosis STEM Dictionary
          {visibleSynonyms.length > 0 && (
            <span> · Aliases: {visibleSynonyms.join(', ')}</span>
          )}
        </p>
      </div>

      {/* Mobile-first 2x2 Action Dock on phones, flexible pill row on sm+ */}
      <div className="my-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => onPronounce(entry)}
          className="osmosis-btn-green-gradient inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Pronounce</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleReadMeaning(entry)}
          aria-pressed={isReadingThis}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors whitespace-nowrap sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
            isReadingThis
              ? 'border-rose-500/45 bg-rose-500/15 text-rose-800 hover:bg-rose-500/25'
              : 'border-indigo-600/35 bg-indigo-600/15 text-indigo-800 hover:bg-indigo-600/25'
          }`}
        >
          {isReadingThis ? (
            <>
              <Square className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
              <span>Stop Audio</span>
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Read Aloud</span>
            </>
          )}
        </button>

        {isReadingThis && (
          <button
            type="button"
            onClick={onTogglePauseSpeech}
            className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border-[1.5px] border-amber-500/45 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-800 transition-colors hover:bg-amber-500/25 whitespace-nowrap sm:col-span-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
                <span>Resume Speech</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Pause Speech</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleBookmark(entry)}
          aria-pressed={isBookmarked}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors whitespace-nowrap sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            isBookmarked
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-900'
              : 'border-black/15 bg-white/70 text-slate-700 hover:bg-white'
          }`}
        >
          <Bookmark
            className={`h-4 w-4 shrink-0 ${isBookmarked ? 'fill-amber-500 text-amber-600' : ''}`}
            aria-hidden="true"
          />
          <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
        </button>

        <button
          type="button"
          onClick={() => onQuizMyself(entry)}
          className="osmosis-btn-indigo inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <Brain className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Quiz Myself</span>
        </button>
      </div>

      {/* .dict-meaning */}
      <div className="text-[15px] leading-[1.65] text-slate-900 sm:text-[1.04rem]">
        <ScienceText text={entry.definition} />
      </div>

      {/* #res-diagram-box */}
      {entry.diagramPath && (
        <div className="mt-4 rounded-2xl border border-black/10 bg-white/35 p-3 text-center sm:mt-5 sm:p-4">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[1px] text-slate-700 sm:mb-3 sm:text-xs">
            Diagram Schematic
          </div>
          <button
            type="button"
            onClick={() => onOpenDiagram(entry)}
            className="group relative inline-flex max-w-full flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl"
          >
            <div className="relative overflow-hidden rounded-xl bg-white p-2 shadow-md sm:shadow-lg">
              {!imgError ? (
                <img
                  src={entry.diagramPath}
                  alt={`${entry.displayWord} diagram illustration`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="max-h-60 max-w-full cursor-pointer object-contain transition-transform duration-200 group-hover:scale-[1.02] sm:max-h-72"
                />
              ) : (
                <div className="flex h-36 w-56 flex-col items-center justify-center gap-2 text-indigo-800">
                  <FlaskConical className="h-8 w-8 opacity-80" />
                  <span className="text-xs font-semibold">{entry.displayWord}</span>
                </div>
              )}
              <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/75 text-white opacity-90 group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-xs italic text-slate-600">
              Tap diagram to zoom &amp; inspect
            </p>
          </button>
        </div>
      )}
    </article>
  );
};
