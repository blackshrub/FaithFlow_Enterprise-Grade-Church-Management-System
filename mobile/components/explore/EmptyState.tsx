/**
 * EmptyState - Empty state components for Explore feature
 *
 * Design: Calm, encouraging, never guilt-inducing
 * Following UI/UX spec: "Progress over Perfection" principle
 *
 * Styling: NativeWind-first with inline style for theme values
 */

import React from 'react';
import { View } from 'react-native';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { BookOpen, Heart, Calendar, Search, Sparkles } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

type EmptyStateType = 'no_results' | 'no_content' | 'error' | 'offline' | 'loading' | 'empty';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'encouraging' | 'minimal';
  // Alternative props for simpler usage
  type?: EmptyStateType | string;
  message?: string;
}

// Default messages for empty state types
const typeMessages: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  no_results: {
    title: 'No Results Found',
    description: 'Try adjusting your search or filters.',
    icon: <Search size={48} color={ExploreColors.neutral[400]} />,
  },
  no_content: {
    title: 'No Content Available',
    description: 'Content will be available soon.',
    icon: <BookOpen size={48} color={ExploreColors.primary[400]} />,
  },
  error: {
    title: 'Something Went Wrong',
    description: 'Please try again later.',
    icon: <Sparkles size={48} color={ExploreColors.spiritual[400]} />,
  },
  offline: {
    title: "You're Offline",
    description: 'Check your internet connection.',
    icon: <Sparkles size={48} color={ExploreColors.neutral[400]} />,
  },
  empty: {
    title: 'Nothing Here Yet',
    description: 'Content will appear here once available.',
    icon: <BookOpen size={48} color={ExploreColors.primary[400]} />,
  },
};

/**
 * Base empty state component
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  type,
  message,
}: EmptyStateProps) {
  // Support both title/description and type/message patterns
  const typeConfig = type ? typeMessages[type] || typeMessages.empty : null;
  const displayTitle = title || message || typeConfig?.title || 'Empty';
  const displayDescription = description || (type && !message ? typeConfig?.description : undefined);
  const displayIcon = icon || typeConfig?.icon;

  return (
    <View
      className="items-center justify-center"
      style={{
        paddingVertical: variant === 'minimal' ? ExploreSpacing.xl : ExploreSpacing['3xl'],
        paddingHorizontal: ExploreSpacing.xl,
      }}
    >
      {displayIcon && (
        <View style={{ marginBottom: ExploreSpacing.lg }}>
          {displayIcon}
        </View>
      )}

      <Text
        className="text-center"
        style={{
          ...ExploreTypography.h3,
          color: ExploreColors.neutral[900],
          marginBottom: ExploreSpacing.sm,
        }}
      >
        {displayTitle}
      </Text>

      {displayDescription && (
        <Text
          className="text-center max-w-[280px]"
          style={{
            ...ExploreTypography.body,
            color: variant === 'encouraging' ? ExploreColors.primary[700] : ExploreColors.neutral[600],
          }}
        >
          {displayDescription}
        </Text>
      )}

      {action && (
        <View style={{ marginTop: ExploreSpacing.lg }}>
          {action}
        </View>
      )}
    </View>
  );
}

/**
 * No content available empty state
 */
export function NoContentEmptyState({ contentType }: { contentType: string }) {
  const messages: Record<string, { title: string; description: string }> = {
    devotion: {
      title: 'No Devotion Yet',
      description: "Today's devotion will be available soon. Check back later!",
    },
    verse: {
      title: 'No Verse Yet',
      description: "Today's verse will be available soon. Check back later!",
    },
    figure: {
      title: 'No Bible Figure Yet',
      description: "Today's Bible figure will be available soon. Check back later!",
    },
    quiz: {
      title: 'No Quiz Yet',
      description: "Today's quiz challenge will be available soon. Check back later!",
    },
    default: {
      title: 'No Content Available',
      description: 'Content will be available soon. Check back later!',
    },
  };

  const message = messages[contentType] || messages.default;

  return (
    <EmptyState
      icon={<BookOpen size={48} color={ExploreColors.primary[400]} />}
      title={message.title}
      description={message.description}
      variant="encouraging"
    />
  );
}

