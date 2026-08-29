import React from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({
  month = '2026-08',
  days = [],
  selectedDate = null,
  onSelectDate = () => {},
  onMonthChange = () => {}
}) {
  const [year, monthStr] = month.split('-').map(Number);
  const firstDay = new Date(year, monthStr - 1, 1).getDay();
  const daysInMonth = new Date(year, monthStr, 0).getDate();

  // Parse month into a human-readable label
  const monthName = new Date(year, monthStr - 1).toLocaleString('default', { month: 'long' });

  // Create map of dates to day data for O(1) lookup
  const dayDataMap = {};
  days.forEach((dayObj) => {
    dayDataMap[dayObj.date] = dayObj;
  });

  // Navigate to prev/next month
  const handlePrevMonth = () => {
    const d = new Date(year, monthStr - 1);
    d.setMonth(d.getMonth() - 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const d = new Date(year, monthStr - 1);
    d.setMonth(d.getMonth() + 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const days_grid = [];

  // Padding for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days_grid.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthStr).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days_grid.push({ day, dateStr, data: dayDataMap[dateStr] });
  }

  return (
    <div className="bg-surface-white border border-[#D1D5DB] rounded-lg p-6 shadow-sm">
      {/* Header with nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-surface-container-low transition-colors text-secondary"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        <h2 className="font-headline-md text-headline-md font-bold text-on-background">
          {monthName} {year}
        </h2>

        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-surface-container-low transition-colors text-secondary"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center font-label-caps text-label-caps text-secondary uppercase tracking-wider py-2"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days_grid.map((dayObj, idx) => {
          if (!dayObj) {
            // Empty padding cell
            return <div key={`empty-${idx}`} className="h-12 rounded-md"></div>;
          }

          const { day, dateStr } = dayObj;
          const isSelected = selectedDate === dateStr;
          const isToday =
            new Date().toISOString().split('T')[0] ===
            new Date(year, monthStr - 1, day).toISOString().split('T')[0];

          return (
            <button
              key={dateStr}
              type="button"
              className={`h-12 rounded-md flex items-center justify-center font-body-sm transition-colors ${
                isSelected
                  ? 'bg-primary text-on-primary font-medium shadow-md'
                  : isToday
                  ? 'bg-surface-container-low border-2 border-primary text-on-background'
                  : 'bg-surface-container-low text-on-background hover:bg-surface-container hover:shadow-sm'
              }`}
              onClick={() => onSelectDate(dateStr)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
