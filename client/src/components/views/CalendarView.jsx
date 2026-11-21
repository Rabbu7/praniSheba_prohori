import React, { useEffect, useState } from 'react';
import useCalendarData from '../../hooks/useCalendarData';
import useDayDetail from '../../hooks/useDayDetail';
import CalendarGrid from '../calendar/CalendarGrid';
import DayDetailCards from '../calendar/DayDetailCards';
import ServerUnreachable from '../common/ServerUnreachable';
import { getDhakaToday } from '../../utils/dateFormatter';
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';

export default function CalendarView({ deviceId }) {
  const { translateError } = useLanguage();
  const [month, setMonth] = useState(() => {
    const today = getDhakaToday();
    return `${today.year}-${String(today.month).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(null);
  useEffect(() => setSelectedDate(null), [deviceId]);
  const { data, error } = useCalendarData(month, deviceId);
  const detail = useDayDetail(selectedDate, deviceId);
  if (error) {
    if (isServerUnreachable(error)) {
      return <ServerUnreachable />;
    }
    return (
      <div className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">
        {translateError(error, 'calendar.loadError')}
      </div>
    );
  }
  return <><CalendarGrid month={month} data={data} selectedDate={selectedDate} onDayClick={setSelectedDate} onMonthChange={(value) => { setMonth(value); setSelectedDate(null); }} /><DayDetailCards date={selectedDate} data={detail.data} loading={detail.loading} error={detail.error} /></>;
}