/**
 * No favorites empty state
 */
export function NoFavoritesEmptyState({ language = 'en' }: { language?: 'en' | 'id' }) {
  return (
    <EmptyState
      icon={<Heart size={48} color={ExploreColors.spiritual[400]} />}
      title={language === 'en' ? 'No Favorites Yet' : 'Belum Ada Favorit'}
      description={
        language === 'en'
          ? 'Tap the heart icon on any content to save it here for quick access.'
          : 'Ketuk ikon hati pada konten apa pun untuk menyimpannya di sini.'
      }
      variant="encouraging"
    />
  );
}

/**
 * No bookmarks empty state
 */
export function NoBookmarksEmptyState({ language = 'en' }: { language?: 'en' | 'id' }) {
  return (
    <EmptyState
      icon={<BookOpen size={48} color={ExploreColors.primary[400]} />}
      title={language === 'en' ? 'No Bookmarks Yet' : 'Belum Ada Bookmark'}
      description={
        language === 'en'
          ? 'Bookmark devotions and studies to continue where you left off.'
          : 'Tandai bacaan dan studi untuk melanjutkan dari tempat Anda berhenti.'
      }
      variant="encouraging"
    />
  );
}

/**
 * No search results empty state
 */
export function NoSearchResultsEmptyState({
  query,
  language = 'en',
}: {
  query: string;
  language?: 'en' | 'id';
}) {
  return (
    <EmptyState
      icon={<Search size={48} color={ExploreColors.neutral[400]} />}
      title={language === 'en' ? 'No Results Found' : 'Tidak Ada Hasil'}
      description={
        language === 'en'
          ? `No content found for "${query}". Try different keywords.`
          : `Tidak ada konten ditemukan untuk "${query}". Coba kata kunci lain.`
      }
      variant="minimal"
    />
  );
}

/**
 * Coming soon empty state
 */
export function ComingSoonEmptyState({
  feature,
  language = 'en',
}: {
  feature: string;
  language?: 'en' | 'id';
}) {
  return (
    <EmptyState
      icon={<Sparkles size={48} color={ExploreColors.secondary[400]} />}
      title={language === 'en' ? 'Coming Soon!' : 'Segera Hadir!'}
      description={
        language === 'en'
          ? `${feature} is coming soon. Stay tuned!`
          : `${feature} akan segera hadir. Nantikan!`
      }
      variant="encouraging"
    />
  );
}

/**
 * No streak empty state (encouraging, no guilt)
 */
export function NoStreakEmptyState({ language = 'en' }: { language?: 'en' | 'id' }) {
  return (
    <EmptyState
      icon={<Calendar size={48} color={ExploreColors.primary[400]} />}
      title={language === 'en' ? 'Start Your Journey' : 'Mulai Perjalanan Anda'}
      description={
        language === 'en'
          ? "Complete today's content to start building your streak. Every step counts!"
          : 'Selesaikan konten hari ini untuk mulai membangun streak. Setiap langkah berarti!'
      }
      variant="encouraging"
    />
  );
}

/**
 * Streak broken empty state (encouraging, no guilt - per UI/UX spec)
 */
export function StreakBrokenEmptyState({ language = 'en' }: { language?: 'en' | 'id' }) {
  return (
    <EmptyState
      icon={<Sparkles size={48} color={ExploreColors.secondary[400]} />}
      title={language === 'en' ? 'Fresh Start' : 'Awal Baru'}
      description={
        language === 'en'
          ? "Every day is a new opportunity. Let's begin again together!"
          : 'Setiap hari adalah kesempatan baru. Mari kita mulai lagi bersama!'
      }
      variant="encouraging"
    />
  );
}
