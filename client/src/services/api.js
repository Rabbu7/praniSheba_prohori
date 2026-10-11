import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prohori_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = async ({ username, email, password }) => {
  const response = await api.post('/api/auth/register', { username, email, password });
  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const linkDevice = async ({ deviceId, deviceCode }) => {
  const response = await api.post('/api/auth/link-device', { deviceId, deviceCode });
  return response.data;
};

export const getLatestReading = async (deviceId) => {
  const params = deviceId ? { deviceId } : undefined;
  const response = await api.get('/api/readings/latest', { params });
  return response.data;
};

export const getReadingsHistory = async (range) => {
  const response = await api.get(`/api/readings/history?range=${range}`);
  return response.data;
};

export const getDailyAverages = async (range, deviceId) => {
  const params = { range, ...(deviceId ? { deviceId } : {}) };
  const response = await api.get('/api/readings/daily-averages', { params });
  return response.data;
};

export const getReadingsLog = async (page = 1, limit = 20, deviceId) => {
  const params = { page, limit, ...(deviceId ? { deviceId } : {}) };
  const response = await api.get('/api/readings/log', { params });
  return response.data;
};

export const getCalendarMonth = async (month, deviceId) => {
  const params = { month, ...(deviceId ? { deviceId } : {}) };
  const response = await api.get('/api/readings/calendar', { params });
  return response.data;
};

export const getDayDetail = async (date, deviceId) => {
  const params = deviceId ? { deviceId } : undefined;
  const response = await api.get(`/api/readings/day/${date}`, { params });
  return response.data;
};
