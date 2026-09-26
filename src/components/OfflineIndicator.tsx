import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-xl animate-fade-in border border-amber-500">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <span>Offline Mode — Speech recognition & local editor active. Cached data is ready.</span>
    </div>
  );
};
