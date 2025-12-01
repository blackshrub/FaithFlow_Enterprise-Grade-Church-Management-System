/**
 * Voice & Reading Settings Page
 *
 * Configure:
 * - Google Cloud TTS API key
 * - Voice preferences (voice selection, speed)
 * - Reading preferences (font size, theme, line height)
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Volume2,
  Mic,
  Type,
  Sun,
  Moon,
  Eye,
  Key,
  Check,
  Play,
  Trash2,
} from 'lucide-react-native';

import {
  useVoiceSettingsStore,
  type GoogleTTSVoice,
} from '@/stores/voiceSettings';
import { GOOGLE_TTS_VOICES } from '@/constants/voice';
import {
  useReadingPreferencesStore,
  type FontSize,
  type ReadingTheme,
} from '@/stores/readingPreferences';
import { speakText } from '@/services/voice/speechService';

// Colors
const Colors = {
  primary: '#4F46E5',
  primaryLight: '#6366F1',
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  background: '#F2F2F7',
};

// Voice options - Google TTS WaveNet voices
const VOICE_OPTIONS: { value: GoogleTTSVoice; label: string; description: string }[] = Object.entries(GOOGLE_TTS_VOICES).map(([voice, info]) => ({
  value: voice as GoogleTTSVoice,
  label: info.label,
  description: info.gender === 'female' ? 'Female' : 'Male',
}));

// Font size options
const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: number }[] = [
  { value: 'small', label: 'Small', size: 14 },
  { value: 'medium', label: 'Medium', size: 16 },
  { value: 'large', label: 'Large', size: 18 },
  { value: 'xlarge', label: 'Extra Large', size: 22 },
];

// Theme options
const THEME_OPTIONS: { value: ReadingTheme; label: string; colors: { bg: string; text: string } }[] = [
  { value: 'light', label: 'Light', colors: { bg: '#FFFFFF', text: '#1F2937' } },
  { value: 'sepia', label: 'Sepia', colors: { bg: '#F5F0E6', text: '#3D3929' } },
  { value: 'dark', label: 'Dark', colors: { bg: '#1A1A1A', text: '#E5E5E5' } },
];

export default function VoiceReadingSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Voice settings
  const voiceSettings = useVoiceSettingsStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Reading preferences
  const readingPrefs = useReadingPreferencesStore();

  // Load voice settings on mount (reading prefs auto-loaded by MMKV persist)
  useEffect(() => {
    voiceSettings.loadSettings();
  }, []);

  // Initialize API key input
  useEffect(() => {
    if (voiceSettings.apiKey) {
      setApiKeyInput(voiceSettings.apiKey);
    }
  }, [voiceSettings.apiKey]);

  const handleRefreshApiKey = useCallback(async () => {
    try {
      await voiceSettings.refreshFromBackend();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Voice settings refreshed from server');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh settings');
    }
  }, [voiceSettings]);

  const handleClearCache = useCallback(async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the cached API key? It will be re-fetched from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await voiceSettings.clearCache();
            setApiKeyInput('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [voiceSettings]);

  const handleTestVoice = useCallback(async () => {
    const apiKey = voiceSettings.getEffectiveApiKey();
    if (!apiKey) {
      Alert.alert('Error', 'No API key configured');
      return;
    }

    setIsTestingVoice(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await speakText(
        'Hello! This is a test of the voice feature. Halo! Ini adalah tes fitur suara.',
        apiKey,
        { voice: voiceSettings.getEffectiveVoice() }
      );
    } catch (error) {
      Alert.alert('Error', 'Voice test failed. Please check your API key.');
    } finally {
      setIsTestingVoice(false);
    }
  }, [voiceSettings]);

  const handleVoiceSelect = useCallback(async (voice: GoogleTTSVoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voiceSettings.updateUserPreferences({ voice });
  }, [voiceSettings]);

  const handleFontSizeSelect = useCallback(async (size: FontSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await readingPrefs.setFontSize(size);
  }, [readingPrefs]);

  const handleThemeSelect = useCallback(async (theme: ReadingTheme) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await readingPrefs.setTheme(theme);
  }, [readingPrefs]);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      {/* Header */}
      <View className="px-4 pb-3" style={{ backgroundColor: Colors.background, paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
          >
            <ChevronLeft size={24} color={Colors.neutral[900]} />
          </Pressable>
          <Text className="text-lg font-semibold" style={{ color: Colors.neutral[900] }}>
            Voice & Reading
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice Settings Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4 gap-2">
            <Volume2 size={20} color={Colors.primary} />
            <Text className="text-lg font-semibold" style={{ color: Colors.neutral[900] }}>
              Voice Settings
            </Text>
          </View>

          {/* API Key */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Key size={18} color={Colors.neutral[600]} />
              <Text className="text-base font-semibold" style={{ color: Colors.neutral[800] }}>
                Google Cloud TTS API Key
              </Text>
            </View>
            <Text className="text-[13px] mb-3" style={{ color: Colors.neutral[500] }}>
              Required for voice features. Get your key from console.cloud.google.com
            </Text>

            <View className="flex-row items-center rounded-lg px-3" style={{ backgroundColor: Colors.neutral[100] }}>
              <TextInput
                className="flex-1 h-11 text-sm"
                style={{ color: Colors.neutral[900] }}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                placeholder="AIzaSy..."
                placeholderTextColor={Colors.neutral[400]}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowApiKey(!showApiKey)} className="p-2">
                <Eye size={20} color={Colors.neutral[500]} />
              </Pressable>
            </View>

            <View className="flex-row gap-3 mt-3">
              <Pressable
                onPress={handleRefreshApiKey}
                className="flex-row items-center gap-1.5 py-2 px-4 rounded-lg"
                style={{ backgroundColor: Colors.primary }}
              >
                <Check size={16} color={Colors.white} />
                <Text className="font-semibold" style={{ color: Colors.white }}>Refresh</Text>
              </Pressable>

              {voiceSettings.apiKey && (
                <Pressable
                  onPress={handleClearCache}
                  className="flex-row items-center gap-1.5 py-2 px-4 rounded-lg"
                  style={{ backgroundColor: Colors.neutral[100] }}
                >
                  <Trash2 size={16} color={Colors.error} />
                  <Text className="font-semibold" style={{ color: Colors.error }}>Clear Cache</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Voice Selection */}
          <View className="bg-white rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Mic size={18} color={Colors.neutral[600]} />
              <Text className="text-base font-semibold" style={{ color: Colors.neutral[800] }}>
                Voice
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2 mb-4">
              {VOICE_OPTIONS.map((voice) => (
                <Pressable
                  key={voice.value}
                  onPress={() => handleVoiceSelect(voice.value)}
                  className="w-[48%] rounded-lg p-3 border-2"
                  style={{
                    backgroundColor: voiceSettings.getEffectiveVoice() === voice.value
                      ? Colors.primary + '10'
                      : Colors.neutral[100],
                    borderColor: voiceSettings.getEffectiveVoice() === voice.value
                      ? Colors.primary
                      : 'transparent',
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: voiceSettings.getEffectiveVoice() === voice.value
                        ? Colors.primary
                        : Colors.neutral[800],
                    }}
                  >
                    {voice.label}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: Colors.neutral[500] }}>
                    {voice.description}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Test Voice */}
            <Pressable
              onPress={handleTestVoice}
              disabled={isTestingVoice}
              className="flex-row items-center justify-center gap-2 py-3 rounded-lg"
              style={{
                backgroundColor: Colors.primary,
                opacity: isTestingVoice ? 0.6 : 1,
              }}
            >
              <Play size={18} color={Colors.white} />
              <Text className="font-semibold" style={{ color: Colors.white }}>
                {isTestingVoice ? 'Playing...' : 'Test Voice'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Reading Preferences Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4 gap-2">
            <Type size={20} color={Colors.primary} />
            <Text className="text-lg font-semibold" style={{ color: Colors.neutral[900] }}>
              Reading Preferences
            </Text>
          </View>

          {/* Font Size */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Type size={18} color={Colors.neutral[600]} />
              <Text className="text-base font-semibold" style={{ color: Colors.neutral[800] }}>
                Font Size
              </Text>
            </View>

            <View className="flex-row gap-2">
              {FONT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleFontSizeSelect(option.value)}
                  className="flex-1 items-center rounded-lg p-3 border-2"
                  style={{
                    backgroundColor: readingPrefs.fontSize === option.value
                      ? Colors.primary + '10'
                      : Colors.neutral[100],
                    borderColor: readingPrefs.fontSize === option.value
                      ? Colors.primary
                      : 'transparent',
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{
                      fontSize: option.size,
                      color: readingPrefs.fontSize === option.value
                        ? Colors.primary
                        : Colors.neutral[800],
                    }}
                  >
                    Aa
                  </Text>
                  <Text className="text-[11px] mt-1" style={{ color: Colors.neutral[500] }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Theme */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Sun size={18} color={Colors.neutral[600]} />
              <Text className="text-base font-semibold" style={{ color: Colors.neutral[800] }}>
                Reading Theme
              </Text>
            </View>

            <View className="flex-row gap-3">
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleThemeSelect(option.value)}
                  className="flex-1 items-center rounded-xl p-4 border-2 relative"
                  style={{
                    backgroundColor: option.colors.bg,
                    borderColor: readingPrefs.theme === option.value
                      ? Colors.primary
                      : Colors.neutral[200],
                  }}
                >
                  <Text className="text-2xl font-semibold" style={{ color: option.colors.text }}>
                    Aa
                  </Text>
                  <Text className="text-xs mt-2" style={{ color: Colors.neutral[600] }}>
                    {option.label}
                  </Text>
                  {readingPrefs.theme === option.value && (
                    <View
                      className="absolute top-2 right-2 w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: Colors.primary }}
                    >
                      <Check size={14} color={Colors.white} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Preview */}
          <View
            className="rounded-xl p-4 border"
            style={{
              backgroundColor:
                readingPrefs.theme === 'light'
                  ? '#FFFFFF'
                  : readingPrefs.theme === 'sepia'
                    ? '#F5F0E6'
                    : '#1A1A1A',
              borderColor: Colors.neutral[200],
            }}
          >
            <Text className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: Colors.neutral[400] }}>
              Preview
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZE_OPTIONS.find((f) => f.value === readingPrefs.fontSize)?.size || 16,
                color:
                  readingPrefs.theme === 'light'
                    ? '#1F2937'
                    : readingPrefs.theme === 'sepia'
                      ? '#3D3929'
                      : '#E5E5E5',
                lineHeight:
                  (FONT_SIZE_OPTIONS.find((f) => f.value === readingPrefs.fontSize)?.size || 16) *
                  readingPrefs.lineHeight,
              }}
            >
              For God so loved the world that he gave his one and only Son, that whoever believes in
              him shall not perish but have eternal life. - John 3:16
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
