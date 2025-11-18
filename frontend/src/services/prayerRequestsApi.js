import api from './api';

const BASE_URL = '/v1/prayer-requests';

export const getPrayerRequests = (params = {}) => {
  return api.get(`${BASE_URL}/`, { params });
};

export const getPrayerRequestById = (id) => {
  return api.get(`${BASE_URL}/${id}`);
};

export const createPrayerRequest = (data) => {
  return api.post(`${BASE_URL}/`, data);
};

export const updatePrayerRequest = (id, data) => {
  return api.put(`${BASE_URL}/${id}`, data);
};

export const deletePrayerRequest = (id) => {
  return api.delete(`${BASE_URL}/${id}`);
};

export default {
  getPrayerRequests,
  getPrayerRequestById,
  createPrayerRequest,
  updatePrayerRequest,
  deletePrayerRequest
};
