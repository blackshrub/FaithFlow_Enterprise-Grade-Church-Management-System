/**
 * Communities API Service
 *
 * Replaces groupsApi.js - use this for all new community-related functionality.
 */
import api from './api';

// Community CRUD
export const getCommunities = (params) => api.get('/v1/communities/', { params });
export const getCommunityById = (id) => api.get(`/v1/communities/${id}`);
export const createCommunity = (data) => api.post('/v1/communities/', data);
export const updateCommunity = (id, data) => api.put(`/v1/communities/${id}`, data);
export const deleteCommunity = (id) => api.delete(`/v1/communities/${id}`);
export const uploadCommunityCover = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/v1/communities/${id}/upload-cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Community Members Management
export const getCommunityMembers = (communityId, params) =>
  api.get(`/v1/communities/${communityId}/members`, { params });

export const addCommunityMember = (communityId, memberId, role = 'member') =>
  api.post(`/v1/communities/${communityId}/members/add`, null, {
    params: { member_id: memberId, role },
  });

export const removeCommunityMember = (communityId, memberId) =>
  api.post(`/v1/communities/${communityId}/members/remove`, null, {
    params: { member_id: memberId },
  });

export const updateCommunityMemberRole = (communityId, memberId, role) =>
  api.post(`/v1/communities/${communityId}/members/${memberId}/role`, null, {
    params: { role },
  });

// Join Requests (Staff/Admin)
export const getJoinRequests = (params) =>
  api.get('/v1/communities/join-requests', { params });

export const approveJoinRequest = (id) =>
  api.post(`/v1/communities/join-requests/${id}/approve`);

export const rejectJoinRequest = (id) =>
  api.post(`/v1/communities/join-requests/${id}/reject`);

// Leave Requests (Staff/Admin)
export const getLeaveRequests = (params) =>
  api.get('/v1/communities/leave-requests', { params });

export const approveLeaveRequest = (membershipId) =>
  api.post(`/v1/communities/leave-requests/${membershipId}/approve`);

// Public APIs for Mobile App (member-authenticated)
export const createJoinRequestPublic = (communityId, payload) =>
  api.post(`/public/communities/${communityId}/join-request`, payload);

export const createLeaveRequestPublic = (communityId, payload) =>
  api.post(`/public/communities/${communityId}/leave-request`, payload);

export const getPublicCommunities = (churchId, params) =>
  api.get(`/public/communities/${churchId}`, { params });

export const getPublicCommunityById = (churchId, communityId) =>
  api.get(`/public/communities/${churchId}/${communityId}`);

export const getPublicCommunityMembers = (churchId, communityId, params) =>
  api.get(`/public/communities/${churchId}/${communityId}/members`, { params });

// =====================================================
// Legacy Aliases (for backward compatibility)
// These map old "group" function names to new "community" implementations
// =====================================================
export const getGroups = getCommunities;
export const getGroupById = getCommunityById;
export const createGroup = createCommunity;
export const updateGroup = updateCommunity;
export const deleteGroup = deleteCommunity;
export const uploadGroupCover = uploadCommunityCover;
export const getGroupMembers = getCommunityMembers;
export const addGroupMember = (groupId, memberId) => addCommunityMember(groupId, memberId, 'member');
export const removeGroupMember = removeCommunityMember;
