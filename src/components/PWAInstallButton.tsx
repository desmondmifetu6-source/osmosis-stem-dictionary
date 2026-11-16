import React, { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="inline-flex min-h-[38px] sm:min-h-[40px] items-center gap-1.5 rounded-xl border border-indigo-600/35 bg-indigo-600/15 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-indigo-900 transition-colors hover:bg-indigo-600/25 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="sm:hidden">Install</span>
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border-2 border-white/60 bg-white/95 p-5 pb-safe shadow-2xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="./assets/icon-192.png"
                  alt="Osmosis STEM Dictionary app icon"
                  className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-black/15"
                />
                <div className="min-w-0">
                  <h3 id="pwa-install-title" className="font-display text-base sm:text-lg font-bold text-slate-900">
                    Download Osmosis STEM Dictionary
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Offline PWA · 27,734 Terms &amp; 1,801 Diagrams
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close installation guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                    1
                  </span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-1 text-slate-900">Share <Share className="inline h-3.5 w-3.5" /></strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong> to install the dictionary app.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-600/20 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    Service Worker &amp; Web App Manifest are active. Once installed, all definitions, KaTeX equations, and viewed diagrams work offline.
                  </span>
                </div>
                {isInIframe ? (
                  <p className="text-xs leading-relaxed text-slate-600">
                    Browser security blocks PWA install prompts inside embedded frames. Open the app directly in its own browser tab to trigger the one-click install button.
                  </p>
                ) : (
                  <ol className="space-y-2 text-xs leading-relaxed text-slate-600">
                    <li>1. Look for the <strong>Install</strong> icon on the right side of your browser&apos;s address bar.</li>
                    <li>2. Or open the browser menu (<strong>⋮</strong>) and choose <strong>Install Osmosis STEM Dictionary</strong> / <strong>Add to Home screen</strong>.</li>
                  </ol>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              {isInIframe && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="osmosis-btn-indigo inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide"
                >
                  <span>Open Standalone Tab</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[46px] flex-1 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
