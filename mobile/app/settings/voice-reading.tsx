/**
 * Voice & Reading Settings Page
 *
 * Configure:
 * - OpenAI API key for TTS/STT
 * - Voice preferences (voice selection, speed)
 * - Reading preferences (font size, theme, line height)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
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
  type TTSVoice,
} from '@/stores/voiceSettings';
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

// Voice options
const VOICE_OPTIONS: { value: TTSVoice; label: string; description: string }[] = [
  { value: 'nova', label: 'Nova', description: 'Friendly, upbeat' },
  { value: 'alloy', label: 'Alloy', description: 'Neutral, balanced' },
  { value: 'echo', label: 'Echo', description: 'Warm, conversational' },
  { value: 'fable', label: 'Fable', description: 'Expressive, storytelling' },
  { value: 'onyx', label: 'Onyx', description: 'Deep, authoritative' },
  { value: 'shimmer', label: 'Shimmer', description: 'Soft, gentle' },
];

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

  // Load settings on mount
  useEffect(() => {
    voiceSettings.loadSettings();
    readingPrefs.loadPreferences();
  }, []);

  // Initialize API key input
  useEffect(() => {
    if (voiceSettings.apiKey) {
      setApiKeyInput(voiceSettings.apiKey);
    }
  }, [voiceSettings.apiKey]);

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    try {
      await voiceSettings.setApiKey(apiKeyInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'API key saved securely');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    }
  }, [apiKeyInput, voiceSettings]);

  const handleClearApiKey = useCallback(async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove the API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await voiceSettings.clearApiKey();
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
        { voice: voiceSettings.preferences.voice }
      );
    } catch (error) {
      Alert.alert('Error', 'Voice test failed. Please check your API key.');
    } finally {
      setIsTestingVoice(false);
    }
  }, [voiceSettings]);

  const handleVoiceSelect = useCallback(async (voice: TTSVoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voiceSettings.updatePreferences({ voice });
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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          >
            <ChevronLeft size={24} color={Colors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>Voice & Reading</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Volume2 size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Voice Settings</Text>
          </View>

          {/* API Key */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Key size={18} color={Colors.neutral[600]} />
              <Text style={styles.cardTitle}>OpenAI API Key</Text>
            </View>
            <Text style={styles.cardDescription}>
              Required for voice features. Get your key from platform.openai.com
            </Text>

            <View style={styles.apiKeyRow}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                placeholder="sk-..."
                placeholderTextColor={Colors.neutral[400]}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowApiKey(!showApiKey)}
                style={styles.eyeBtn}
              >
                <Eye size={20} color={Colors.neutral[500]} />
              </Pressable>
            </View>

            <View style={styles.apiKeyActions}>
              <Pressable
                onPress={handleSaveApiKey}
                style={[styles.actionBtn, styles.saveBtn]}
              >
                <Check size={16} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>

              {voiceSettings.apiKey && (
                <Pressable
                  onPress={handleClearApiKey}
                  style={[styles.actionBtn, styles.clearBtn]}
                >
                  <Trash2 size={16} color={Colors.error} />
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Voice Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Mic size={18} color={Colors.neutral[600]} />
              <Text style={styles.cardTitle}>Voice</Text>
            </View>

            <View style={styles.voiceGrid}>
              {VOICE_OPTIONS.map((voice) => (
                <Pressable
                  key={voice.value}
                  onPress={() => handleVoiceSelect(voice.value)}
                  style={[
                    styles.voiceOption,
                    voiceSettings.preferences.voice === voice.value && styles.voiceOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.voiceLabel,
                      voiceSettings.preferences.voice === voice.value && styles.voiceLabelSelected,
                    ]}
                  >
                    {voice.label}
                  </Text>
                  <Text style={styles.voiceDesc}>{voice.description}</Text>
                </Pressable>
              ))}
            </View>

            {/* Test Voice */}
            <Pressable
              onPress={handleTestVoice}
              disabled={isTestingVoice}
              style={[styles.testBtn, isTestingVoice && styles.testBtnDisabled]}
            >
              <Play size={18} color={Colors.white} />
              <Text style={styles.testBtnText}>
                {isTestingVoice ? 'Playing...' : 'Test Voice'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Reading Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Reading Preferences</Text>
          </View>

          {/* Font Size */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Type size={18} color={Colors.neutral[600]} />
              <Text style={styles.cardTitle}>Font Size</Text>
            </View>

            <View style={styles.fontSizeRow}>
              {FONT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleFontSizeSelect(option.value)}
                  style={[
                    styles.fontSizeOption,
                    readingPrefs.fontSize === option.value && styles.fontSizeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.fontSizeLabel,
                      { fontSize: option.size },
                      readingPrefs.fontSize === option.value && styles.fontSizeLabelSelected,
                    ]}
                  >
                    Aa
                  </Text>
                  <Text style={styles.fontSizeDesc}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Theme */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sun size={18} color={Colors.neutral[600]} />
              <Text style={styles.cardTitle}>Reading Theme</Text>
            </View>

            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleThemeSelect(option.value)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: option.colors.bg },
                    readingPrefs.theme === option.value && styles.themeOptionSelected,
                  ]}
                >
                  <Text style={[styles.themePreview, { color: option.colors.text }]}>
                    Aa
                  </Text>
                  <Text style={styles.themeLabel}>{option.label}</Text>
                  {readingPrefs.theme === option.value && (
                    <View style={styles.themeCheck}>
                      <Check size={14} color={Colors.white} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Preview */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor:
                  readingPrefs.theme === 'light'
                    ? '#FFFFFF'
                    : readingPrefs.theme === 'sepia'
                      ? '#F5F0E6'
                      : '#1A1A1A',
              },
            ]}
          >
            <Text style={styles.previewTitle}>Preview</Text>
            <Text
              style={[
                styles.previewText,
                {
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
                },
              ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 12,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  apiKeyInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: Colors.neutral[900],
  },
  eyeBtn: {
    padding: 8,
  },
  apiKeyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: Colors.neutral[100],
  },
  clearBtnText: {
    color: Colors.error,
    fontWeight: '600',
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  voiceOption: {
    width: '48%',
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  voiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  voiceLabelSelected: {
    color: Colors.primary,
  },
  voiceDesc: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  testBtnDisabled: {
    opacity: 0.6,
  },
  testBtnText: {
    color: Colors.white,
    fontWeight: '600',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fontSizeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  fontSizeLabel: {
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  fontSizeLabelSelected: {
    color: Colors.primary,
  },
  fontSizeDesc: {
    fontSize: 11,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    position: 'relative',
  },
  themeOptionSelected: {
    borderColor: Colors.primary,
  },
  themePreview: {
    fontSize: 24,
    fontWeight: '600',
  },
  themeLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginTop: 8,
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[400],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontFamily: 'System',
  },
});
