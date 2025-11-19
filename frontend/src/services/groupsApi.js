import api from './api';

export const getGroups = (params) => api.get('/v1/groups/', { params });
export const getGroupById = (id) => api.get(`/v1/groups/${id}`);
export const createGroup = (data) => api.post('/v1/groups/', data);
export const updateGroup = (id, data) => api.put(`/v1/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/v1/groups/${id}`);
export const uploadGroupCover = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/v1/groups/${id}/upload-cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getGroupMembers = (groupId, params) =>
  api.get(`/v1/groups/${groupId}/members`, { params });

export const addGroupMember = (groupId, memberId) =>
  api.post(`/v1/groups/${groupId}/members/add`, null, {
    params: { member_id: memberId },
  });

export const removeGroupMember = (groupId, memberId) =>
  api.post(`/v1/groups/${groupId}/members/remove`, null, {
    params: { member_id: memberId },
  });

export const getJoinRequests = (params) =>
  api.get('/v1/group-join-requests/', { params });

export const approveJoinRequest = (id) =>
  api.post(`/v1/group-join-requests/${id}/approve`);

export const rejectJoinRequest = (id) =>
  api.post(`/v1/group-join-requests/${id}/reject`);

export const getLeaveRequests = (params) =>
  api.get('/v1/group-leave-requests/', { params });

export const approveLeaveRequest = (membershipId) =>
  api.post(`/v1/group-leave-requests/${membershipId}/approve`);

// Public mobile APIs for join/leave requests (to be used by mobile app)
export const createJoinRequestPublic = (groupId, payload) =>
  api.post(`/public/groups/${groupId}/join-request`, payload);

export const createLeaveRequestPublic = (groupId, payload) =>
  api.post(`/public/groups/${groupId}/leave-request`, payload);
