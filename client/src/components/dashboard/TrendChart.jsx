import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatChartTime } from '../../utils/dateFormatter';

export default function TrendChart({ data = [], loading = false, range = '7d' }) {
  if (loading) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-secondary font-medium">
        Loading chart…
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-secondary font-medium">
        No data available for chart
      </div>
    );
  }

  {/* TODO: threshold reference bands - future enhancement */}

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#F0F0EE" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="created_at"
            tickFormatter={(tick) => formatChartTime(tick, range)}
            stroke="#737685"
            fontSize={12}
            tickLine={false}
          />
          <YAxis stroke="#737685" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={(label) => formatChartTime(label, range)}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '8px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line
            type="monotone"
            dataKey="ammonia"
            name="Ammonia (ppm)"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="methane"
            name="Methane (ppm)"
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
