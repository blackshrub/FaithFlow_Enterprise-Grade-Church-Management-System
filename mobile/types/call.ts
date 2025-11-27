/**
 * Call Types
 *
 * TypeScript types for voice/video calling functionality.
 * Mirrors backend models for type safety.
 */

// =============================================================================
// Enums
// =============================================================================

export enum CallType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum CallStatus {
  RINGING = 'ringing',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  ENDED = 'ended',
  MISSED = 'missed',
  REJECTED = 'rejected',
  FAILED = 'failed',
  BUSY = 'busy',
}

export enum CallEndReason {
  NORMAL = 'normal',
  MISSED = 'missed',
  REJECTED = 'rejected',
  BUSY = 'busy',
  FAILED = 'failed',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

export enum ParticipantRole {
  CALLER = 'caller',
  CALLEE = 'callee',
}

// =============================================================================
// Core Types
// =============================================================================

export interface CallParticipant {
  member_id: string;
  member_name: string;
  member_avatar?: string | null;
  role: ParticipantRole;
  joined_at?: string | null;
  left_at?: string | null;
  is_muted: boolean;
  is_video_enabled: boolean;
  is_speaker_on: boolean;
}

export interface CallResponse {
  call_id: string;
  room_name: string;
  livekit_token: string;
  livekit_url: string;
  call_type: CallType;
  participants: CallParticipant[];
}

export interface ActiveCallInfo {
  call_id: string;
  room_name: string;
  call_type: CallType;
  status: CallStatus;
  participants: CallParticipant[];
  started_at: string;
  duration_seconds: number;
}

export interface CallHistoryItem {
  call_id: string;
  call_type: CallType;
  status: CallStatus;
  caller_id: string;
  caller_name: string;
  caller_avatar?: string | null;
  callee_ids: string[];
  callee_names: string[];
  initiated_at: string;
  duration_seconds: number;
  end_reason?: CallEndReason | null;
  is_incoming: boolean;
}

export interface CallHistoryResponse {
  calls: CallHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface CallStatsResponse {
  total_calls: number;
  total_duration_seconds: number;
  voice_calls: number;
  video_calls: number;
  missed_calls: number;
  average_duration_seconds: number;
}

// =============================================================================
// Request Types
// =============================================================================

export interface InitiateCallRequest {
  callee_ids: string[];
  call_type: CallType;
  community_id?: string;
  subgroup_id?: string;
}

export interface RejectCallRequest {
  reason?: 'rejected' | 'busy';
}

export interface EndCallRequest {
  reason?: 'normal' | 'failed' | 'network_error';
}

export interface UpdateParticipantRequest {
  is_muted?: boolean;
  is_video_enabled?: boolean;
  is_speaker_on?: boolean;
}

// =============================================================================
// MQTT Signal Types
// =============================================================================

export enum CallSignalType {
  INVITE = 'call_invite',
  ACCEPT = 'call_accept',
  REJECT = 'call_reject',
  BUSY = 'call_busy',
  END = 'call_end',
  CANCEL = 'call_cancel',
  RINGING = 'call_ringing',
  CONNECTING = 'call_connecting',
  CONNECTED = 'call_connected',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  PARTICIPANT_MUTED = 'participant_muted',
  PARTICIPANT_VIDEO = 'participant_video',
  PARTICIPANT_SPEAKER = 'participant_speaker',
  NETWORK_QUALITY = 'network_quality',
}

export interface CallerInfo {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface CallInviteSignal {
  type: CallSignalType.INVITE;
  call_id: string;
  room_name: string;
  call_type: CallType;
  caller: CallerInfo;
  callee_ids: string[];
  community_id?: string | null;
  community_name?: string | null;
  livekit_url: string;
  timestamp: string;
}

export interface CallAcceptSignal {
  type: CallSignalType.ACCEPT;
  call_id: string;
  callee_id: string;
  callee_name: string;
  livekit_token: string;
  timestamp: string;
}

export interface CallRejectSignal {
  type: CallSignalType.REJECT | CallSignalType.BUSY;
  call_id: string;
  callee_id: string;
  callee_name: string;
  reason: string;
  timestamp: string;
}

export interface CallCancelSignal {
  type: CallSignalType.CANCEL;
  call_id: string;
  caller_id: string;
  timestamp: string;
}

export interface CallEndSignal {
  type: CallSignalType.END;
  call_id: string;
  ended_by: string;
  reason: string;
  duration_seconds: number;
  timestamp: string;
}

export interface CallRingingSignal {
  type: CallSignalType.RINGING;
  call_id: string;
  callee_id: string;
  callee_name: string;
  timestamp: string;
}

export interface ParticipantJoinedSignal {
  type: CallSignalType.PARTICIPANT_JOINED;
  call_id: string;
  participant: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  timestamp: string;
}

export interface ParticipantLeftSignal {
  type: CallSignalType.PARTICIPANT_LEFT;
  call_id: string;
  participant_id: string;
  participant_name: string;
  timestamp: string;
}

export interface ParticipantMutedSignal {
  type: CallSignalType.PARTICIPANT_MUTED;
  call_id: string;
  participant_id: string;
  is_muted: boolean;
  timestamp: string;
}

export interface ParticipantVideoSignal {
  type: CallSignalType.PARTICIPANT_VIDEO;
  call_id: string;
  participant_id: string;
  is_video_enabled: boolean;
  timestamp: string;
}

export interface ParticipantSpeakerSignal {
  type: CallSignalType.PARTICIPANT_SPEAKER;
  call_id: string;
  participant_id: string;
  is_speaker_on: boolean;
  timestamp: string;
}

export interface NetworkQualitySignal {
  type: CallSignalType.NETWORK_QUALITY;
  call_id: string;
  participant_id: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency_ms: number;
  packet_loss_percent: number;
  timestamp: string;
}

export type CallSignal =
  | CallInviteSignal
  | CallAcceptSignal
  | CallRejectSignal
  | CallCancelSignal
  | CallEndSignal
  | CallRingingSignal
  | ParticipantJoinedSignal
  | ParticipantLeftSignal
  | ParticipantMutedSignal
  | ParticipantVideoSignal
  | ParticipantSpeakerSignal
  | NetworkQualitySignal;

// =============================================================================
// UI State Types
// =============================================================================

export type CallUIState =
  | 'idle'
  | 'outgoing'      // Initiating call, waiting for answer
  | 'incoming'      // Receiving call invitation
  | 'connecting'    // Call accepted, establishing connection
  | 'active'        // Call in progress
  | 'reconnecting'  // Reconnecting after network issue
  | 'ended';        // Call ended

export interface CallDuration {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;  // "00:00" or "1:23:45"
}

export interface NetworkQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  latencyMs?: number;
  packetLossPercent?: number;
}

// =============================================================================
// LiveKit Types (for React Native SDK)
// =============================================================================

export interface LiveKitConfig {
  url: string;
  token: string;
  roomName: string;
}

export interface LocalParticipantState {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
}

export interface RemoteParticipantState {
  participantId: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  networkQuality: NetworkQuality;
}

// =============================================================================
// Call Store State Types
// =============================================================================

export interface CallStoreState {
  // Current call state
  uiState: CallUIState;
  currentCall: ActiveCallInfo | null;
  incomingCall: CallInviteSignal | null;

