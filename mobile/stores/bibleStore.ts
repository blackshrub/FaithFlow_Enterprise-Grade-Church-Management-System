/**
 * Bible Reading State Store
 *
 * Manages:
 * - Current reading position
 * - Bookmarks
 * - Highlights
 * - Reading history
 * - Font size preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

export interface Bookmark {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;        // Start verse (for backward compatibility)
  endVerse?: number;    // End verse (for backward compatibility)
  verses?: number[];    // Array of verse numbers for non-consecutive selections (e.g., [1, 2, 5])
  note?: string;
  createdAt: string;
}

export interface Highlight {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  createdAt: string;
}

export interface ReadingHistory {
  version: string;
  book: string;
  chapter: number;
  lastReadAt: string;
}

/**
 * Verse reference for selection tracking
 * Consistent with our existing book/chapter/verse structure
 */
export interface VerseRef {
  version: string;
  book: string;
  chapter: number;
  verse: number;
}

export type LineHeightType = 'compact' | 'normal' | 'relaxed';
export type ThemeType = 'light' | 'light2' | 'light3' | 'light4' | 'dark' | 'dark2' | 'dark3' | 'sepia';
export type FontFamily =
  | 'System'
  | 'Serif'
  | 'Monospace';
export type TextAlign = 'left' | 'justify';
export type WordSpacing = 'normal' | 'wide' | 'wider';
export type ReadingMode = 'scroll' | 'paged' | 'continuous';
export type VerseSpacing = 'none' | 'small' | 'large';

export interface BiblePreferences {
  fontSize: number; // 10-24
  lineHeight: LineHeightType;
  theme: ThemeType;
  fontFamily: FontFamily;
  // Advanced typography options
  textAlign: TextAlign;
  wordSpacing: WordSpacing;
  verseSpacing: VerseSpacing;
  showVerseNumbers: boolean;
  // Reading mode
  readingMode: ReadingMode; // 'scroll' for continuous scrolling, 'paged' for swipe navigation
  focusMode: boolean; // Auto-hide header and tab bar for distraction-free reading
  // Navigation
  showVerseSelector: boolean; // Show verse selector in book/chapter navigation
}

interface BibleState {
  // Current reading position
  currentVersion: string;
  currentBook: string;
  currentChapter: number;

  // Collections
  bookmarks: Bookmark[];
  highlights: Highlight[];
  readingHistory: ReadingHistory[];

  // Preferences
  preferences: BiblePreferences;

  // Verse Selection (YouVersion-style multi-select)
  isSelecting: boolean;
  selectedVerses: VerseRef[];

  // Flash Highlights (temporary highlights for bookmark navigation, 3 seconds)
  flashHighlights: VerseRef[];

  // Actions
  setCurrentPosition: (version: string, book: string, chapter: number) => void;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  removeHighlight: (id: string) => void;
  updatePreferences: (preferences: Partial<BiblePreferences>) => void;
  addToHistory: (version: string, book: string, chapter: number) => void;

  // Verse Selection Actions
  enterSelectionMode: (verse: VerseRef) => void;
  toggleVerseSelection: (verse: VerseRef) => void;
  clearSelection: () => void;
  isVerseSelected: (verse: VerseRef) => boolean;

  // Flash Highlight Actions
  setFlashHighlights: (verses: VerseRef[]) => void;
  clearFlashHighlights: () => void;

  // Helpers
  getBookmark: (version: string, book: string, chapter: number, verse: number) => Bookmark | undefined;
  getHighlight: (version: string, book: string, chapter: number, verse: number) => Highlight | undefined;
  getLastReading: () => ReadingHistory | undefined;
}

// Migration helper to convert old string-based font sizes to numbers
const migrateFontSize = (oldSize: any): number => {
  if (typeof oldSize === 'number') return oldSize;
  const sizeMap: Record<string, number> = {
    small: 16,
    medium: 18,
    large: 20,
    xlarge: 24,
  };
  return sizeMap[oldSize as string] || 18;
};

// Helper to compare verse refs (exported for use in components)
export const isSameVerse = (a: VerseRef, b: VerseRef): boolean => {
  return (
    a.version === b.version &&
    a.book === b.book &&
    a.chapter === b.chapter &&
    a.verse === b.verse
  );
};

