/**
 * GuidedPrayerDisplay - Scrollable bilingual prayer display
 *
 * Design:
 * - Large readable prayer text
 * - Warm amber/gold styling to match "Accept Jesus" theme
 * - Scrollable for long prayers
 * - Bilingual support (displays based on current language)
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface GuidedPrayerDisplayProps {
  prayerText: string;
  maxHeight?: number;
}

// Default prayer texts
const DEFAULT_PRAYER_EN = `Lord Jesus, I believe You are the Son of God who died for my sins and rose again.

I confess that I am a sinner and I need Your forgiveness. I repent of my sins and turn away from them.

I invite You into my heart as my Lord and Savior. Thank You for Your gift of eternal life.

Help me to live for You all the days of my life.

In Jesus' name I pray, Amen.`;

const DEFAULT_PRAYER_ID = `Tuhan Yesus, saya percaya Engkau adalah Anak Allah yang mati untuk dosa-dosa saya dan bangkit kembali.

Saya mengakui bahwa saya adalah orang berdosa dan saya membutuhkan pengampunan-Mu. Saya bertobat dari dosa-dosa saya dan berbalik dari padanya.

Saya mengundang Engkau masuk ke dalam hati saya sebagai Tuhan dan Juruselamat saya. Terima kasih atas karunia hidup kekal.

Tolong saya untuk hidup bagi-Mu sepanjang hidup saya.

Dalam nama Yesus saya berdoa, Amin.`;

export function GuidedPrayerDisplay({
  prayerText,
  maxHeight = 300,
}: GuidedPrayerDisplayProps) {
  const { i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';

  // Use provided text or fallback to default based on language
  const displayText = prayerText || (isIndonesian ? DEFAULT_PRAYER_ID : DEFAULT_PRAYER_EN);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFBF0', '#FFF7E6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Quote icon */}
        <View style={styles.quoteContainer}>
          <Quote size={24} color="#D4A84B" />
        </View>

        {/* Scrollable prayer text */}
        <ScrollView
          style={[styles.scrollView, { maxHeight }]}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.prayerText}>{displayText}</Text>
        </ScrollView>

        {/* Accent bar */}
        <View style={styles.accentBar} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  gradient: {
    padding: 24,
    paddingLeft: 28,
    position: 'relative',
  },
  quoteContainer: {
    marginBottom: 16,
  },
  scrollView: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingRight: 8,
  },
  prayerText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#5D4E37',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 24,
    bottom: 24,
    width: 4,
    backgroundColor: '#D4A84B',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default GuidedPrayerDisplay;
