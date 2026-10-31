import React from 'react';

export default function ManagerCard({ manager, district }) {
  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
        Your manager
      </h3>

      {manager ? (
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              Name
            </span>
            <p className="font-body-lg text-body-lg font-bold text-on-background mt-0.5">
              {manager.firstName} {manager.lastName}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              District
            </span>
            <p className="text-body-sm text-secondary mt-0.5">
              {district}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              Contact
            </span>
            <div className="mt-1">
              <a
                href={`tel:${manager.phone}`}
                className="inline-flex items-center gap-2 text-primary hover:text-primary-container font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
                <span>{manager.phone}</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-secondary text-body-sm py-2">
          <span className="material-symbols-outlined text-secondary text-2xl">person</span>
          <span>No manager assigned yet</span>
        </div>
      )}
    </div>
  );
}

