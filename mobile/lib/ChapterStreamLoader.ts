/**
 * Chapter Stream Loader
 *
 * Manages continuous multi-chapter loading for infinite scroll Bible reading.
 * - Loads current, previous, and next chapters
 * - Dynamically appends chapters when scrolling near boundaries
 * - Removes chapters far from viewport (memory optimization)
 * - Flattens chapters into single list with headers
 */

import { getBibleLoader, type BibleVerse } from '@/lib/bibleLoaderOptimized';
import type { BibleTranslation } from '@/types/bible';

export type StreamItemType = 'chapter-header' | 'verse';

export interface ChapterHeaderItem {
  type: 'chapter-header';
  id: string;
  bookNumber: number;
  bookName: string;
  chapter: number;
}

export interface VerseItem extends BibleVerse {
  type: 'verse';
  id: string;
  bookName: string;
}

export type StreamItem = ChapterHeaderItem | VerseItem;

interface ChapterRange {
  bookNumber: number;
  startChapter: number;
  endChapter: number;
}

interface StreamConfig {
  version: BibleTranslation;
  initialBook: number;
  initialChapter: number;
  preloadCount?: number; // How many chapters to preload ahead/behind (default: 2)
  maxLoadedChapters?: number; // Max chapters to keep in memory (default: 10)
}

export class ChapterStreamLoader {
  private config: StreamConfig;
  private loadedChapters: Map<string, StreamItem[]> = new Map();
  private currentRange: ChapterRange;
  private bookChapterCounts: Map<number, number> = new Map();
  private bookNames: Map<number, string> = new Map();

  constructor(config: StreamConfig) {
    this.config = {
      preloadCount: 2,
      maxLoadedChapters: 10,
      ...config,
    };

    this.currentRange = {
      bookNumber: config.initialBook,
      startChapter: config.initialChapter,
      endChapter: config.initialChapter,
    };
  }

  /**
   * Initialize loader - load book metadata and initial chapters
   */
  async initialize(): Promise<StreamItem[]> {
    const loader = getBibleLoader(this.config.version);

    // Ensure Bible is loaded
    if (!loader.isLoaded()) {
      await loader.load();
    }

    // Cache book metadata
    const books = loader.getBooks();
    books.forEach((book) => {
      this.bookChapterCounts.set(book.number, book.chapters);
      this.bookNames.set(book.number, book.name);
    });

    // Load initial chapter + preload adjacent chapters
    return this.loadInitialChapters();
  }

  /**
   * Load initial chapters (current + preload ahead/behind)
   */
  private async loadInitialChapters(): Promise<StreamItem[]> {
    const { initialBook, initialChapter, preloadCount } = this.config;
    const totalChapters = this.bookChapterCounts.get(initialBook) || 1;

    const startChapter = Math.max(1, initialChapter - preloadCount!);
    const endChapter = Math.min(totalChapters, initialChapter + preloadCount!);

    // Load chapters in range
    for (let ch = startChapter; ch <= endChapter; ch++) {
      await this.loadChapter(initialBook, ch);
    }

    this.currentRange = {
      bookNumber: initialBook,
      startChapter,
      endChapter,
    };

    return this.getFlattenedItems();
  }

  /**
   * Load a single chapter and convert to stream items
   */
  private async loadChapter(bookNumber: number, chapter: number): Promise<void> {
    const key = `${bookNumber}-${chapter}`;

    // Skip if already loaded
    if (this.loadedChapters.has(key)) {
      return;
    }

    const loader = getBibleLoader(this.config.version);
    const verses = loader.getChapter(bookNumber, chapter);
    const bookName = this.bookNames.get(bookNumber) || `Book ${bookNumber}`;

    if (verses.length === 0) {
      return;
    }

    const items: StreamItem[] = [];

    // Add chapter header
    items.push({
      type: 'chapter-header',
      id: `header-${key}`,
      bookNumber,
      bookName,
      chapter,
    });

    // Add verses
    verses.forEach((verse) => {
      items.push({
        ...verse,
        type: 'verse',
        id: `verse-${bookNumber}-${chapter}-${verse.verse}`,
        bookName,
      });
    });

    this.loadedChapters.set(key, items);
  }

  /**
   * Get flattened list of all loaded items (for FlashList)
   */
  getFlattenedItems(): StreamItem[] {
    const items: StreamItem[] = [];

    // Sort chapters by book and chapter number
    const sortedKeys = Array.from(this.loadedChapters.keys()).sort((a, b) => {
      const [bookA, chapterA] = a.split('-').map(Number);
      const [bookB, chapterB] = b.split('-').map(Number);

      if (bookA !== bookB) return bookA - bookB;
      return chapterA - chapterB;
    });

    // Flatten in order
    sortedKeys.forEach((key) => {
      const chapterItems = this.loadedChapters.get(key);
      if (chapterItems) {
        items.push(...chapterItems);
      }
    });

    return items;
  }

