import useLatestReading from './useLatestReading';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export default function useDeviceStatus() {
  const { data: reading, error } = useLatestReading();
  const isOnline = reading?.created_at
    ? Date.now() - new Date(reading.created_at).getTime() < ONLINE_THRESHOLD_MS
    : false;

  const status = isOnline ? 'online' : 'offline';
  const lastUpdated = reading?.created_at ? new Date(reading.created_at) : null;

  return { reading, status, lastUpdated, error };
}
