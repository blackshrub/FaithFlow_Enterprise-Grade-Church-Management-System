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
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Bookmark {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
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

export interface BiblePreferences {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  theme: 'light' | 'dark' | 'sepia';
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

  // Actions
  setCurrentPosition: (version: string, book: string, chapter: number) => void;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  removeHighlight: (id: string) => void;
  updatePreferences: (preferences: Partial<BiblePreferences>) => void;
  addToHistory: (version: string, book: string, chapter: number) => void;

  // Helpers
  getBookmark: (version: string, book: string, chapter: number, verse: number) => Bookmark | undefined;
  getHighlight: (version: string, book: string, chapter: number, verse: number) => Highlight | undefined;
  getLastReading: () => ReadingHistory | undefined;
}

export const useBibleStore = create<BibleState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentVersion: 'TB', // Terjemahan Baru (Indonesian)
      currentBook: 'Genesis',
      currentChapter: 1,
      bookmarks: [],
      highlights: [],
      readingHistory: [],
      preferences: {
        fontSize: 'medium',
        lineHeight: 'normal',
        theme: 'light',
      },

      // Set current reading position
      setCurrentPosition: (version, book, chapter) => {
        set({ currentVersion: version, currentBook: book, currentChapter: chapter });
        get().addToHistory(version, book, chapter);
      },

      // Bookmark management
      addBookmark: (bookmark) => {
        const newBookmark: Bookmark = {
          ...bookmark,
          id: `${bookmark.version}-${bookmark.book}-${bookmark.chapter}-${bookmark.verse}-${Date.now()}`,
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
            b.verse === verse
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
    }),
    {
      name: 'bible-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
