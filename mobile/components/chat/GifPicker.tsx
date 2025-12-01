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
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Pressable,
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

import { Text } from 'react-native';
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
      className="m-1 rounded-lg overflow-hidden bg-gray-100"
      style={{ width: size, height: Math.min(itemHeight, size * 1.5) }}
    >
      <Image
        source={{ uri: gif.preview_url }}
        className="w-full h-full"
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
    <Pressable
      className="absolute inset-0 bg-black/80 justify-center items-center z-[1000]"
      onPress={onClose}
    >
      <Pressable
        className="bg-black rounded-xl overflow-hidden"
        style={{ maxWidth: SCREEN_WIDTH * 0.9 }}
        onPress={(e) => e.stopPropagation()}
      >
        <Image
          source={{ uri: gif.url }}
          style={{ width: SCREEN_WIDTH * 0.85, height: SCREEN_WIDTH * 0.85 }}
          contentFit="contain"
        />
        <Pressable
          className="bg-[#128C7E] py-3.5 items-center"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSend();
          }}
        >
          <Text className="text-base font-semibold text-white">Send GIF</Text>
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

  // Don't render when not visible
  if (!visible) return null;

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 pb-2">
            <Text className="text-xl font-bold text-gray-900">GIFs</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <X size={24} color={colors.gray[500]} />
            </Pressable>
          </View>

          {/* Search */}
          <View className="flex-row items-center mx-4 my-3 px-3 py-2.5 bg-gray-100 rounded-lg">
            <Search size={18} color={colors.gray[400]} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search GIFs..."
              placeholderTextColor={colors.gray[400]}
              className="flex-1 text-base text-gray-900 ml-2 py-0"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.gray[400]} />
              </Pressable>
            )}
          </View>

          {/* Categories */}
          {!searchQuery && (
            <View className="flex-row flex-wrap px-4 pb-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => handleCategoryChange(cat.id)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full ${
                      isActive ? 'bg-blue-500' : 'bg-gray-100'
                    }`}
                  >
                    <IconComponent
                      size={14}
                      color={isActive ? '#FFFFFF' : colors.gray[600]}
                    />
                    <Text
                      className={`text-xs ml-1 font-medium ${
                        isActive ? 'text-white' : 'text-gray-600'
                      }`}
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
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text className="text-sm text-gray-500 mt-3">Loading GIFs...</Text>
            </View>
          ) : isError ? (
            <View className="flex-1 items-center justify-center py-10">
              <Text className="text-sm text-gray-500">Failed to load GIFs</Text>
              <Pressable className="mt-3 px-4 py-2 bg-blue-500 rounded-lg">
                <Text className="text-sm text-white font-medium">Retry</Text>
              </Pressable>
            </View>
          ) : gifs.length === 0 ? (
            <View className="flex-1 items-center justify-center py-10">
              <Text className="text-sm text-gray-500">No GIFs found</Text>
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
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View className="py-5 items-center">
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                  </View>
                ) : null
              }
            />
          )}

          {/* Powered by Tenor */}
          <View className="absolute bottom-0 left-0 right-0 py-2 bg-white border-t border-gray-100 items-center">
            <Text className="text-[11px] text-gray-400">Powered by Tenor</Text>
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
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-1';

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`${padding} rounded-md active:opacity-70`}
      style={{ backgroundColor: '#E8E8E8' }}
    >
      <Text className="font-bold" style={{ fontSize, color: '#54656F' }}>GIF</Text>
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
      className="rounded-xl overflow-hidden bg-gray-200"
      style={{ width: displayWidth, height: displayHeight }}
    >
      <Image
        source={{ uri: gif.url }}
        className="w-full h-full"
        contentFit="cover"
        transition={200}
      />
      <View className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded">
        <Text className="text-[10px] font-bold text-white">GIF</Text>
      </View>
    </Pressable>
  );
}

export default GifPickerSheet;
