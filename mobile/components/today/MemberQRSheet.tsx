/**
 * MemberQRSheet - Check-in QR Code Bottom Sheet
 *
 * Shows member's QR code for event check-in.
 * Features:
 * - Uses BottomSheet (not BottomSheetModal) per CLAUDE.md rules
 * - Declarative control via Zustand store
 * - Large QR code display (240×240)
 * - Member ID display
 * - Brightness boost while visible
 *
 * Styling: NativeWind-first with inline styles for shadows
 */

import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { QrCode, X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';

import { useMemberQRStore } from '@/stores/memberQR';
import { useAuthStore } from '@/stores/auth';

// Dimensions
const QR_SIZE = 240;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
  },
  neutral: {
    100: '#F5F5F5',
    400: '#A3A3A3',
    600: '#525252',
    800: '#262626',
  },
};

export const MemberQRSheet = memo(function MemberQRSheet() {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);
  const originalBrightness = useRef<number | null>(null);

  const { visible, close } = useMemberQRStore();
  const { member } = useAuthStore();

  // QR code data - contains member ID for check-in
  const qrData = useMemo(() => {
    if (!member?.id) return '';
    return `FAITHFLOW:MEMBER:${member.id}`;
  }, [member?.id]);

  // Boost brightness when QR is shown
  useEffect(() => {
    const handleBrightness = async () => {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (visible) {
          // Save original brightness and boost
          try {
            const current = await Brightness.getBrightnessAsync();
            originalBrightness.current = current;
            await Brightness.setBrightnessAsync(1);
          } catch (error) {
            console.log('Brightness control not available:', error);
          }
        } else {
          // Restore original brightness
          if (originalBrightness.current !== null) {
            try {
              await Brightness.setBrightnessAsync(originalBrightness.current);
            } catch (error) {
              console.log('Could not restore brightness:', error);
            }
          }
        }
      }
    };

    handleBrightness();
  }, [visible]);

  // Backdrop component
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

  // Handle close
  const handleClose = useCallback(() => {
    close();
  }, [close]);

  // Handle sheet index change
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        close();
      }
    },
    [close]
  );

  // Don't render if no member
  if (!member?.id) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={handleClose}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Close Button */}
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close QR code"
        >
          <X size={24} color={Colors.neutral[400]} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <QrCode size={24} color={Colors.accent.primary} />
          </View>
          <Text style={styles.title}>
            {t('today.qr.title', 'Your Check-in QR')}
          </Text>
          <Text style={styles.subtitle}>
            {t('today.qr.instruction', 'Show this QR code at event check-in')}
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrData}
              size={QR_SIZE}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          </View>
        </View>

        {/* Member Info */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          <Text style={styles.memberId}>ID: {member.id.substring(0, 8).toUpperCase()}</Text>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#D4D4D4',
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[800],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[400],
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  memberInfo: {
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[800],
    marginBottom: 4,
  },
  memberId: {
    fontSize: 13,
    color: Colors.neutral[400],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
