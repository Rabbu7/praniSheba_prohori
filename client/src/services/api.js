import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const getLatestReading = async () => {
  const response = await api.get('/api/readings/latest');
  return response.data;
};

export const getReadingsHistory = async (range) => {
  const response = await api.get(`/api/readings/history?range=${range}`);
  return response.data;
};

export const getReadingsLog = async (page = 1, limit = 20) => {
  const response = await api.get(`/api/readings/log?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCalendarMonth = async (month) => {
  const response = await api.get(`/api/readings/calendar?month=${month}`);
  return response.data;
};

export const getDayDetail = async (date) => {
  const response = await api.get(`/api/readings/day/${date}`);
  return response.data;
};
