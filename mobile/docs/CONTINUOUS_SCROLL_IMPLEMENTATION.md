# Continuous Scroll Bible Reader - Implementation Documentation

## Overview

YouVersion-style infinite scroll Bible reader with automatic multi-chapter loading, seamless navigation across books, and memory optimization for smooth performance.

## Architecture

### Core Components

#### 1. ChapterStreamLoader (`/mobile/lib/ChapterStreamLoader.ts`)

**Purpose:** Manages dynamic multi-chapter loading and memory optimization.

**Key Features:**
- Loads current chapter + preloads 2 adjacent chapters (configurable)
- Dynamically loads more chapters when scrolling near top/bottom
- Memory optimization: keeps max 10 chapters in memory
- Removes chapters far from viewport automatically
- Flattens chapters into single array with chapter headers
- Supports cross-book navigation (Genesis → Exodus, etc.)

**API:**
```typescript
const loader = new ChapterStreamLoader({
  version: 'NIV',
  initialBook: 43,      // John
  initialChapter: 3,
  preloadCount: 2,      // Load 2 chapters ahead/behind
  maxLoadedChapters: 10 // Keep max 10 in memory
});

await loader.initialize();              // Load initial chapters
const items = loader.getFlattenedItems(); // Get all verses + headers
await loader.loadNextChapter();          // Load next chapter
await loader.loadPreviousChapter();      // Load previous chapter
loader.getCurrentChapterFromItem(item);  // Get chapter from scroll position
```

**Data Structure:**
```typescript
export type StreamItem = ChapterHeaderItem | VerseItem;

interface ChapterHeaderItem {
  type: 'chapter-header';
  id: string;
  bookNumber: number;
  bookName: string;
  chapter: number;
}

interface VerseItem extends BibleVerse {
  type: 'verse';
  id: string;
  bookName: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}
```

#### 2. ContinuousScrollReader (`/mobile/components/bible/ContinuousScrollReader.tsx`)

**Purpose:** React component that renders the continuous scroll experience using FlashList.

**Key Features:**
- FlashList with `getItemType` for chapter-header vs verse discrimination
- `onViewableItemsChanged` to detect current visible chapter
- Automatic chapter loading when near top (10%) or bottom (90%)
- Integrates with existing verse selection, highlights, bookmarks
- Moti animations for verse appearance
- Font customization support (Latin vs Chinese auto-detection)
- Responsive font sizing based on preferences

**Props:**
```typescript
interface ContinuousScrollReaderProps {
  version: BibleTranslation;
  initialBook: number;
  initialChapter: number;
  onChapterChange?: (book: number, chapter: number) => void;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
}
```

**Rendering Logic:**
1. Chapter headers: Large book name + chapter number
2. Verses: Text with optional verse numbers, highlights, selection state
3. Long press: Enter multi-verse selection mode
4. Single tap (while selecting): Toggle verse selection
5. Single tap (not selecting): Quick verse actions

### Integration Points

#### 3. bible.tsx (`/mobile/app/(tabs)/bible.tsx`)

**Modified Lines:** 26, 715-750

**Integration:**
```typescript
import { ContinuousScrollReader } from '@/components/bible/ContinuousScrollReader';

// Conditional rendering based on reading mode
{preferences.readingMode === 'scroll' || preferences.readingMode === 'continuous' ? (
  <ContinuousScrollReader
    version={version}
    initialBook={getBookNumber(currentBook) || 1}
    initialChapter={currentChapter}
    onChapterChange={(book, chapter) => {
      const bookName = books.find((b) => b.number === book)?.name || currentBook;
      setCurrentPosition(currentVersion, bookName, chapter);
    }}
    onScroll={handleScroll}
  />
) : (
  <ChapterReader ... /> // Paged mode
)}
```

#### 4. bibleStore.ts (`/mobile/stores/bibleStore.ts`)

**Modified:** ReadingMode type

```typescript
export type ReadingMode = 'scroll' | 'paged' | 'continuous';
```

Note: 'scroll' and 'continuous' are treated identically - both use ContinuousScrollReader.

#### 5. ReadingPreferencesModal.tsx (`/mobile/components/bible/ReadingPreferencesModal.tsx`)

