/**
 * Optimized Bible Loader
 *
 * Loads minified Bible JSON from build-time pipeline.
 * Uses pre-built search indexes for instant offline search.
 *
 * Minified schema:
 * - bb: books array
 * - b: book number
 * - n: book name
 * - cc: chapters array
 * - c: chapter number
 * - vv: verses array
 * - v: verse number
 * - t: verse text
 */

import type { BibleTranslation } from '@/types/bible';

// ====================================================================
// MINIFIED TYPES
// ====================================================================

interface MinVerse {
  v: number; // verse number
  t: string; // text
}

interface MinChapter {
  c: number; // chapter number
  vv: MinVerse[]; // verses
}

interface MinBook {
  b: number; // book number
  n: string; // name
  cc: MinChapter[]; // chapters
}

interface MinBible {
  v: string; // version code
  name: string; // full name
  lang: string; // language code
  bb: MinBook[]; // books
}

interface SearchIndex {
  entries: Array<{
    b: number;
    c: number;
    v: number;
    t: string;
  }>;
}

// ====================================================================
// EXPANDED TYPES (for API compatibility)
// ====================================================================

export interface BibleVerse {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBook {
  number: number;
  name: string;
  chapters: number;
}

export interface BibleSearchResult {
  book: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  score: number;
}

// ====================================================================
// FILE MAPPING
// ====================================================================

const BIBLE_FILES: Record<BibleTranslation, any> = {
  NIV: require('@/assets/bible-optimized/niv.json'),
  ESV: require('@/assets/bible-optimized/esv.json'),
  NKJV: require('@/assets/bible-optimized/nkjv.json'),
  NLT: require('@/assets/bible-optimized/nlt.json'),
  TB: require('@/assets/bible-optimized/tb.json'),
  CHS: require('@/assets/bible-optimized/chs.json'),
};

const SEARCH_INDEXES: Record<BibleTranslation, any> = {
  NIV: require('@/assets/bible-index/niv.idx.json'),
  ESV: require('@/assets/bible-index/esv.idx.json'),
  NKJV: require('@/assets/bible-index/nkjv.idx.json'),
  NLT: require('@/assets/bible-index/nlt.idx.json'),
  TB: require('@/assets/bible-index/tb.idx.json'),
  CHS: require('@/assets/bible-index/chs.idx.json'),
};

// ====================================================================
// OPTIMIZED BIBLE LOADER CLASS
// ====================================================================

export class OptimizedBibleLoader {
  private bible: MinBible | null = null;
  private searchIndex: SearchIndex | null = null;
  private bookMap: Map<number, MinBook> | null = null;
  private chapterMap: Map<string, MinChapter> | null = null; // "b-c" -> chapter
  private translation: BibleTranslation;
  private loading: boolean = false;

  constructor(translation: BibleTranslation) {
    this.translation = translation;
  }

