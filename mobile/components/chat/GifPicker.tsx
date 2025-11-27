/**
 * GifPicker Component
 *
 * GIF picker using Tenor API with:
 * - Search functionality
 * - Trending GIFs
 * - Category tabs (trending, reactions, memes, etc.)
 * - Infinite scroll
 * - Preview on long press
 * - Quick send on tap
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import {
  Search,
  X,
  TrendingUp,
  Heart,
  Laugh,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Loader2,
} from 'lucide-react-native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface GifItem {
  id: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  title?: string;
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onGifSelect: (gif: GifItem) => void;
  tenorApiKey?: string;
}

interface GifPreviewProps {
  gif: GifItem | null;
  visible: boolean;
  onClose: () => void;
  onSend: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_COLUMNS = 2;
const GIF_SIZE = (SCREEN_WIDTH - 48) / GIF_COLUMNS;

// Default Tenor API key (should be moved to environment variables in production)
const DEFAULT_TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'reactions', label: 'Reactions', icon: Heart },
  { id: 'funny', label: 'Funny', icon: Laugh },
  { id: 'yes', label: 'Yes', icon: ThumbsUp },
  { id: 'no', label: 'No', icon: ThumbsDown },
  { id: 'excited', label: 'Excited', icon: Sparkles },
];

// =============================================================================
// TENOR API FUNCTIONS
// =============================================================================

async function fetchTrendingGifs(
  apiKey: string,
  limit: number = 30,
  pos?: string
): Promise<{ results: GifItem[]; next: string }> {
  const params = new URLSearchParams({
    key: apiKey,
    client_key: 'faithflow_mobile',
    limit: limit.toString(),
    media_filter: 'gif,tinygif',
    ...(pos && { pos }),
  });

  const response = await fetch(
    `https://tenor.googleapis.com/v2/featured?${params}`
  );
  const data = await response.json();

  return {
    results: data.results?.map((item: any) => ({
      id: item.id,
      url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url,
      preview_url: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url,
      width: item.media_formats?.gif?.dims?.[0] || 200,
      height: item.media_formats?.gif?.dims?.[1] || 200,
      title: item.content_description,
    })) || [],
    next: data.next || '',
  };
}

async function searchGifs(
  apiKey: string,
  query: string,
  limit: number = 30,
  pos?: string
): Promise<{ results: GifItem[]; next: string }> {
  const params = new URLSearchParams({
    key: apiKey,
    client_key: 'faithflow_mobile',
    q: query,
    limit: limit.toString(),
    media_filter: 'gif,tinygif',
    ...(pos && { pos }),
  });

  const response = await fetch(
    `https://tenor.googleapis.com/v2/search?${params}`
  );
  const data = await response.json();

  return {
    results: data.results?.map((item: any) => ({
      id: item.id,
      url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url,
      preview_url: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url,
      width: item.media_formats?.gif?.dims?.[0] || 200,
      height: item.media_formats?.gif?.dims?.[1] || 200,
      title: item.content_description,
    })) || [],
    next: data.next || '',
  };
}

async function fetchCategoryGifs(
  apiKey: string,
  category: string,
  limit: number = 30,
  pos?: string
): Promise<{ results: GifItem[]; next: string }> {
  if (category === 'trending') {
    return fetchTrendingGifs(apiKey, limit, pos);
  }
  return searchGifs(apiKey, category, limit, pos);
}

// =============================================================================
// GIF GRID ITEM
// =============================================================================

interface GifGridItemProps {
  gif: GifItem;
  onPress: () => void;
  onLongPress: () => void;
  size: number;
}

function GifGridItem({ gif, onPress, onLongPress, size }: GifGridItemProps) {
  const aspectRatio = gif.width / gif.height;
  const itemHeight = size / aspectRatio;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      style={[styles.gifItem, { width: size, height: Math.min(itemHeight, size * 1.5) }]}
    >
      <Image
        source={{ uri: gif.preview_url }}
        style={styles.gifImage}
        contentFit="cover"
        transition={100}
      />
    </Pressable>
  );
}

// =============================================================================
// GIF PREVIEW MODAL
// =============================================================================

function GifPreviewModal({ gif, visible, onClose, onSend }: GifPreviewProps) {
  if (!visible || !gif) return null;

  return (
    <Pressable style={styles.previewOverlay} onPress={onClose}>
      <Pressable style={styles.previewContainer} onPress={(e) => e.stopPropagation()}>
        <Image
          source={{ uri: gif.url }}
          style={styles.previewImage}
          contentFit="contain"
        />
        <Pressable
          style={styles.sendButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSend();
          }}
        >
          <Text style={styles.sendButtonText}>Send GIF</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

// =============================================================================
// GIF PICKER SHEET
// =============================================================================

export function GifPickerSheet({
  visible,
  onClose,
  onGifSelect,
  tenorApiKey = DEFAULT_TENOR_KEY,
}: GifPickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [previewGif, setPreviewGif] = useState<GifItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch GIFs
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['gifs', debouncedQuery || selectedCategory],
    queryFn: async ({ pageParam }) => {
      if (debouncedQuery) {
        return searchGifs(tenorApiKey, debouncedQuery, 30, pageParam);
      }
      return fetchCategoryGifs(tenorApiKey, selectedCategory, 30, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.next || undefined,
    enabled: visible,
    initialPageParam: undefined as string | undefined,
  });

  const gifs = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) || [];
  }, [data]);

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

  const handleGifPress = useCallback(
    (gif: GifItem) => {
      onGifSelect(gif);
      onClose();
    },
    [onGifSelect, onClose]
  );

  const handleLongPress = useCallback((gif: GifItem) => {
    setPreviewGif(gif);
    setShowPreview(true);
  }, []);

  const handlePreviewSend = useCallback(() => {
    if (previewGif) {
      onGifSelect(previewGif);
      setShowPreview(false);
      setPreviewGif(null);
      onClose();
    }
  }, [previewGif, onGifSelect, onClose]);

  const renderGif = useCallback(
    ({ item, index }: { item: GifItem; index: number }) => (
      <GifGridItem
        gif={item}
        onPress={() => handleGifPress(item)}
        onLongPress={() => handleLongPress(item)}
        size={GIF_SIZE}
      />
    ),
    [handleGifPress, handleLongPress]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(categoryId);
    setSearchQuery('');
  }, []);

  return (
    <>
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
          <HStack className="justify-between items-center px-4 pb-2">
            <Heading size="lg" className="text-gray-900 font-bold">
              GIFs
            </Heading>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Icon as={X} size="md" style={{ color: colors.gray[500] }} />
            </Pressable>
          </HStack>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Icon as={Search} size="sm" style={{ color: colors.gray[400] }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search GIFs..."
              placeholderTextColor={colors.gray[400]}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Icon as={X} size="sm" style={{ color: colors.gray[400] }} />
              </Pressable>
            )}
          </View>

          {/* Categories */}
          {!searchQuery && (
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => handleCategoryChange(cat.id)}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                  >
                    <Icon
                      as={cat.icon}
                      size="xs"
                      style={{ color: isActive ? '#FFFFFF' : colors.gray[600] }}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        isActive && styles.categoryLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* GIF Grid */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading GIFs...</Text>
            </View>
          ) : isError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load GIFs</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  // Trigger refetch
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : gifs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No GIFs found</Text>
            </View>
          ) : (
            <FlashList
              data={gifs}
              renderItem={renderGif}
              keyExtractor={(item: GifItem) => item.id}
              numColumns={GIF_COLUMNS}
              estimatedItemSize={GIF_SIZE}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContent}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                  </View>
                ) : null
              }
            />
          )}

          {/* Powered by Tenor */}
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>Powered by Tenor</Text>
          </View>
        </View>
      </BottomSheet>

      {/* Preview Modal */}
      <GifPreviewModal
        gif={previewGif}
        visible={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewGif(null);
        }}
        onSend={handlePreviewSend}
      />
    </>
  );
}

