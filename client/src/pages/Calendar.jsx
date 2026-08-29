import React, { useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import CalendarGrid from '../components/calendar/CalendarGrid';
import DayDetailCards from '../components/calendar/DayDetailCards';
import useCalendarData from '../hooks/useCalendarData';
import useDayDetail from '../hooks/useDayDetail';

export default function Calendar() {
  // Default to current month in YYYY-MM format
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [selectedDate, setSelectedDate] = useState(null);

  const { days, loading: _calendarLoading, error: calendarError } = useCalendarData(month);
  const { detail, loading: detailLoading, error: detailError } = useDayDetail(selectedDate);

  const handleMonthChange = (newMonth) => {
    setMonth(newMonth);
    setSelectedDate(null); // Clear selection when navigating months
  };

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title="Calendar" />
        <div className="p-container-padding md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
          {calendarError ? (
            <div className="bg-surface-white border border-error/30 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="material-symbols-outlined text-error text-4xl mb-2">
                cloud_off
              </span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
                Unable to load calendar
              </h3>
              <p className="text-secondary text-body-sm">
                Please check backend connectivity. Retrying automatically...
              </p>
            </div>
          ) : (
            <>
              <CalendarGrid
                month={month}
                days={days}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onMonthChange={handleMonthChange}
              />
              <DayDetailCards
                date={selectedDate}
                detail={detail}
                loading={detailLoading}
                error={detailError}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}