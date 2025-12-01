/**
 * LocationSharing Component
 *
 * WhatsApp-style location sharing features:
 * - Share current location
 * - Live location sharing (15min, 1h, 8h)
 * - Location preview in messages
 * - Open in maps app
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  MapPin,
  Navigation,
  Clock,
  ExternalLink,
  RefreshCw,
  StopCircle,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export type LiveLocationDuration = '15m' | '1h' | '8h';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  timestamp?: number;
}

export interface LiveLocationData extends LocationData {
  duration: LiveLocationDuration;
  expiresAt: string;
  isActive: boolean;
}

interface LocationSharerProps {
  visible: boolean;
  onClose: () => void;
  onShareLocation: (location: LocationData) => void;
  onShareLiveLocation: (location: LiveLocationData) => void;
}

interface LocationPreviewProps {
  location: LocationData | LiveLocationData;
  isOwnMessage?: boolean;
  onPress?: () => void;
  onStopLiveLocation?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LIVE_DURATION_OPTIONS: Array<{
  value: LiveLocationDuration;
  label: string;
  ms: number;
}> = [
  { value: '15m', label: '15 minutes', ms: 15 * 60 * 1000 },
  { value: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { value: '8h', label: '8 hours', ms: 8 * 60 * 60 * 1000 },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function openInMaps(location: LocationData): void {
  const { latitude, longitude, name } = location;
  const label = encodeURIComponent(name || 'Shared Location');

  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
    android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });

  Linking.openURL(url).catch(() => {
    // Fallback to Google Maps web
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    );
  });
}

export function formatLiveLocationRemaining(expiresAt: string): string {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const remaining = expiry - now;

  if (remaining <= 0) return 'Ended';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

function isLiveLocation(
  location: LocationData | LiveLocationData
): location is LiveLocationData {
  return 'duration' in location && 'expiresAt' in location;
}

// =============================================================================
// LOCATION SHARER SHEET
// =============================================================================

export function LocationSharer({
  visible,
  onClose,
  onShareLocation,
  onShareLiveLocation,
}: LocationSharerProps) {
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedLiveDuration, setSelectedLiveDuration] =
    useState<LiveLocationDuration | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Request permission and get location when sheet opens
  useEffect(() => {
    if (!visible) return;

    const getLocationPermission = async () => {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          // Try to get address
          let address = '';
          try {
            const [geocoded] = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            if (geocoded) {
              address = [geocoded.street, geocoded.city, geocoded.country]
                .filter(Boolean)
                .join(', ');
            }
          } catch {
            // Ignore geocoding errors
          }

          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address,
            timestamp: location.timestamp,
          });
        } catch (error) {
          console.error('Failed to get location:', error);
          Alert.alert('Error', 'Failed to get your location. Please try again.');
        }
      }

      setLoading(false);
    };

    getLocationPermission();
  }, [visible]);

  const handleShareCurrentLocation = useCallback(() => {
    if (!currentLocation) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShareLocation(currentLocation);
    onClose();
  }, [currentLocation, onShareLocation, onClose]);

  const handleShareLiveLocation = useCallback(
    (duration: LiveLocationDuration) => {
      if (!currentLocation) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const durationMs =
        LIVE_DURATION_OPTIONS.find((d) => d.value === duration)?.ms || 0;

      const liveLocation: LiveLocationData = {
        ...currentLocation,
        duration,
        expiresAt: new Date(Date.now() + durationMs).toISOString(),
        isActive: true,
      };

      onShareLiveLocation(liveLocation);
      onClose();
    },
    [currentLocation, onShareLiveLocation, onClose]
  );

  const handleRefreshLocation = useCallback(async () => {
    if (permissionStatus !== 'granted') return;

    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let address = '';
      try {
        const [geocoded] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocoded) {
          address = [geocoded.street, geocoded.city, geocoded.country]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Ignore geocoding errors
      }

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
        timestamp: location.timestamp,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh location');
    }
    setLoading(false);
  }, [permissionStatus]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
    >
      <View className="flex-1 px-5 pt-2">
        {/* Header */}
        <Text className="text-xl font-semibold mb-4" style={{ color: colors.gray[900] }}>Share location</Text>

        {/* Permission denied */}
        {permissionStatus === 'denied' && (
          <View className="flex-1 items-center justify-center py-10">
            <Icon as={MapPin} size="xl" style={{ color: colors.gray[400] }} />
            <Text className="text-sm text-center mt-3 mb-4" style={{ color: colors.gray[600] }}>
              Location permission is required to share your location
            </Text>
            <Pressable
              className="px-5 py-2.5"
              style={{ backgroundColor: '#128C7E', borderRadius: borderRadius.lg }}
              onPress={() => Linking.openSettings()}
            >
              <Text className="text-sm font-semibold text-white">Open Settings</Text>
            </Pressable>
          </View>
        )}

        {/* Loading */}
        {loading && permissionStatus !== 'denied' && (
          <View className="flex-1 items-center justify-center py-10">
            <ActivityIndicator size="large" color="#128C7E" />
            <Text className="text-sm mt-3" style={{ color: colors.gray[500] }}>Getting your location...</Text>
          </View>
        )}

        {/* Location ready */}
        {!loading && currentLocation && permissionStatus === 'granted' && (
          <>
            {/* Current location preview */}
            <View className="p-3 mb-4" style={{ backgroundColor: colors.gray[50], borderRadius: borderRadius.lg }}>
              <HStack space="md" className="items-start">
                <View
                  className="items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9' }}
                >
                  <Icon as={MapPin} size="lg" style={{ color: '#128C7E' }} />
                </View>
                <VStack className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: colors.gray[900] }}>Your current location</Text>
                  <Text className="text-[13px] mt-0.5" style={{ color: colors.gray[600] }} numberOfLines={2}>
                    {currentLocation.address || 'Address unavailable'}
                  </Text>
                  <Text className="text-[11px] mt-1 font-mono" style={{ color: colors.gray[400] }}>
                    {currentLocation.latitude.toFixed(6)},{' '}
                    {currentLocation.longitude.toFixed(6)}
                  </Text>
                </VStack>
                <Pressable onPress={handleRefreshLocation} className="p-2">
                  <Icon as={RefreshCw} size="sm" style={{ color: colors.gray[500] }} />
                </Pressable>
              </HStack>
            </View>

            {/* Share current location button */}
            <Pressable
              className="flex-row items-center justify-center py-3.5 mb-5"
              style={{ backgroundColor: '#128C7E', borderRadius: borderRadius.lg }}
              onPress={handleShareCurrentLocation}
            >
              <Icon as={Navigation} size="md" style={{ color: '#FFFFFF' }} />
              <Text className="text-base font-semibold text-white ml-2">Send your current location</Text>
            </Pressable>

            {/* Live location options */}
            <Text className="text-base font-semibold" style={{ color: colors.gray[900] }}>Share live location</Text>
            <Text className="text-[13px] mt-1" style={{ color: colors.gray[500] }}>
              Members will see your location update in real-time
            </Text>

            <HStack space="sm" className="mt-3">
              {LIVE_DURATION_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  className="flex-1 flex-row items-center justify-center py-3"
                  style={{
                    backgroundColor: selectedLiveDuration === option.value ? '#128C7E' : '#E8F5E9',
                    borderRadius: borderRadius.lg,
                  }}
                  onPress={() => handleShareLiveLocation(option.value)}
                >
                  <Icon
                    as={Clock}
                    size="sm"
                    style={{
                      color: selectedLiveDuration === option.value ? '#FFFFFF' : '#128C7E',
                    }}
                  />
                  <Text
                    className="text-[13px] font-medium ml-1"
                    style={{
                      color: selectedLiveDuration === option.value ? '#FFFFFF' : '#128C7E',
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// LOCATION PREVIEW IN MESSAGE
// =============================================================================

export function LocationPreview({
  location,
  isOwnMessage = false,
  onPress,
  onStopLiveLocation,
}: LocationPreviewProps) {
  const isLive = isLiveLocation(location);
  const [liveRemaining, setLiveRemaining] = useState(
    isLive ? formatLiveLocationRemaining(location.expiresAt) : ''
  );

  // Update live location remaining time
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setLiveRemaining(formatLiveLocationRemaining(location.expiresAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [isLive, location]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      openInMaps(location);
    }
  }, [location, onPress]);

  const backgroundColor = isOwnMessage ? 'rgba(0,0,0,0.05)' : colors.gray[100];

  return (
    <Pressable onPress={handlePress}>
      <View className="my-1 overflow-hidden" style={{ backgroundColor, borderRadius: borderRadius.lg }}>
        {/* Map placeholder */}
        <View className="items-center justify-center relative" style={{ height: 120, backgroundColor: '#E8F5E9' }}>
          <Icon as={MapPin} size="xl" style={{ color: '#128C7E' }} />
          {isLive && location.isActive && (
            <View className="absolute top-2 right-2 px-2 py-1 rounded" style={{ backgroundColor: '#EF4444' }}>
              <Text className="text-[10px] font-bold text-white">LIVE</Text>
            </View>
          )}
        </View>

        {/* Location info */}
        <View className="p-3">
          <HStack space="xs" className="items-center">
            <Icon as={MapPin} size="sm" style={{ color: '#128C7E' }} />
            <Text className="text-sm font-semibold" style={{ color: colors.gray[900] }}>
              {isLive ? 'Live location' : 'Location'}
            </Text>
          </HStack>

          {location.address && (
            <Text className="text-[13px] mt-0.5" style={{ color: colors.gray[600] }} numberOfLines={1}>
              {location.address}
            </Text>
          )}

          {isLive && location.isActive && (
            <HStack space="xs" className="items-center mt-1">
              <Icon as={Clock} size="xs" style={{ color: colors.gray[500] }} />
              <Text className="text-xs" style={{ color: colors.gray[500] }}>{liveRemaining}</Text>
            </HStack>
          )}

          <HStack space="sm" className="items-center mt-2">
            <Pressable onPress={handlePress} className="flex-row items-center">
              <Icon as={ExternalLink} size="xs" style={{ color: '#0066CC' }} />
              <Text className="text-xs ml-1" style={{ color: '#0066CC' }}>Open in Maps</Text>
            </Pressable>

            {/* Stop Live Location button - only show for own active live locations */}
            {isLive && location.isActive && isOwnMessage && onStopLiveLocation && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onStopLiveLocation();
                }}
                className="flex-row items-center px-2.5 py-1"
                style={{ backgroundColor: '#FEE2E2', borderRadius: borderRadius.md }}
              >
                <Icon as={StopCircle} size="xs" style={{ color: '#DC2626' }} />
                <Text className="text-xs font-semibold ml-1" style={{ color: '#DC2626' }}>Stop</Text>
              </Pressable>
            )}
          </HStack>
        </View>
      </View>
    </Pressable>
  );
}

export default LocationSharer;
