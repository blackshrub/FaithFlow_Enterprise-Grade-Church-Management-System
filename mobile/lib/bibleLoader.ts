/**
 * Bible Loader Utility
 *
 * Handles:
 * - Lazy loading of normalized Bible JSON files
 * - Indexing for fast lookups
 * - Memory-efficient chapter-level caching
 * - Non-blocking async loads
 */

import Fuse from 'fuse.js';
import type {
  NormalizedBible,
  BibleIndex,
  BibleVerse,
  BibleBook,
  BibleTranslation,
  BibleSearchResult,
} from '@/types/bible';

// Translation file mapping
const BIBLE_FILES: Record<BibleTranslation, string> = {
  NIV: require('@/assets/bible/normalized/niv.json'),
  ESV: require('@/assets/bible/normalized/esv.json'),
  NKJV: require('@/assets/bible/normalized/nkjv.json'),
  NLT: require('@/assets/bible/normalized/nlt.json'),
  TB: require('@/assets/bible/normalized/indo_tb.json'),
  CHS: require('@/assets/bible/normalized/chinese_union_simp.json'),
};

// ====================================================================
// BIBLE LOADER CLASS
// ====================================================================

export class BibleLoader {
  private bible: NormalizedBible | null = null;
  private index: BibleIndex | null = null;
  private searchIndex: Fuse<BibleVerse & { bookName: string }> | null = null;
  private translation: BibleTranslation;
  private loading: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor(translation: BibleTranslation) {
    this.translation = translation;
  }

