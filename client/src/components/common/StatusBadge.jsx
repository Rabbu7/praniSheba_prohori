import React from 'react';

export default function StatusBadge({ status = 'online' }) {
  const isOnline = status === 'online';

  if (isOnline) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-online mr-1.5 animate-glow-pulse"></span>
        Online
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-low text-secondary border border-border-subtle text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-status-offline mr-1.5"></span>
      Offline
    </span>
  );
}
