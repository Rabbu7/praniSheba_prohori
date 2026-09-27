import React from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatMonthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

function moveMonth(month, offset) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDateKey(year, monthNumber, day) {
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarGrid({
  data = [],
  month,
  onMonthChange,
  onDayClick,
  selectedDate = null
}) {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const dayData = new Map(data.map((entry) => [entry.date, entry]));
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null;
    const day = index - firstDay + 1;
    const date = toDateKey(year, monthNumber, day);
    return { day, date, data: dayData.get(date) };
  });
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="bg-surface-white border border-border-subtle rounded-lg p-5 shadow-sm" aria-label="Calendar month view">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container-low hover:text-primary"
          onClick={() => onMonthChange(moveMonth(month, -1))}
          aria-label="Previous month"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="font-headline-md text-headline-md font-bold text-on-background">
          {formatMonthLabel(month)}
        </h2>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container-low hover:text-primary"
          onClick={() => onMonthChange(moveMonth(month, 1))}
          aria-label="Next month"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-2 text-center font-label-caps text-label-caps uppercase tracking-wider text-secondary">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`blank-${index}`} className="min-h-14 rounded-md" aria-hidden="true" />;
          }

          const hasData = Boolean(cell.data);
          const isSelected = selectedDate === cell.date;
          const isToday = todayKey === cell.date;
          const className = isSelected
            ? 'border-primary bg-primary font-semibold text-on-primary'
            : isToday
              ? 'border-primary bg-surface-container text-on-background'
              : hasData
                ? 'border-border-subtle bg-surface-white text-on-background hover:border-primary/50 hover:bg-surface-container-low'
                : 'border-border-subtle bg-surface-container-low/50 text-secondary/50';

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!hasData}
              className={`min-h-14 rounded-md border p-2 text-left text-sm transition-colors disabled:cursor-not-allowed ${className}`}
              onClick={() => onDayClick(cell.date)}
              aria-label={`${cell.date}${hasData ? '' : ' (no readings)'}`}
            >
              <span>{cell.day}</span>
              {hasData && <span className="mt-2 block text-[10px] uppercase tracking-wider opacity-60">Readings</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