  /**
   * Load Bible + build indexes
   */
  async load(): Promise<void> {
    if (this.bible) return; // Already loaded

    if (this.loading) {
      // Wait for existing load
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return;
    }

    this.loading = true;

    try {
      console.log(`📖 Loading ${this.translation}...`);

      // Load minified Bible (React Native requires synchronous)
      this.bible = BIBLE_FILES[this.translation] as MinBible;

      // Build indexes (fast with minified format)
      this._buildIndexes();

      console.log(`   ✅ Loaded ${this.translation}`);
    } catch (error) {
      console.error(`   ❌ Failed to load ${this.translation}:`, error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Build fast lookup maps
   */
  private _buildIndexes(): void {
    if (!this.bible) return;

    this.bookMap = new Map();
    this.chapterMap = new Map();

    for (const book of this.bible.bb) {
      this.bookMap.set(book.b, book);

      for (const chapter of book.cc) {
        const key = `${book.b}-${chapter.c}`;
        this.chapterMap.set(key, chapter);
      }
    }
  }

  /**
   * Load search index (lazy, only when needed)
   */
  private _loadSearchIndex(): void {
    if (this.searchIndex) return;

    console.log(`   🔍 Loading search index for ${this.translation}...`);
    this.searchIndex = SEARCH_INDEXES[this.translation] as SearchIndex;
    console.log(`   ✅ Search index ready`);
  }

  /**
   * Get all books
   */
  getBooks(): BibleBook[] {
    if (!this.bible) throw new Error('Bible not loaded');

    return this.bible.bb.map((book) => ({
      number: book.b,
      name: book.n,
      chapters: book.cc.length,
    }));
  }

  /**
   * Get a specific book
   */
  getBook(bookNumber: number): BibleBook | undefined {
    if (!this.bookMap) throw new Error('Bible not loaded');

    const book = this.bookMap.get(bookNumber);
    if (!book) return undefined;

    return {
      number: book.b,
      name: book.n,
      chapters: book.cc.length,
    };
  }

  /**
   * Get all verses in a chapter (for FlashList)
   */
  getChapter(bookNumber: number, chapterNumber: number): BibleVerse[] {
    if (!this.chapterMap) throw new Error('Bible not loaded');

    const key = `${bookNumber}-${chapterNumber}`;
    const chapter = this.chapterMap.get(key);

    if (!chapter) return [];

    return chapter.vv.map((verse) => ({
      book: bookNumber,
      chapter: chapterNumber,
      verse: verse.v,
      text: verse.t,
    }));
  }

  /**
   * Get a single verse
   */
  getVerse(
    bookNumber: number,
    chapterNumber: number,
    verseNumber: number
  ): string | undefined {
    if (!this.chapterMap) throw new Error('Bible not loaded');

    const key = `${bookNumber}-${chapterNumber}`;
    const chapter = this.chapterMap.get(key);

    if (!chapter) return undefined;

    const verse = chapter.vv.find((v) => v.v === verseNumber);
    return verse?.t;
  }

  /**
   * Get verse count for a chapter
   */
  getVerseCount(bookNumber: number, chapterNumber: number): number {
    if (!this.chapterMap) throw new Error('Bible not loaded');

    const key = `${bookNumber}-${chapterNumber}`;
    const chapter = this.chapterMap.get(key);

    return chapter?.vv.length || 0;
  }

  /**
   * Search Bible verses (uses pre-built index)
   */
  search(query: string, limit: number = 50): BibleSearchResult[] {
    if (!this.bible || !this.bookMap) throw new Error('Bible not loaded');

    // Lazy-load search index
    this._loadSearchIndex();

    if (!this.searchIndex) return [];

    const lowerQuery = query.toLowerCase();
    const results: BibleSearchResult[] = [];

    // Simple text search (can be enhanced with Fuse.js later)
    for (const entry of this.searchIndex.entries) {
      if (results.length >= limit) break;

      const lowerText = entry.t.toLowerCase();

      if (lowerText.includes(lowerQuery)) {
        const book = this.bookMap.get(entry.b);

        results.push({
          book: entry.b,
          bookName: book?.n || `Book ${entry.b}`,
          chapter: entry.c,
          verse: entry.v,
          text: entry.t,
          score: lowerText.indexOf(lowerQuery) === 0 ? 0.1 : 0.5, // Starts with = better
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => a.score - b.score);

    return results;
  }

  /**
   * Get Bible metadata
   */
  getMetadata() {
    if (!this.bible) throw new Error('Bible not loaded');

    return {
      code: this.bible.v,
      name: this.bible.name,
      language: this.bible.lang,
    };
  }

  /**
   * Check if Bible is loaded
   */
  isLoaded(): boolean {
    return this.bible !== null;
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
    this.searchIndex = null;
    this.bookMap = null;
    this.chapterMap = null;
  }
}

// ====================================================================
// SINGLETON CACHE
// ====================================================================

const loaderCache = new Map<BibleTranslation, OptimizedBibleLoader>();

/**
 * Get or create an optimized Bible loader
 */
export function getBibleLoader(translation: BibleTranslation): OptimizedBibleLoader {
  if (!loaderCache.has(translation)) {
    loaderCache.set(translation, new OptimizedBibleLoader(translation));
  }

  return loaderCache.get(translation)!;
}

/**
 * Preload a Bible translation in the background
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
 * Unload a Bible from memory
 */
export function unloadBible(translation: BibleTranslation): void {
  const loader = loaderCache.get(translation);
  if (loader) {
    loader.unload();
    loaderCache.delete(translation);
  }
}
