import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-950 shadow-sm lg:bottom-4 dark:border-amber-400/30 dark:bg-amber-950/90 dark:text-amber-100"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span>Offline Mode — Cached dictionary &amp; diagrams active</span>
    </div>
  );
};