export const useBibleStore = create<BibleState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentVersion: 'TB', // Terjemahan Baru (Indonesian)
      currentBook: 'Kejadian', // Genesis in Indonesian
      currentChapter: 1,
      bookmarks: [],
      highlights: [],
      readingHistory: [],
      preferences: {
        fontSize: 18,
        lineHeight: 'normal',
        theme: 'light',
        fontFamily: 'System',
        textAlign: 'left',
        wordSpacing: 'normal',
        verseSpacing: 'small',
        showVerseNumbers: true,
        readingMode: 'scroll',
        focusMode: false,
        showVerseSelector: true,
      },
      // Verse selection initial state
      isSelecting: false,
      selectedVerses: [],
      // Flash highlights initial state (transient)
      flashHighlights: [],

      // Set current reading position
      setCurrentPosition: (version, book, chapter) => {
        set({ currentVersion: version, currentBook: book, currentChapter: chapter });
        get().addToHistory(version, book, chapter);
      },

      // Bookmark management
      addBookmark: (bookmark) => {
        const verseRange = bookmark.endVerse
          ? `${bookmark.verse}-${bookmark.endVerse}`
          : `${bookmark.verse}`;
        const newBookmark: Bookmark = {
          ...bookmark,
          id: `${bookmark.version}-${bookmark.book}-${bookmark.chapter}-${verseRange}-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          bookmarks: [...state.bookmarks, newBookmark],
        }));
      },

      removeBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      // Highlight management
      addHighlight: (highlight) => {
        const newHighlight: Highlight = {
          ...highlight,
          id: `${highlight.version}-${highlight.book}-${highlight.chapter}-${highlight.verse}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          highlights: [
            ...state.highlights.filter((h) => h.id !== newHighlight.id),
            newHighlight,
          ],
        }));
      },

      removeHighlight: (id) => {
        set((state) => ({
          highlights: state.highlights.filter((h) => h.id !== id),
        }));
      },

      // Preferences
      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },

      // Reading history
      addToHistory: (version, book, chapter) => {
        const historyItem: ReadingHistory = {
          version,
          book,
          chapter,
          lastReadAt: new Date().toISOString(),
        };

        set((state) => {
          const filtered = state.readingHistory.filter(
            (h) => !(h.version === version && h.book === book && h.chapter === chapter)
          );
          return {
            readingHistory: [historyItem, ...filtered].slice(0, 50), // Keep last 50
          };
        });
      },

      // Helpers
      getBookmark: (version, book, chapter, verse) => {
        return get().bookmarks.find(
          (b) =>
            b.version === version &&
            b.book === book &&
            b.chapter === chapter &&
            // Check if verse is within the bookmark range
            (b.endVerse
              ? verse >= b.verse && verse <= b.endVerse  // Range: verse is between start and end
              : verse === b.verse)                       // Single verse: exact match
        );
      },

      getHighlight: (version, book, chapter, verse) => {
        return get().highlights.find(
          (h) =>
            h.version === version &&
            h.book === book &&
            h.chapter === chapter &&
            h.verse === verse
        );
      },

      getLastReading: () => {
        return get().readingHistory[0];
      },

      // Verse Selection Actions (YouVersion-style multi-select)

      /**
       * Enter selection mode with initial verse
       * Called when user taps a verse for the first time
       */
      enterSelectionMode: (verse: VerseRef) => {
        set({
          isSelecting: true,
          selectedVerses: [verse],
        });
      },

      /**
       * Toggle verse selection
       * If verse is already selected -> remove it
       * If verse is not selected -> add it
       * If selection becomes empty -> exit selection mode automatically
       */
      toggleVerseSelection: (verse: VerseRef) => {
        const { selectedVerses } = get();
        const isSelected = selectedVerses.some(v => isSameVerse(v, verse));

        if (isSelected) {
          // Remove from selection
          const newSelection = selectedVerses.filter(v => !isSameVerse(v, verse));

          // Exit selection mode if no verses left
          if (newSelection.length === 0) {
            set({ isSelecting: false, selectedVerses: [] });
          } else {
            set({ selectedVerses: newSelection });
          }
        } else {
          // Add to selection
          set({ selectedVerses: [...selectedVerses, verse] });
        }
      },

      /**
       * Clear all selected verses and exit selection mode
       * Called when user taps "Done" or after performing an action
       */
      clearSelection: () => {
        set({ isSelecting: false, selectedVerses: [] });
      },

      /**
       * Check if a specific verse is selected
       */
      isVerseSelected: (verse: VerseRef) => {
        return get().selectedVerses.some(v => isSameVerse(v, verse));
      },

      // Flash Highlight Actions (for bookmark navigation feedback)

      /**
       * Set flash highlights for temporary verse highlighting (3 seconds)
       * Used when navigating from bookmarks to show which verses were bookmarked
       */
      setFlashHighlights: (verses: VerseRef[]) => {
        set({ flashHighlights: verses });
      },

      /**
       * Clear flash highlights
       */
      clearFlashHighlights: () => {
        set({ flashHighlights: [] });
      },
    }),
    {
      name: 'bible-storage',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Migrate old string-based fontSize to number
        if (persistedState?.preferences?.fontSize) {
          persistedState.preferences.fontSize = migrateFontSize(
            persistedState.preferences.fontSize
          );
        }
        // Add fontFamily if missing
        if (!persistedState?.preferences?.fontFamily) {
          persistedState.preferences.fontFamily = 'System';
        }
        // Add advanced typography options if missing
        if (persistedState?.preferences) {
          if (persistedState.preferences.textAlign === undefined) {
            persistedState.preferences.textAlign = 'left';
          }
          if (persistedState.preferences.wordSpacing === undefined) {
            persistedState.preferences.wordSpacing = 'normal';
          }
          if (persistedState.preferences.verseSpacing === undefined) {
            persistedState.preferences.verseSpacing = 'small';
          }
          if (persistedState.preferences.showVerseNumbers === undefined) {
            persistedState.preferences.showVerseNumbers = true;
          }
          if (persistedState.preferences.readingMode === undefined) {
            persistedState.preferences.readingMode = 'scroll';
          }
          if (persistedState.preferences.showVerseSelector === undefined) {
            persistedState.preferences.showVerseSelector = true;
          }
        }
        return persistedState;
      },
      // Don't persist selection state - it's transient
      partialize: (state) => ({
        currentVersion: state.currentVersion,
        currentBook: state.currentBook,
        currentChapter: state.currentChapter,
        bookmarks: state.bookmarks,
        highlights: state.highlights,
        readingHistory: state.readingHistory,
        preferences: state.preferences,
        // Exclude: isSelecting, selectedVerses, flashHighlights (transient UI state)
      }),
    }
  )
);