**Modified:** Description text (lines 615, 660)

```typescript
// Scroll mode description
"Infinite scroll across chapters"

// Paged mode description
"Chapter-by-chapter with buttons"
```

## Features

### ✅ Implemented

1. **Infinite Scroll** - No page boundaries, continuous reading across chapters and books
2. **Multi-Chapter Loading** - Preloads 2 chapters ahead/behind for instant scrolling
3. **Automatic Chapter Detection** - Header updates to show current visible chapter
4. **Memory Optimization** - Keeps max 10 chapters loaded, removes distant ones
5. **Chapter Headers** - Visual separation between chapters with book name + number
6. **Verse Selection** - Long press to enter selection mode, tap to select multiple
7. **Highlights** - Displays existing highlights with colors
8. **Bookmarks** - Shows bookmark indicators on verses
9. **Font Customization** - Respects user font preferences (Latin/Chinese auto-detection)
10. **Reading Preferences** - Font size, line height, text alignment, word spacing, verse spacing
11. **Focus Mode** - Auto-hide header when enabled
12. **Red Letter Edition** - Highlight Jesus' words in red (if enabled)
13. **Performance** - FlashList with item type detection for smooth 60fps scrolling

### 🔄 Integrated Systems

- **bibleStore** - Preferences, highlights, bookmarks, verse selection
- **bibleFontStore** - Custom Latin fonts (11 options)
- **OptimizedBibleLoader** - Minified JSON data loading
- **Toast notifications** - Success/error feedback
- **Haptic feedback** - Tactile response for interactions

## Performance Optimizations

1. **FlashList** - Recycler view with minimal re-renders
2. **Item Type Detection** - Fast rendering with `getItemType`
3. **Memory Management** - Auto-cleanup of distant chapters
4. **Lazy Loading** - Only load chapters when needed
5. **Optimized Data Structure** - Minified JSON with fast lookups
6. **Memoized Callbacks** - Prevent unnecessary re-renders
7. **ViewToken Tracking** - Efficient visible item detection

## Testing Guide

### Manual Testing Checklist

#### Basic Functionality
- [ ] Open Bible tab
- [ ] Select "Scroll" mode in reading preferences
- [ ] Scroll down through verses
- [ ] Verify chapter header appears
- [ ] Verify next chapter loads automatically
- [ ] Scroll back up - previous chapter loads
- [ ] Header updates to show current visible chapter

#### Cross-Book Navigation
- [ ] Navigate to end of a book (e.g., John 21)
- [ ] Scroll down past last verse
- [ ] Verify next book loads (Acts 1)
- [ ] Scroll back up to Genesis 1
- [ ] Scroll up - should stop at first chapter

#### Memory Management
- [ ] Scroll through 15+ chapters continuously
- [ ] Check console for "🧹 Cleaned up X chapters from memory"
- [ ] Verify app remains responsive

#### Verse Selection
- [ ] Long press a verse - enters selection mode
- [ ] Tap another verse - adds to selection
- [ ] Tap selected verse - deselects
- [ ] Verify selection bar appears at bottom
- [ ] Test copy/share/highlight actions
- [ ] Exit selection mode - bar disappears

#### Highlights & Bookmarks
- [ ] Highlight a verse in continuous mode
- [ ] Navigate away and back
- [ ] Verify highlight persists
- [ ] Bookmark a verse
- [ ] Verify bookmark icon appears

#### Reading Preferences
- [ ] Change font size - verify immediate update
- [ ] Change line height - verify spacing
- [ ] Change font family - verify font updates
- [ ] Toggle verse numbers - verify show/hide
- [ ] Toggle red letter - verify Jesus' words in red
- [ ] Change theme - verify colors update
- [ ] Change text alignment - verify left/justify

#### Focus Mode
- [ ] Enable focus mode
- [ ] Start scrolling
- [ ] Verify header auto-hides after 2 seconds
- [ ] Tap screen - header reappears

#### Performance
- [ ] Scroll rapidly through multiple chapters
- [ ] Verify smooth 60fps performance
- [ ] No stuttering or lag
- [ ] FlashList recycling works correctly

