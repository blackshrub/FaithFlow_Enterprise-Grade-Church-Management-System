/**
 * Call API Service
 *
 * REST API client for voice/video calling functionality.
 * Handles communication with backend call routes.
 */

import { api } from '@/services/api';
import {
  CallResponse,
  CallHistoryResponse,
  ActiveCallInfo,
  CallStatsResponse,
  InitiateCallRequest,
  RejectCallRequest,
  EndCallRequest,
  UpdateParticipantRequest,
  CallType,
} from '@/types/call';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Initiate a new voice or video call
 */
async function initiateCall(request: InitiateCallRequest): Promise<CallResponse> {
  const response = await api.post<CallResponse>('/api/calls', request);
  return response.data;
}

/**
 * Accept an incoming call
 */
async function acceptCall(callId: string): Promise<CallResponse> {
  const response = await api.post<CallResponse>(`/api/calls/${callId}/accept`);
  return response.data;
}

/**
 * Reject an incoming call
 */
async function rejectCall(callId: string, request?: RejectCallRequest): Promise<void> {
  await api.post(`/api/calls/${callId}/reject`, request || { reason: 'rejected' });
}

/**
 * Cancel an outgoing call (before answer)
 */
async function cancelCall(callId: string): Promise<void> {
  await api.post(`/api/calls/${callId}/cancel`);
}

/**
 * End an active call
 */
async function endCall(callId: string, request?: EndCallRequest): Promise<void> {
  await api.post(`/api/calls/${callId}/end`, request || { reason: 'normal' });
}

/**
 * Mark call as connected (after WebRTC connection established)
 */
async function markConnected(callId: string): Promise<void> {
  await api.post(`/api/calls/${callId}/connected`);
}

/**
 * Update participant status (mute, video, speaker)
 */
async function updateParticipant(
  callId: string,
  request: UpdateParticipantRequest
): Promise<void> {
  await api.patch(`/api/calls/${callId}/participant`, request);
}

/**
 * Get active call for current user
 */
async function getActiveCall(): Promise<ActiveCallInfo | null> {
  const response = await api.get<ActiveCallInfo | null>('/api/calls/active');
  return response.data;
}

/**
 * Get call history
 */
async function getCallHistory(
  page: number = 1,
  pageSize: number = 20,
  callType?: CallType
): Promise<CallHistoryResponse> {
  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
  };

  if (callType) {
    params.call_type = callType;
  }

  const response = await api.get<CallHistoryResponse>('/api/calls/history', { params });
  return response.data;
}

/**
 * Get call statistics
 */
async function getCallStats(days: number = 30): Promise<CallStatsResponse> {
  const response = await api.get<CallStatsResponse>('/api/calls/stats', {
    params: { days },
  });
  return response.data;
}

// =============================================================================
// Export
// =============================================================================

export const callApi = {
  initiateCall,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
  markConnected,
  updateParticipant,
  getActiveCall,
  getCallHistory,
  getCallStats,
};
