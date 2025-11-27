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
  StyleSheet,
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
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Share location</Text>

        {/* Permission denied */}
        {permissionStatus === 'denied' && (
          <View style={styles.permissionDenied}>
            <Icon as={MapPin} size="xl" style={{ color: colors.gray[400] }} />
            <Text style={styles.permissionText}>
              Location permission is required to share your location
            </Text>
            <Pressable
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </Pressable>
          </View>
        )}

        {/* Loading */}
        {loading && permissionStatus !== 'denied' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#128C7E" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        {/* Location ready */}
        {!loading && currentLocation && permissionStatus === 'granted' && (
          <>
            {/* Current location preview */}
            <View style={styles.locationPreview}>
              <HStack space="md" className="items-start">
                <View style={styles.locationIcon}>
                  <Icon as={MapPin} size="lg" style={{ color: '#128C7E' }} />
                </View>
                <VStack className="flex-1">
                  <Text style={styles.locationTitle}>Your current location</Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {currentLocation.address || 'Address unavailable'}
                  </Text>
                  <Text style={styles.locationCoords}>
                    {currentLocation.latitude.toFixed(6)},{' '}
                    {currentLocation.longitude.toFixed(6)}
                  </Text>
                </VStack>
                <Pressable onPress={handleRefreshLocation} style={styles.refreshButton}>
                  <Icon as={RefreshCw} size="sm" style={{ color: colors.gray[500] }} />
                </Pressable>
              </HStack>
            </View>

            {/* Share current location button */}
            <Pressable
              style={styles.shareButton}
              onPress={handleShareCurrentLocation}
            >
              <Icon as={Navigation} size="md" style={{ color: '#FFFFFF' }} />
              <Text style={styles.shareButtonText}>Send your current location</Text>
            </Pressable>

            {/* Live location options */}
            <Text style={styles.sectionTitle}>Share live location</Text>
            <Text style={styles.sectionDescription}>
              Members will see your location update in real-time
            </Text>

            <HStack space="sm" className="mt-3">
              {LIVE_DURATION_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.durationButton,
                    selectedLiveDuration === option.value &&
                      styles.durationButtonSelected,
                  ]}
                  onPress={() => handleShareLiveLocation(option.value)}
                >
                  <Icon
                    as={Clock}
                    size="sm"
                    style={{
                      color:
                        selectedLiveDuration === option.value
                          ? '#FFFFFF'
                          : '#128C7E',
                    }}
                  />
                  <Text
                    style={[
                      styles.durationButtonText,
                      selectedLiveDuration === option.value &&
                        styles.durationButtonTextSelected,
                    ]}
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
      <View style={[styles.previewContainer, { backgroundColor }]}>
        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <Icon as={MapPin} size="xl" style={{ color: '#128C7E' }} />
          {isLive && location.isActive && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Location info */}
        <View style={styles.previewContent}>
          <HStack space="xs" className="items-center">
            <Icon as={MapPin} size="sm" style={{ color: '#128C7E' }} />
            <Text style={styles.previewTitle}>
              {isLive ? 'Live location' : 'Location'}
            </Text>
          </HStack>

          {location.address && (
            <Text style={styles.previewAddress} numberOfLines={1}>
              {location.address}
            </Text>
          )}

          {isLive && location.isActive && (
            <HStack space="xs" className="items-center mt-1">
              <Icon as={Clock} size="xs" style={{ color: colors.gray[500] }} />
              <Text style={styles.previewRemaining}>{liveRemaining}</Text>
            </HStack>
          )}

          <HStack space="sm" className="items-center mt-2">
            <Pressable onPress={handlePress} style={styles.openMapsButton}>
              <Icon as={ExternalLink} size="xs" style={{ color: '#0066CC' }} />
              <Text style={styles.openMapsText}>Open in Maps</Text>
            </Pressable>

            {/* Stop Live Location button - only show for own active live locations */}
            {isLive && location.isActive && isOwnMessage && onStopLiveLocation && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onStopLiveLocation();
                }}
                style={styles.stopButton}
              >
                <Icon as={StopCircle} size="xs" style={{ color: '#DC2626' }} />
                <Text style={styles.stopButtonText}>Stop</Text>
              </Pressable>
            )}
          </HStack>
        </View>
      </View>
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Sheet styles
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: colors.gray[300],
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Title
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 16,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 12,
  },

  // Permission denied
  permissionDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  permissionText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  settingsButton: {
    backgroundColor: '#128C7E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Location preview
  locationPreview: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 16,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  locationAddress: {
    fontSize: 13,
    color: colors.gray[600],
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 4,
    fontFamily: 'monospace',
  },
  refreshButton: {
    padding: 8,
  },

  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#128C7E',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    marginBottom: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },

  // Live location section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 4,
  },
  durationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
  },
  durationButtonSelected: {
    backgroundColor: '#128C7E',
  },
  durationButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#128C7E',
    marginLeft: 4,
  },
  durationButtonTextSelected: {
    color: '#FFFFFF',
  },

  // Message preview
  previewContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: 4,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewContent: {
    padding: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  previewAddress: {
    fontSize: 13,
    color: colors.gray[600],
    marginTop: 2,
  },
  previewRemaining: {
    fontSize: 12,
    color: colors.gray[500],
  },
  openMapsText: {
    fontSize: 12,
    color: '#0066CC',
    marginLeft: 4,
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  stopButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LocationSharer;
