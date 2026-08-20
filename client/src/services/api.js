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