  // LiveKit connection
  livekitConfig: LiveKitConfig | null;
  isConnected: boolean;

  // Local participant
  localParticipant: LocalParticipantState;

  // Remote participants
  remoteParticipants: Map<string, RemoteParticipantState>;

  // Call timing
  callStartTime: Date | null;
  callDuration: CallDuration;

  // Network
  networkQuality: NetworkQuality;

  // Error handling
  error: string | null;
}

export interface CallStoreActions {
  // Call lifecycle
  initiateCall: (callee_ids: string[], call_type: CallType, community_id?: string) => Promise<void>;
  acceptCall: (call_id: string) => Promise<void>;
  rejectCall: (call_id: string, reason?: 'rejected' | 'busy') => Promise<void>;
  cancelCall: () => Promise<void>;
  endCall: (reason?: 'normal' | 'failed' | 'network_error') => Promise<void>;

  // Incoming call handling
  handleIncomingCall: (signal: CallInviteSignal) => void;
  handleCallCancelled: (signal: CallCancelSignal) => void;

  // Signal handling
  handleCallAccepted: (signal: CallAcceptSignal) => void;
  handleCallRejected: (signal: CallRejectSignal) => void;
  handleCallEnded: (signal: CallEndSignal) => void;
  handleParticipantJoined: (signal: ParticipantJoinedSignal) => void;
  handleParticipantLeft: (signal: ParticipantLeftSignal) => void;
  handleParticipantMuted: (signal: ParticipantMutedSignal) => void;
  handleParticipantVideo: (signal: ParticipantVideoSignal) => void;

  // Local controls
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;

  // Duration timer
  startDurationTimer: () => void;
  stopDurationTimer: () => void;

  // Reset
  reset: () => void;
}

export type CallStore = CallStoreState & CallStoreActions;
