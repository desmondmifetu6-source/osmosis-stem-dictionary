import React, { useState } from 'react';
import { Download, FolderArchive, Package, X } from 'lucide-react';

interface DevExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevExportModal: React.FC<DevExportModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState<'dist' | 'source' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleChunkedDownload = async (kind: 'dist' | 'source', filename: string) => {
    setDownloading(kind);
    setProgress(0);
    setStatusText(`Starting ${filename}...`);
    try {
      const blobs: Blob[] = [];
      const totalParts = 6;
      for (let i = 0; i < totalParts; i++) {
        setStatusText(`Downloading part ${i + 1} of ${totalParts}...`);
        const res = await fetch(`/export-files/${kind}.part${i}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        blobs.push(await res.blob());
        setProgress(Math.round(((i + 1) / totalParts) * 100));
      }
      setStatusText('Packaging ZIP in browser...');
      const fullBlob = new Blob(blobs, { type: 'application/zip' });
      const url = URL.createObjectURL(fullBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatusText(`Download started: ${filename}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download blocked';
      setStatusText(`Automatic ZIP assembly failed (${msg}). Use the 4 individual ZIP parts below.`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-export-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-2 border-white/70 bg-white/95 p-5 pb-safe shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600/15 text-[#4F46E5]">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="dev-export-title" className="font-display text-base sm:text-lg font-bold text-slate-900">
                Download Full Project Folder
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Split into &lt; 12 MB chunks so browser &amp; proxy never block it
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close download modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void handleChunkedDownload('dist', 'osmosis-stem-dictionary-dist.zip')}
            className="osmosis-btn-indigo flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left disabled:opacity-60"
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                Download Ready-to-Host Site (dist.zip · 67.6 MB)
              </span>
              <span className="block text-xs font-normal text-indigo-100">
                Unzip &amp; drag the dist/ folder into Netlify Drop or Cloudflare Pages
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void handleChunkedDownload('source', 'osmosis-stem-dictionary-source.zip')}
            className="osmosis-btn-green-gradient flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left disabled:opacity-60"
          >
            <Download className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                Download Full Source Code (source.zip · 67.6 MB)
              </span>
              <span className="block text-xs font-normal text-emerald-50">
                Complete src/, public/ (27,734 terms + 1,801 diagrams) &amp; config
              </span>
            </span>
          </button>
        </div>

        {(downloading !== null || statusText) && (
          <div className="mt-3 rounded-xl border border-indigo-600/20 bg-indigo-50/70 p-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
              <span>{statusText}</span>
              {downloading !== null && <span className="tabular-nums">{progress}%</span>}
            </div>
            {downloading !== null && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-slate-200 pt-3.5">
          <p className="text-xs font-bold text-slate-700">
            Direct Small ZIP Parts (if your browser blocks 68 MB downloads):
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href="/export-files/1-osmosis-source-core.zip"
              download="1-osmosis-source-core.zip"
              className="flex min-h-[42px] items-center justify-between rounded-xl border border-indigo-600/20 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
            >
              <span>1. Core App + 27k Terms</span>
              <span className="tabular-nums text-indigo-700">5.0 MB</span>
            </a>
            <a
              href="/export-files/2-osmosis-diagrams-part1.zip"
              download="2-osmosis-diagrams-part1.zip"
              className="flex min-h-[42px] items-center justify-between rounded-xl border border-indigo-600/20 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
            >
              <span>2. Diagrams Part 1</span>
              <span className="tabular-nums text-indigo-700">18.1 MB</span>
            </a>
            <a
              href="/export-files/3-osmosis-diagrams-part2.zip"
              download="3-osmosis-diagrams-part2.zip"
              className="flex min-h-[42px] items-center justify-between rounded-xl border border-indigo-600/20 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
            >
              <span>3. Diagrams Part 2</span>
              <span className="tabular-nums text-indigo-700">22.1 MB</span>
            </a>
            <a
              href="/export-files/4-osmosis-diagrams-part3.zip"
              download="4-osmosis-diagrams-part3.zip"
              className="flex min-h-[42px] items-center justify-between rounded-xl border border-indigo-600/20 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
            >
              <span>4. Diagrams Part 3</span>
              <span className="tabular-nums text-indigo-700">21.7 MB</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
