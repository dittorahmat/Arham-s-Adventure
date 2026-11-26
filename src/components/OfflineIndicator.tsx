import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="pointer-events-none fixed bottom-3 right-3 z-40 flex items-center gap-2 rounded-xl border-2 border-[#1e293b] bg-[#f59e0b] px-3 py-1.5 font-display text-xs font-bold text-[#0f172a] shadow-[0_3px_0_#1e293b]"
    >
      <span className="h-2.5 w-2.5 rounded-full border border-[#1e293b] bg-[#fef08a] animate-pulse" />
      <span>Mode Offline · Siap Dimainkan</span>
    </div>
  );
};
