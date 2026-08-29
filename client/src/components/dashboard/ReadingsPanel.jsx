import React, { useRef, useState, useEffect } from 'react';
import SensorCard from './SensorCard';

export default function ReadingsPanel({ reading = null, previousReading = null }) {
  const [changedMetrics, setChangedMetrics] = useState({
    ammonia: false,
    methane: false,
    humidity: false,
    temperature: false,
  });

  const prevValuesRef = useRef({
    ammonia: null,
    methane: null,
    humidity: null,
    temperature: null,
  });

  useEffect(() => {
    if (!reading) return;

    const newChanged = {
      ammonia: prevValuesRef.current.ammonia !== null && prevValuesRef.current.ammonia !== reading.ammonia,
      methane: prevValuesRef.current.methane !== null && prevValuesRef.current.methane !== reading.methane,
      humidity: prevValuesRef.current.humidity !== null && prevValuesRef.current.humidity !== reading.humidity,
      temperature: prevValuesRef.current.temperature !== null && prevValuesRef.current.temperature !== reading.temperature,
    };

    // Store latest values in ref
    prevValuesRef.current = {
      ammonia: reading.ammonia,
      methane: reading.methane,
      humidity: reading.humidity,
      temperature: reading.temperature,
    };

    if (newChanged.ammonia || newChanged.methane || newChanged.humidity || newChanged.temperature) {
      setChangedMetrics(newChanged);
      const timer = setTimeout(() => {
        setChangedMetrics({
          ammonia: false,
          methane: false,
          humidity: false,
          temperature: false,
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [reading]);

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      <SensorCard
        label="Ammonia (NH3)"
        value={reading?.ammonia ?? null}
        unit="ppm"
        zone={reading?.ammonia_zone ?? 'safe'}
        icon="science"
        changed={changedMetrics.ammonia}
      />
      <SensorCard
        label="Methane (CH4)"
        value={reading?.methane ?? null}
        unit="ppm"
        zone={reading?.methane_zone ?? 'safe'}
        icon="co2"
        changed={changedMetrics.methane}
      />
      <SensorCard
        label="Humidity"
        value={reading?.humidity ?? null}
        unit="%"
        zone={reading?.humidity_zone ?? 'safe'}
        icon="water_drop"
        changed={changedMetrics.humidity}
      />
      <SensorCard
        label="Temperature"
        value={reading?.temperature ?? null}
        unit="°F"
        zone={reading?.temperature_zone ?? 'safe'}
        icon="thermostat"
        changed={changedMetrics.temperature}
      />
    </div>
  );
}
