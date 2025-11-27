/**
 * Normalized Bible Type Definitions
 *
 * These types match the normalized JSON format created by normalizeBibles.ts
 */

export interface BibleMetadata {
  code: string; // "NIV", "ESV", "TB", "CHS"
  name: string; // "New International Version"
  shortname: string; // "NIV"
  language: string; // "English", "Indonesian", "Chinese"
  lang_short: string; // "en", "id", "zh"
  year?: string; // "2011"
  publisher?: string;
  copyright?: string;
  description?: string;
}

export interface BibleBook {
  number: number; // 1-66 (canonical ordering)
  name: string; // Localized name ("Genesis", "Kejadian", "创世记")
  englishName: string; // Always English for mapping
  chapters: number; // Total chapters in book
}

export interface BibleVerse {
  book: number; // Book number (1-66)
  chapter: number; // Chapter number
  verse: number; // Verse number
  text: string; // Verse text
}

export interface NormalizedBible {
  metadata: BibleMetadata;
  books: BibleBook[];
  verses: BibleVerse[];
}

/**
 * Indexed Bible Structure for Fast Lookups
 */
export interface BibleIndex {
  // Fast chapter lookup: verses[bookNum][chapterNum] = BibleVerse[]
  byChapter: Map<number, Map<number, BibleVerse[]>>;

  // Fast verse lookup: verse[bookNum][chapterNum][verseNum] = string
  byVerse: Map<number, Map<number, Map<number, string>>>;

  // Book lookup by number
  booksByNumber: Map<number, BibleBook>;

  // Verse count per chapter
  verseCounts: Map<number, Map<number, number>>;
}

/**
 * Bible Search Result
 */
export interface BibleSearchResult {
  book: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  score: number; // Relevance score from Fuse.js
}

/**
 * Available Bible Translations
 */
export type BibleTranslation = 'NIV' | 'ESV' | 'NKJV' | 'NLT' | 'TB' | 'CHS';

export const BIBLE_TRANSLATIONS: Record<
  BibleTranslation,
  { id: string; code: string; name: string; language: string; flag: string }
> = {
  NIV: {
    id: 'NIV',
    code: 'NIV',
    name: 'New International Version',
    language: 'English',
    flag: '🇺🇸',
  },
  ESV: {
    id: 'ESV',
    code: 'ESV',
    name: 'English Standard Version',
    language: 'English',
    flag: '🇺🇸',
  },
  NKJV: {
    id: 'NKJV',
    code: 'NKJV',
    name: 'New King James Version',
    language: 'English',
    flag: '🇺🇸',
  },
  NLT: {
    id: 'NLT',
    code: 'NLT',
    name: 'New Living Translation',
    language: 'English',
    flag: '🇺🇸',
  },
  TB: {
    id: 'TB',
    code: 'TB',
    name: 'Terjemahan Baru',
    language: 'Indonesian',
    flag: '🇮🇩',
  },
  CHS: {
    id: 'CHS',
    code: 'CHS',
    name: 'Chinese Union Simplified',
    language: 'Chinese',
    flag: '🇨🇳',
  },
};
