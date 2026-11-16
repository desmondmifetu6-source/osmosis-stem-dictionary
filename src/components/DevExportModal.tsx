import React, { useEffect, useState } from 'react';
import { Download, FolderArchive, Package, X } from 'lucide-react';

interface DevExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportManifest {
  source: { parts: string[]; sizeMB: number };
  dist: { parts: string[]; sizeMB: number };
  fallbacks: Array<{ file: string; label: string; sizeMB: number }>;
}

const DEFAULT_FALLBACKS = [
  { file: '1-osmosis-source-core.zip', label: '1. Core App + 27k Terms', sizeMB: 5.0 },
  { file: '2-osmosis-diagrams-part1.zip', label: '2. Diagrams Part 1', sizeMB: 10.7 },
  { file: '3-osmosis-diagrams-part2.zip', label: '3. Diagrams Part 2', sizeMB: 12.0 },
  { file: '4-osmosis-diagrams-part3.zip', label: '4. Diagrams Part 3', sizeMB: 14.6 },
];

export const DevExportModal: React.FC<DevExportModalProps> = ({ isOpen, onClose }) => {
  const [manifest, setManifest] = useState<ExportManifest | null>(null);
  const [downloading, setDownloading] = useState<'dist' | 'source' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    fetch('./export-files/manifest.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ExportManifest | null) => {
        if (data?.source && data?.dist) setManifest(data);
      })
      .catch(() => null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChunkedDownload = async (kind: 'dist' | 'source', filename: string) => {
    setDownloading(kind);
    setProgress(0);
    setStatusText(`Preparing ${filename}...`);
    try {
      let activeManifest = manifest;
      if (!activeManifest) {
        const mRes = await fetch('./export-files/manifest.json', { cache: 'no-store' });
        if (!mRes.ok) throw new Error(`HTTP ${mRes.status}`);
        activeManifest = (await mRes.json()) as ExportManifest;
        setManifest(activeManifest);
      }

      const parts = activeManifest[kind]?.parts || [];
      if (parts.length === 0) throw new Error('No archive parts found');

      const blobs: Blob[] = [];
      for (let i = 0; i < parts.length; i++) {
        setStatusText(`Downloading part ${i + 1} of ${parts.length}...`);
        const res = await fetch(`./export-files/${parts[i]}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} on ${parts[i]}`);
        }
        blobs.push(await res.blob());
        setProgress(Math.round(((i + 1) / parts.length) * 100));
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
      setStatusText(`Download complete: ${filename}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download blocked';
      setStatusText(`ZIP assembly failed (${msg}). Use the 4 individual ZIP parts below.`);
    } finally {
      setDownloading(null);
    }
  };

  const fallbacks = manifest?.fallbacks || DEFAULT_FALLBACKS;
  const sourceMB = manifest?.source?.sizeMB ?? 42.5;
  const distMB = manifest?.dist?.sizeMB ?? 42.5;

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
                Ready for GitHub + automated GitHub Pages deployment
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
            onClick={() => void handleChunkedDownload('source', 'osmosis-stem-dictionary-source.zip')}
            className="osmosis-btn-indigo flex min-h-[58px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left disabled:opacity-60"
          >
            <Download className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                1. Download Source Code for GitHub (source.zip · {sourceMB} MB)
              </span>
              <span className="block text-xs font-normal text-indigo-100">
                Includes src/, public/, package.json &amp; .github/workflows/deploy.yml
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void handleChunkedDownload('dist', 'osmosis-stem-dictionary-dist.zip')}
            className="osmosis-btn-green-gradient flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left disabled:opacity-60"
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                2. Download Pre-Built Site (dist.zip · {distMB} MB)
              </span>
              <span className="block text-xs font-normal text-emerald-50">
                Unzip &amp; drag dist/ straight onto Netlify Drop or Cloudflare Pages
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
          <p className="text-xs font-bold text-indigo-950">
            Git Patch for Your IDE (applies cleanly onto commit 0cd0266):
          </p>
          <div className="mt-2 space-y-2">
            <a
              href="./export-files/osmosis-full-update.patch"
              download="osmosis-full-update.patch"
              className="flex min-h-[44px] items-center justify-between rounded-xl border border-indigo-600/35 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-950 hover:bg-indigo-100"
            >
              <span>Full Git Patch (Code + 431 Diagrams)</span>
              <span className="tabular-nums text-indigo-700">24 MB</span>
            </a>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href="./export-files/osmosis-code-only.patch"
                download="osmosis-code-only.patch"
                className="flex min-h-[40px] items-center justify-between rounded-xl border border-indigo-600/20 bg-white px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-50"
              >
                <span>Code-Only Patch</span>
                <span className="tabular-nums text-indigo-700">67 KB</span>
              </a>
              <a
                href="./export-files/osmosis-missing-diagrams-431.zip"
                download="osmosis-missing-diagrams-431.zip"
                className="flex min-h-[40px] items-center justify-between rounded-xl border border-indigo-600/20 bg-white px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-50"
              >
                <span>431 Diagrams ZIP</span>
                <span className="tabular-nums text-indigo-700">18.1 MB</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3.5">
          <p className="text-xs font-bold text-slate-700">
            Or download the separate source ZIP parts directly (&lt; 15 MB each):
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fallbacks.map((fb) => (
              <a
                key={fb.file}
                href={`./export-files/${fb.file}`}
                download={fb.file}
                className="flex min-h-[42px] items-center justify-between rounded-xl border border-indigo-600/20 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
              >
                <span>{fb.label}</span>
                <span className="tabular-nums text-indigo-700">{fb.sizeMB} MB</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
