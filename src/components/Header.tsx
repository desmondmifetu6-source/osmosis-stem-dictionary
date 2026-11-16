import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type AppView = 'lexicon' | 'diagrams';

interface HeaderProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenBlitz: () => void;
  onOpenRevision: () => void;
  bookmarkCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onChangeView,
  onOpenBlitz,
  onOpenRevision,
  bookmarkCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/65 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:gap-8">
        {/* Zone 1: Dictionary Picture App Icon + Responsive Wordmark */}
        <button
          type="button"
          onClick={() => onChangeView('lexicon')}
          className="flex min-w-0 items-center gap-2 text-left whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <img
            src="./assets/icon-192.png"
            alt="Osmosis STEM Dictionary app icon"
            className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/15 sm:h-9 sm:w-9 sm:rounded-xl"
          />
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 sm:text-lg">
            <span className="sm:hidden">Osmosis</span>
            <span className="hidden sm:inline">Osmosis STEM Dictionary</span>
          </span>
        </button>

        {/* Zone 2: Desktop Navigation */}
        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex" aria-label="Primary navigation">
          <button
            type="button"
            onClick={() => onChangeView('lexicon')}
            className={`min-h-[40px] border-b-2 px-1 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              activeView === 'lexicon'
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-700 hover:text-indigo-700'
            }`}
          >
            Dictionary
          </button>
          <button
            type="button"
            onClick={() => onChangeView('diagrams')}
            className={`min-h-[40px] border-b-2 px-1 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              activeView === 'diagrams'
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-700 hover:text-indigo-700'
            }`}
          >
            Diagrams
          </button>
          <button
            type="button"
            onClick={onOpenBlitz}
            className="min-h-[40px] border-b-2 border-transparent px-1 text-slate-700 transition-colors hover:text-indigo-700 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            5-Word Blitz
          </button>
          <button
            type="button"
            onClick={onOpenRevision}
            className="min-h-[40px] border-b-2 border-transparent px-1 text-slate-700 transition-colors hover:text-indigo-700 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            My Revision <span className="ml-1 tabular-nums text-indigo-700">({bookmarkCount})</span>
          </button>
        </nav>

        {/* Zone 3: Downloadable PWA Install + Bridge Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton />

          <a
            href="https://desmondmifetu6-source.github.io/Osmosis-Game/"
            target="_blank"
            rel="noopener noreferrer"
            className="osmosis-btn-blue-gradient inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 sm:min-h-[40px] sm:px-3.5 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span className="hidden sm:inline">Play in Osmosis Games</span>
            <span className="sm:hidden">Games</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
};