  /**
   * Load Bible asynchronously
   * Returns cached promise if already loading
   */
  async load(): Promise<void> {
    if (this.bible) return; // Already loaded

    if (this.loadPromise) return this.loadPromise; // Loading in progress

    this.loading = true;
    this.loadPromise = this._loadBible();

    try {
      await this.loadPromise;
    } finally {
      this.loading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal Bible loading
   * Defers indexing to avoid blocking UI
   */
  private async _loadBible(): Promise<void> {
    console.log(`📖 Loading Bible: ${this.translation}...`);

    return new Promise((resolve, reject) => {
      try {
        // Load JSON synchronously (React Native requires)
        this.bible = BIBLE_FILES[this.translation] as unknown as NormalizedBible;

        console.log(
          `   ✅ Loaded ${this.bible.verses.length.toLocaleString()} verses`
        );

        // Build indexes asynchronously (non-blocking)
        setTimeout(() => {
          this._buildIndexes();
          resolve();
        }, 0);
      } catch (error) {
        console.error(`   ❌ Failed to load ${this.translation}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Build fast lookup indexes
   * Chapter-level and verse-level maps
   */
  private _buildIndexes(): void {
    if (!this.bible) return;

    console.log(`   ⚙️  Building indexes for ${this.translation}...`);

    const byChapter = new Map<number, Map<number, BibleVerse[]>>();
    const byVerse = new Map<number, Map<number, Map<number, string>>>();
    const booksByNumber = new Map<number, BibleBook>();
    const verseCounts = new Map<number, Map<number, number>>();

    // Index books
    this.bible.books.forEach((book) => {
      booksByNumber.set(book.number, book);
    });

    // Index verses
    this.bible.verses.forEach((verse) => {
      const { book, chapter, verse: verseNum, text } = verse;

      // By chapter (for FlashList rendering)
      if (!byChapter.has(book)) {
        byChapter.set(book, new Map());
      }
      if (!byChapter.get(book)!.has(chapter)) {
        byChapter.get(book)!.set(chapter, []);
      }
      byChapter.get(book)!.get(chapter)!.push(verse);

      // By verse (for single verse lookup)
      if (!byVerse.has(book)) {
        byVerse.set(book, new Map());
      }
      if (!byVerse.get(book)!.has(chapter)) {
        byVerse.get(book)!.set(chapter, new Map());
      }
      byVerse.get(book)!.get(chapter)!.set(verseNum, text);

      // Verse counts
      if (!verseCounts.has(book)) {
        verseCounts.set(book, new Map());
      }
      if (!verseCounts.get(book)!.has(chapter)) {
        verseCounts.get(book)!.set(chapter, 0);
      }
      verseCounts.get(book)!.set(chapter, verseCounts.get(book)!.get(chapter)! + 1);
    });

    this.index = {
      byChapter,
      byVerse,
      booksByNumber,
      verseCounts,
    };

    console.log(`   ✅ Indexes built`);
  }

  /**
   * Build search index (Fuse.js)
   * Called lazily when user opens search for the first time
   */
  buildSearchIndex(): void {
    if (this.searchIndex || !this.bible || !this.index) return;

    console.log(`   🔍 Building search index for ${this.translation}...`);

    const searchableVerses = this.bible.verses.map((v) => ({
      ...v,
      bookName: this.index!.booksByNumber.get(v.book)?.name || '',
    }));

    this.searchIndex = new Fuse(searchableVerses, {
      keys: ['text', 'bookName'],
      threshold: 0.3, // Fuzzy matching sensitivity (0 = exact, 1 = match anything)
      includeScore: true,
      useExtendedSearch: true,
      minMatchCharLength: 3, // Minimum 3 characters to search
    });

    console.log(`   ✅ Search index ready`);
  }

  /**
   * Get all books
   */
  getBooks(): BibleBook[] {
    if (!this.bible) throw new Error('Bible not loaded');
    return this.bible.books;
  }

  /**
   * Get a specific book
   */
  getBook(bookNumber: number): BibleBook | undefined {
    if (!this.index) throw new Error('Bible not loaded');
    return this.index.booksByNumber.get(bookNumber);
  }

  /**
   * Get all verses in a chapter (optimized for FlashList)
   */
  getChapter(bookNumber: number, chapterNumber: number): BibleVerse[] {
    if (!this.index) throw new Error('Bible not loaded');

    return this.index.byChapter.get(bookNumber)?.get(chapterNumber) || [];
  }

  /**
   * Get a single verse
   */
  getVerse(
    bookNumber: number,
    chapterNumber: number,
    verseNumber: number
  ): string | undefined {
    if (!this.index) throw new Error('Bible not loaded');

    return (
      this.index.byVerse
        .get(bookNumber)
        ?.get(chapterNumber)
        ?.get(verseNumber) || undefined
    );
  }

  /**
   * Get verse count for a chapter
   */
  getVerseCount(bookNumber: number, chapterNumber: number): number {
    if (!this.index) throw new Error('Bible not loaded');

    return this.index.verseCounts.get(bookNumber)?.get(chapterNumber) || 0;
  }

  /**
   * Search Bible verses
   * Returns up to `limit` results
   */
  search(query: string, limit: number = 50): BibleSearchResult[] {
    if (!this.searchIndex) {
      this.buildSearchIndex(); // Lazy build
    }

    if (!this.searchIndex || !this.index) return [];

    const results = this.searchIndex.search(query, { limit });

    return results.map((result) => ({
      book: result.item.book,
      bookName: result.item.bookName,
      chapter: result.item.chapter,
      verse: result.item.verse,
      text: result.item.text,
      score: result.score || 0,
    }));
  }

  /**
   * Get Bible metadata
   */
  getMetadata() {
    if (!this.bible) throw new Error('Bible not loaded');
    return this.bible.metadata;
  }

  /**
   * Check if Bible is loaded
   */
  isLoaded(): boolean {
    return this.bible !== null && this.index !== null;
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Unload Bible from memory
   */
  unload(): void {
    this.bible = null;
    this.index = null;
    this.searchIndex = null;
  }
}

// ====================================================================
// SINGLETON LOADER CACHE
// ====================================================================

const loaderCache = new Map<BibleTranslation, BibleLoader>();

/**
 * Get or create a Bible loader
 * Uses singleton pattern to avoid loading same Bible twice
 */
export function getBibleLoader(translation: BibleTranslation): BibleLoader {
  if (!loaderCache.has(translation)) {
    loaderCache.set(translation, new BibleLoader(translation));
  }

  return loaderCache.get(translation)!;
}

/**
 * Preload a Bible translation in the background
 * Non-blocking, useful for preloading user's preferred translations
 */
export async function preloadBible(translation: BibleTranslation): Promise<void> {
  const loader = getBibleLoader(translation);
  if (loader.isLoaded()) return;

  try {
    await loader.load();
  } catch (error) {
    console.error(`Failed to preload ${translation}:`, error);
  }
}

/**
 * Unload a Bible from memory (for memory optimization)
 */
export function unloadBible(translation: BibleTranslation): void {
  const loader = loaderCache.get(translation);
  if (loader) {
    loader.unload();
    loaderCache.delete(translation);
  }
}
