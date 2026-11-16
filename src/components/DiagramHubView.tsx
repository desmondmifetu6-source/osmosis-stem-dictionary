import React, { useMemo, useState } from 'react';
import { FlaskConical, Maximize2, Search, X } from 'lucide-react';
import { DiagramHubItem } from '../types';

interface DiagramHubViewProps {
  items: DiagramHubItem[];
  onOpenDiagramItem: (item: DiagramHubItem) => void;
}

const LETTERS = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export const DiagramHubView: React.FC<DiagramHubViewProps> = ({ items, onOpenDiagramItem }) => {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('ALL');
  const [limit, setLimit] = useState(36);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (letter !== 'ALL') {
        const matchesLetter =
          item.primaryTerm.toUpperCase().startsWith(letter) ||
          item.terms.some((t) => t.toUpperCase().startsWith(letter));
        if (!matchesLetter) return false;
      }
      if (!q) return true;
      return (
        item.primaryTerm.toLowerCase().includes(q) ||
        item.terms.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, letter, query]);

  const visible = filtered.slice(0, limit);

  return (
    <section className="dict-main-card rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-8 space-y-5 sm:space-y-6" aria-label="Scientific Diagram Hub">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="dict-page-title text-slate-900">
            Diagram Hub
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 tabular-nums">
            {filtered.length.toLocaleString()} curated apparatus, anatomical, circuit, and molecular schematics
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-600" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(36);
            }}
            placeholder="Filter diagrams (e.g. heart, circuit)"
            className="min-h-[46px] w-full rounded-xl border-2 border-black/15 bg-white/85 pl-10 pr-10 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700"
              aria-label="Clear diagram filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Filter diagrams by letter">
        {LETTERS.map((l) => {
          const active = letter === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLetter(l);
                setLimit(36);
              }}
              className={`min-h-[40px] min-w-[38px] rounded-lg px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/75 text-slate-700 border border-black/10 hover:bg-white'
              }`}
            >
              {l}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="dict-definition-box p-8 sm:p-10 text-center">
          <p className="font-display text-base font-bold text-slate-900">No diagrams match &quot;{query}&quot;</p>
          <p className="mt-1 text-sm text-slate-500">
            Try clearing the letter filter or searching for a broader scientific concept.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => {
            const broken = failedImages.has(item.image);
            return (
              <button
                key={item.image}
                type="button"
                onClick={() => onOpenDiagramItem(item)}
                className="group dict-definition-box flex flex-col overflow-hidden text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <div className="relative flex h-32 sm:h-44 w-full items-center justify-center bg-white p-2.5 sm:p-3">
                  {!broken ? (
                    <img
                      src={item.image}
                      alt={item.primaryTerm}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => new Set(prev).add(item.image))}
                      className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-indigo-800">
                      <FlaskConical className="h-7 w-7 opacity-75" />
                      <span className="text-xs font-medium capitalize text-center">{item.primaryTerm}</span>
                    </div>
                  )}
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/70 text-white opacity-85 group-hover:opacity-100">
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
                <div className="border-t border-black/10 p-2.5 sm:p-3.5">
                  <h3 className="font-serif-dict truncate text-xs sm:text-sm font-bold capitalize text-[#4F46E5]">
                    {item.primaryTerm}
                  </h3>
                  {item.terms.length > 1 && (
                    <p className="mt-0.5 truncate text-[11px] sm:text-xs text-slate-600">
                      +{item.terms.length - 1} related {item.terms.length - 1 === 1 ? 'term' : 'terms'}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setLimit((n) => n + 36)}
            className="osmosis-btn-indigo min-h-[46px] w-full sm:w-auto rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wide"
          >
            Load More Diagrams ({filtered.length - visible.length} remaining)
          </button>
        </div>
      )}
    </section>
  );
};