#### Edge Cases
- [ ] Test with Chinese Bible (CHS) - system font only
- [ ] Test with Indonesian (TB)
- [ ] Test with very long chapters (Psalm 119)
- [ ] Test with very short chapters (Psalm 117)
- [ ] Test navigation between Old/New Testament

## Known Limitations

1. **Initial Load** - First chapter load may take 1-2 seconds (minified JSON parsing)
2. **Memory Cap** - Max 10 chapters loaded - older chapters auto-cleanup
3. **No Bi-Directional Infinite Scroll** - Loads one direction at a time
4. **Chapter Boundary Detection** - Uses 50% visibility threshold

## Future Enhancements

1. **Parallel Loading** - Load multiple chapters simultaneously
2. **Predictive Loading** - Load next chapter based on scroll velocity
3. **Smooth Chapter Transitions** - Animated chapter headers
4. **Chapter Progress Indicator** - Show reading progress within chapter
5. **Verse Range Selection** - Drag to select multiple verses
6. **Search Within Chapters** - Highlight search results in continuous scroll
7. **Reading Speed Analytics** - Track verses read per session
8. **Auto-Resume** - Resume at last read position

## File Structure

```
mobile/
├── lib/
│   └── ChapterStreamLoader.ts         (Core loading engine)
├── components/
│   └── bible/
│       ├── ContinuousScrollReader.tsx  (UI component)
│       └── ReadingPreferencesModal.tsx (Updated descriptions)
├── app/
│   └── (tabs)/
│       └── bible.tsx                   (Integration point)
├── stores/
│   └── bibleStore.ts                   (Updated ReadingMode type)
└── docs/
    └── CONTINUOUS_SCROLL_IMPLEMENTATION.md  (This file)
```

## Technical Decisions

### Why FlashList?
- 60fps performance with large lists
- Item type discrimination for mixed content
- Built-in recycling and virtualization
- Better than FlatList for Bible-sized content

### Why Item Type Detection?
- Allows different rendering for chapter headers vs verses
- Enables variable height items efficiently
- Improves FlashList recycling performance

### Why Memory Limit (10 chapters)?
- Balance between instant scrolling and memory usage
- Prevents loading entire Bible (~31,000 verses)
- Average chapter ~25 verses = ~250 verses in memory
- Sufficient for normal reading patterns

### Why Preload Count (2)?
- Users typically scroll forward more than backward
- 2 chapters ahead provides buffer for fast scrollers
- 2 chapters behind allows quick backtracking
- Total: 5 chapters loaded (current + 2 ahead + 2 behind)

### Why 50% Visibility Threshold?
- Detects chapter change when halfway through
- Prevents flickering between chapters
- Feels natural to users

### Why Separate ChapterStreamLoader?
- Separation of concerns (data vs UI)
- Testable without React components
- Reusable for future features (search, analytics)
- Easier to optimize independently

## Debugging

### Common Issues

**Issue:** Chapter not loading when scrolling
- **Solution:** Check console for "🧹 Cleaned up" messages - may be at memory limit
- **Check:** `streamLoaderRef.current?.getLoadedChapterCount()` should be ≤ 10

**Issue:** Wrong chapter shown in header
- **Solution:** Verify `onViewableItemsChanged` is firing
- **Check:** ViewToken threshold set to 50%

**Issue:** Verse selection not working
- **Solution:** Ensure `isSelecting` state from bibleStore
- **Check:** Long press triggers `enterSelectionMode()`

**Issue:** Highlights not showing
- **Solution:** Verify highlights are loaded from bibleStore
- **Check:** `getHighlight(version, book, chapter, verse)` returns color

### Debug Logging

Enable detailed logging by adding to ChapterStreamLoader:
```typescript
console.log('📊 Loaded chapters:', this.loadedChapters.size);
console.log('📍 Current range:', this.currentRange);
console.log('🎯 Loading chapter:', bookNumber, chapter);
```

## Support

For issues or questions:
1. Check console logs for errors
2. Verify all files are correctly saved
3. Restart Expo dev server: `npx expo start --clear`
4. Check this documentation for troubleshooting steps
