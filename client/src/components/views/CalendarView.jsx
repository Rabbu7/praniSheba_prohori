import React, { useEffect, useState } from 'react';
import useCalendarData from '../../hooks/useCalendarData';
import useDayDetail from '../../hooks/useDayDetail';
import CalendarGrid from '../calendar/CalendarGrid';
import DayDetailCards from '../calendar/DayDetailCards';
export default function CalendarView({ deviceId }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selectedDate, setSelectedDate] = useState(null);
  useEffect(() => setSelectedDate(null), [deviceId]);
  const { data, error } = useCalendarData(month, deviceId);
  const detail = useDayDetail(selectedDate, deviceId);
  if (error) return <div className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">Unable to load calendar</div>;
  return <><CalendarGrid month={month} data={data} selectedDate={selectedDate} onDayClick={setSelectedDate} onMonthChange={(value) => { setMonth(value); setSelectedDate(null); }} /><DayDetailCards date={selectedDate} data={detail.data} loading={detail.loading} error={detail.error} /></>;
}
