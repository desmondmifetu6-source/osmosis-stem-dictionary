import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, FlaskConical, RotateCcw, Square, Volume2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { ScienceText } from './ScienceText';

interface DiagramModalProps {
  isOpen: boolean;
  title: string;
  imagePath: string;
  definition?: string;
  subject?: string;
  isSpeaking: boolean;
  onPronounce: (text: string) => void;
  onToggleReadMeaning: (text: string) => void;
  onClose: () => void;
}

export const DiagramModal: React.FC<DiagramModalProps> = ({
  isOpen,
  title,
  imagePath,
  definition,
  subject,
  isSpeaking,
  onPronounce,
  onToggleReadMeaning,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgError, setImgError] = useState(false);
  const pinchDistRef = useRef<number | null>(null);
  const pinchScaleRef = useRef<number>(1);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setImgError(false);
  }, [imagePath, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, +(s + 0.3).toFixed(2)));
      if (e.key === '-') setScale((s) => Math.max(0.6, +(s - 0.3).toFixed(2)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((s) => Math.min(4, +(s + 0.35).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, +(s - 0.35).toFixed(2)));
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    if (scale > 1.2) {
      handleReset();
    } else {
      setScale(2);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagram-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border-2 border-white/60 bg-white/95 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="diagram-modal-title" className="font-serif-dict truncate text-base font-bold capitalize text-[#4F46E5] sm:text-xl">
              {title}
            </h2>
            {subject && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">{subject}</p>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Zoom out diagram"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="hidden min-w-[44px] text-center text-xs font-bold tabular-nums text-slate-600 sm:inline">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Zoom in diagram"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Reset zoom"
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label="Close diagram modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive Pan / Pinch-to-Zoom Stage */}
        <div
          className="relative flex h-[40dvh] min-h-[230px] w-full cursor-grab touch-none items-center justify-center overflow-hidden bg-white select-none active:cursor-grabbing sm:h-[46vh]"
          onDoubleClick={handleDoubleTap}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            setScale((s) => Math.min(4, Math.max(0.6, +(s + delta).toFixed(2))));
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchDistRef.current = Math.hypot(dx, dy);
              pinchScaleRef.current = scale;
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchDistRef.current) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              const nextScale = pinchScaleRef.current * (dist / pinchDistRef.current);
              setScale(Math.min(4, Math.max(0.6, +nextScale.toFixed(2))));
            }
          }}
          onTouchEnd={() => {
            pinchDistRef.current = null;
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch' && !e.isPrimary) return;
            setDragging(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
          }}
          onPointerMove={(e) => {
            if (!dragging || pinchDistRef.current) return;
            setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          {!imgError ? (
            <img
              src={imagePath}
              alt={`Detailed scientific diagram of ${title}`}
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
              className="max-h-full max-w-full object-contain p-4 transition-transform duration-75"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <FlaskConical className="h-10 w-10 text-indigo-600" />
              <p className="text-sm font-medium">Diagram preview unavailable offline until viewed once</p>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-2.5 left-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white">
            Pinch, double-tap, or drag to inspect
          </div>
        </div>

        <div className="overflow-y-auto border-t border-slate-200 bg-slate-50/95 p-4 pb-safe sm:px-6">
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <button
              type="button"
              onClick={() => onPronounce(title)}
              className="osmosis-btn-green-gradient inline-flex min-h-[42px] items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide"
            >
              <Volume2 className="h-4 w-4" />
              <span>Pronounce</span>
            </button>
            {definition && (
              <button
                type="button"
                onClick={() => onToggleReadMeaning(definition)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border-[1.5px] border-indigo-600/35 bg-indigo-600/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-800"
              >
                {isSpeaking ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current text-rose-600" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>Read Aloud</span>
                  </>
                )}
              </button>
            )}
          </div>
          {definition && (
            <div className="text-sm leading-relaxed text-slate-800">
              <ScienceText text={definition} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