  /**
   * Load next chapter (called when scrolling near bottom)
   */
  async loadNextChapter(): Promise<StreamItem[]> {
    const { bookNumber, endChapter } = this.currentRange;
    const totalChapters = this.bookChapterCounts.get(bookNumber) || 1;

    // Check if we can load next chapter
    if (endChapter < totalChapters) {
      // Load next chapter in same book
      await this.loadChapter(bookNumber, endChapter + 1);
      this.currentRange.endChapter = endChapter + 1;
    } else {
      // Try next book
      const nextBook = bookNumber + 1;
      const nextBookChapters = this.bookChapterCounts.get(nextBook);

      if (nextBookChapters && nextBookChapters > 0) {
        await this.loadChapter(nextBook, 1);
        this.currentRange.bookNumber = nextBook;
        this.currentRange.startChapter = 1;
        this.currentRange.endChapter = 1;
      }
    }

    // Cleanup old chapters if too many loaded
    this.cleanupOldChapters();

    return this.getFlattenedItems();
  }

  /**
   * Load previous chapter (called when scrolling near top)
   */
  async loadPreviousChapter(): Promise<StreamItem[]> {
    const { bookNumber, startChapter } = this.currentRange;

    // Check if we can load previous chapter
    if (startChapter > 1) {
      // Load previous chapter in same book
      await this.loadChapter(bookNumber, startChapter - 1);
      this.currentRange.startChapter = startChapter - 1;
    } else {
      // Try previous book
      const prevBook = bookNumber - 1;
      const prevBookChapters = this.bookChapterCounts.get(prevBook);

      if (prevBookChapters && prevBookChapters > 0) {
        await this.loadChapter(prevBook, prevBookChapters);
        this.currentRange.bookNumber = prevBook;
        this.currentRange.startChapter = prevBookChapters;
        this.currentRange.endChapter = prevBookChapters;
      }
    }

    // Cleanup old chapters if too many loaded
    this.cleanupOldChapters();

    return this.getFlattenedItems();
  }

  /**
   * Remove chapters far from current viewport (memory optimization)
   */
  private cleanupOldChapters(): void {
    const { maxLoadedChapters } = this.config;

    if (this.loadedChapters.size <= maxLoadedChapters!) {
      return;
    }

    // Sort keys by distance from current chapter
    const currentKey = `${this.currentRange.bookNumber}-${this.currentRange.startChapter}`;
    const [currentBook, currentChapter] = currentKey.split('-').map(Number);

    const sortedKeys = Array.from(this.loadedChapters.keys()).sort((a, b) => {
      const [bookA, chapterA] = a.split('-').map(Number);
      const [bookB, chapterB] = b.split('-').map(Number);

      // Calculate distance from current chapter
      const distanceA = Math.abs(bookA - currentBook) * 1000 + Math.abs(chapterA - currentChapter);
      const distanceB = Math.abs(bookB - currentBook) * 1000 + Math.abs(chapterB - currentChapter);

      return distanceB - distanceA; // Sort by descending distance
    });

    // Remove furthest chapters
    const toRemove = sortedKeys.slice(0, this.loadedChapters.size - maxLoadedChapters!);
    toRemove.forEach((key) => this.loadedChapters.delete(key));

    console.log(`🧹 Cleaned up ${toRemove.length} chapters from memory`);
  }

  /**
   * Get current visible chapter from scroll position
   * Used to update header with current chapter
   */
  getCurrentChapterFromItem(item: StreamItem | undefined): { book: number; chapter: number } | null {
    if (!item) return null;

    if (item.type === 'chapter-header') {
      return { book: item.bookNumber, chapter: item.chapter };
    } else {
      return { book: item.book, chapter: item.chapter };
    }
  }

  /**
   * Find item index by book/chapter/verse (for jump-to-verse)
   */
  findItemIndex(book: number, chapter: number, verse?: number): number {
    const items = this.getFlattenedItems();

    if (verse !== undefined) {
      // Find specific verse
      return items.findIndex(
        (item) =>
          item.type === 'verse' &&
          item.book === book &&
          item.chapter === chapter &&
          item.verse === verse
      );
    } else {
      // Find chapter header
      return items.findIndex(
        (item) =>
          item.type === 'chapter-header' &&
          item.bookNumber === book &&
          item.chapter === chapter
      );
    }
  }

  /**
   * Reset loader to a new position
   */
  async reset(book: number, chapter: number): Promise<StreamItem[]> {
    this.loadedChapters.clear();
    this.currentRange = {
      bookNumber: book,
      startChapter: chapter,
      endChapter: chapter,
    };

    this.config.initialBook = book;
    this.config.initialChapter = chapter;

    return this.loadInitialChapters();
  }

  /**
   * Get total loaded chapter count
   */
  getLoadedChapterCount(): number {
    return this.loadedChapters.size;
  }
}
