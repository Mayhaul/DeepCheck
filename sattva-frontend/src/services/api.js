import axios from 'axios';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});
export const submitInvestigation = async (formData) =>
  (await api.post('/submissions', formData)).data;
export const startAnalysis = async (id) =>
  (await api.post(`/analyze/${id}`)).data;
export const getInvestigationStatus = async (id) =>
  (await api.get(`/investigation/${id}/status`)).data;
export const getReport = async (id) => (await api.get(`/report/${id}`)).data;
export const searchSources = async (query) =>
  (await api.get('/sources/search', { params: { query } })).data;
