import React from 'react';

export default function RequestStatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-online mr-1.5" />
        Approved
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-danger mr-1.5" />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-status-warning mr-1.5 animate-pulse" />
      Pending approval
    </span>
  );
}

