import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { formatChartDate } from '../../utils/dateFormatter';
import useThresholds from '../../hooks/useThresholds';

const METRICS = [
  { id: 'ammonia', label: 'Ammonia', key: 'ammonia_avg', defaultUnit: 'ppm' },
  { id: 'methane', label: 'Methane', key: 'methane_avg', defaultUnit: 'ppm' },
  { id: 'humidity', label: 'Humidity', key: 'humidity_avg', defaultUnit: '%' },
  { id: 'temperature', label: 'Temperature', key: 'temperature_avg', defaultUnit: '°F' },
];

function computeYDomain(metricKey, data, metricThresholds) {
  if (!metricThresholds || !Array.isArray(metricThresholds.bands)) {
    return ['auto', 'auto'];
  }

  const { bands } = metricThresholds;
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData
    .map((d) => (d ? d[metricKey] : undefined))
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));

  const dataMin = values.length > 0 ? Math.min(...values) : Infinity;

  const finiteEdges = [];
  bands.forEach((b) => {
    if (b.min !== null && b.min !== undefined) finiteEdges.push(b.min);
    if (b.max !== null && b.max !== undefined) finiteEdges.push(b.max);
  });

  if (finiteEdges.length === 0) return ['auto', 'auto'];

  const lowestFinite = Math.min(...finiteEdges);
  const highestFinite = Math.max(...finiteEdges);

  // Top danger edge
  const topDanger = bands.find((b) => b.zone === 'danger' && b.max === null);
  const cap = topDanger && topDanger.min !== null ? topDanger.min * 1.2 : highestFinite * 1.2;

  // Bottom danger edge (e.g. humidity < 40, temp < 25)
  const bottomDanger = bands.find((b) => b.zone === 'danger' && b.min === null);
  let standardLower = lowestFinite;
  if (bottomDanger && bottomDanger.max !== null) {
    standardLower = bottomDanger.max <= 30 ? 10 : 20;
  } else if (standardLower <= 10) {
    standardLower = 0;
  }

  const lower = Math.min(standardLower, dataMin === Infinity ? standardLower : dataMin);
  const upper = cap <= 50 ? Math.ceil(cap / 5) * 5 : Math.ceil(cap / 10) * 10;

  return [Math.floor(lower), upper];
}

export default function TrendChart({ data = [], loading = false, _range = '7d' }) {
  const [selectedMetric, setSelectedMetric] = useState('ammonia');
  const { thresholds } = useThresholds();

  const currentMetric = useMemo(
    () => METRICS.find((m) => m.id === selectedMetric) || METRICS[0],
    [selectedMetric]
  );

  const metricThresholds = thresholds?.[selectedMetric];
  const unit = metricThresholds?.unit || currentMetric.defaultUnit;
  const bands = metricThresholds?.bands || [];

  const yDomain = useMemo(
    () => computeYDomain(currentMetric.key, data, metricThresholds),
    [currentMetric.key, data, metricThresholds]
  );

  if (loading) {
    return (
      <div className="w-full h-[420px] flex items-center justify-center text-secondary font-medium">
        Loading chart…
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-[420px] flex items-center justify-center text-secondary font-medium">
        No data available for chart
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* Metric Selector & Zone Key */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Metric Selector Tabs */}
        <div className="flex gap-4">
          {METRICS.map((m) => {
            const isActive = m.id === selectedMetric;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMetric(m.id)}
                className={
                  isActive
                    ? 'font-body-sm text-body-sm font-medium text-primary border-b-2 border-primary pb-1 relative cursor-pointer'
                    : 'font-body-sm text-body-sm text-secondary hover:text-on-background pb-1 border-b-2 border-transparent transition-colors tab-underline cursor-pointer'
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Zone Key */}
        <div className="flex items-center gap-3 text-body-sm text-secondary font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-online" aria-hidden="true" />
            Safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-warning" aria-hidden="true" />
            Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-danger" aria-hidden="true" />
            Danger
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              stroke="var(--color-outline)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              allowDataOverflow
              stroke="var(--color-outline)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(label) => formatChartDate(label)}
              formatter={(value) => [
                `${typeof value === 'number' ? value : '—'}${unit ? ` ${unit}` : ''}`,
                currentMetric.label,
              ]}
              contentStyle={{
                backgroundColor: 'var(--color-surface-white)',
                borderColor: 'var(--color-border-subtle)',
                borderRadius: '8px',
                color: 'var(--color-on-background)',
              }}
            />

            {/* Threshold Bands */}
            {bands.map((band, idx) => {
              const y1 = band.min === null ? yDomain[0] : Math.max(band.min, yDomain[0]);
              const y2 = band.max === null ? yDomain[1] : Math.min(band.max, yDomain[1]);
              if (y1 >= y2) return null;

              const fill =
                band.zone === 'safe'
                  ? 'var(--color-status-online)'
                  : band.zone === 'warning'
                  ? 'var(--color-status-warning)'
                  : 'var(--color-status-danger)';

              return (
                <ReferenceArea
                  key={`${band.zone}-${idx}`}
                  y1={y1}
                  y2={y2}
                  fill={fill}
                  fillOpacity={0.15}
                  stroke="none"
                />
              );
            })}

            {/* Metric Trend Line */}
            <Line
              type="monotone"
              dataKey={currentMetric.key}
              name={unit ? `${currentMetric.label} (${unit})` : currentMetric.label}
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
