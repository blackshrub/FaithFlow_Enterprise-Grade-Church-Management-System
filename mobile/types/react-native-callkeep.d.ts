/**
 * Type declarations for react-native-callkeep
 *
 * This module is not installed (call feature is disabled).
 * These types are placeholders to satisfy TypeScript.
 */

declare module 'react-native-callkeep' {
  export interface IOptions {
    ios?: {
      appName?: string;
      supportsVideo?: boolean;
      maximumCallGroups?: string;
      maximumCallsPerCallGroup?: string;
      includesCallsInRecents?: boolean;
      ringtoneSound?: string;
    };
    android?: {
      alertTitle?: string;
      alertDescription?: string;
      cancelButton?: string;
      okButton?: string;
      additionalPermissions?: string[];
      imageName?: string;
      selfManaged?: boolean;
      foregroundService?: {
        channelId?: string;
        channelName?: string;
        notificationTitle?: string;
        notificationIcon?: string;
      };
    };
  }

  interface RNCallKeepType {
    setup: (options: IOptions) => Promise<boolean>;
    displayIncomingCall: (uuid: string, handle: string, localizedCallerName?: string, handleType?: string, hasVideo?: boolean) => void;
    startCall: (uuid: string, handle: string, contactIdentifier?: string, handleType?: string, hasVideo?: boolean) => void;
    endCall: (uuid: string) => void;
    endAllCalls: () => void;
    setCurrentCallActive: (uuid: string) => void;
    setMutedCall: (uuid: string, muted: boolean) => void;
    setOnHold: (uuid: string, onHold: boolean) => void;
    addEventListener: (type: string, handler: (...args: any[]) => void) => void;
    removeEventListener: (type: string) => void;
    isCallActive: (uuid: string) => Promise<boolean>;
    getCalls: () => Promise<any[]>;
    backToForeground: () => void;
    supportConnectionService: () => boolean;
    hasPhoneAccount: () => Promise<boolean>;
    hasOutgoingCall: () => Promise<boolean>;
    hasDefaultPhoneAccount: () => boolean;
    checkIfBusy: () => Promise<boolean>;
    checkSpeaker: () => Promise<boolean>;
    setAvailable: (state: boolean) => void;
    setReachable: () => void;
    reportConnectedOutgoingCallWithUUID: (uuid: string) => void;
    reportConnectingOutgoingCallWithUUID: (uuid: string) => void;
    reportEndCallWithUUID: (uuid: string, reason: number) => void;
    registerPhoneAccount: (options?: IOptions) => void;
    registerAndroidEvents: () => void;
    updateDisplay: (uuid: string, displayName: string, handle: string) => void;
  }

  const RNCallKeep: RNCallKeepType;
  export default RNCallKeep;
}
