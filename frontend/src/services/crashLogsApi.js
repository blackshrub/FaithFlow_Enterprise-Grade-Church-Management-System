import api from './api';

const BASE_URL = '/crash-logs';

export const getCrashLogs = (params = {}) => {
  return api.get(`${BASE_URL}`, { params });
};

export const getCrashLogById = (id) => {
  return api.get(`${BASE_URL}/${id}`);
};

export const getCrashLogStats = () => {
  return api.get(`${BASE_URL}/stats`);
};

export const updateCrashLog = (id, data) => {
  return api.patch(`${BASE_URL}/${id}`, data);
};

export const deleteCrashLog = (id) => {
  return api.delete(`${BASE_URL}/${id}`);
};

export default {
  getCrashLogs,
  getCrashLogById,
  getCrashLogStats,
  updateCrashLog,
  deleteCrashLog
};