// =============================================================================
// GIF BUTTON (to trigger picker)
// =============================================================================

interface GifButtonProps {
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function GifButton({ onPress, size = 'md' }: GifButtonProps) {
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.gifButton,
        pressed && styles.gifButtonPressed,
      ]}
    >
      <Text style={[styles.gifButtonText, { fontSize }]}>GIF</Text>
    </Pressable>
  );
}

// =============================================================================
// GIF MESSAGE DISPLAY
// =============================================================================

interface GifMessageProps {
  gif: GifItem;
  onPress?: () => void;
}

export function GifMessage({ gif, onPress }: GifMessageProps) {
  const aspectRatio = gif.width / gif.height;
  const maxWidth = SCREEN_WIDTH * 0.65;
  const displayWidth = Math.min(gif.width, maxWidth);
  const displayHeight = displayWidth / aspectRatio;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.gifMessage, { width: displayWidth, height: displayHeight }]}
    >
      <Image
        source={{ uri: gif.url }}
        style={styles.gifMessageImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.gifBadge}>
        <Text style={styles.gifBadgeText}>GIF</Text>
      </View>
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Sheet
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
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    marginLeft: 8,
    paddingVertical: 0,
  },

  // Categories
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  categoryChipActive: {
    backgroundColor: colors.primary[500],
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },

  // Grid
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  gifItem: {
    margin: 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },

  // Loading / Error / Empty
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: colors.gray[500],
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray[500],
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Preview
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  previewContainer: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    maxWidth: SCREEN_WIDTH * 0.9,
  },
  previewImage: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
  },
  sendButton: {
    backgroundColor: '#128C7E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Button
  gifButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  gifButtonPressed: {
    backgroundColor: colors.gray[200],
  },
  gifButtonText: {
    fontWeight: '700',
    color: colors.gray[600],
  },

  // Message
  gifMessage: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray[200],
  },
  gifMessageImage: {
    width: '100%',
    height: '100%',
  },
  gifBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Attribution
  attribution: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 11,
    color: colors.gray[400],
  },
});

export default GifPickerSheet;
