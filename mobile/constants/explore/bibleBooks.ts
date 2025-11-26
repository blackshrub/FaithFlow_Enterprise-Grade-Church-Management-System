/**
 * Bible Book Translations & Reference Utilities
 *
 * Provides localized Bible book names and formatting helpers
 * for displaying Bible references in multiple languages.
 */

import type { BibleReference } from '@/types/explore';

// ============================================================================
// BIBLE BOOK NAME TRANSLATIONS
// ============================================================================

export const BIBLE_BOOK_TRANSLATIONS: Record<string, { en: string; id: string }> = {
  // Old Testament
  Genesis: { en: 'Genesis', id: 'Kejadian' },
  Exodus: { en: 'Exodus', id: 'Keluaran' },
  Leviticus: { en: 'Leviticus', id: 'Imamat' },
  Numbers: { en: 'Numbers', id: 'Bilangan' },
  Deuteronomy: { en: 'Deuteronomy', id: 'Ulangan' },
  Joshua: { en: 'Joshua', id: 'Yosua' },
  Judges: { en: 'Judges', id: 'Hakim-hakim' },
  Ruth: { en: 'Ruth', id: 'Rut' },
  '1 Samuel': { en: '1 Samuel', id: '1 Samuel' },
  '2 Samuel': { en: '2 Samuel', id: '2 Samuel' },
  '1 Kings': { en: '1 Kings', id: '1 Raja-raja' },
  '2 Kings': { en: '2 Kings', id: '2 Raja-raja' },
  '1 Chronicles': { en: '1 Chronicles', id: '1 Tawarikh' },
  '2 Chronicles': { en: '2 Chronicles', id: '2 Tawarikh' },
  Ezra: { en: 'Ezra', id: 'Ezra' },
  Nehemiah: { en: 'Nehemiah', id: 'Nehemia' },
  Esther: { en: 'Esther', id: 'Ester' },
  Job: { en: 'Job', id: 'Ayub' },
  Psalms: { en: 'Psalms', id: 'Mazmur' },
  Psalm: { en: 'Psalm', id: 'Mazmur' },
  Proverbs: { en: 'Proverbs', id: 'Amsal' },
  Ecclesiastes: { en: 'Ecclesiastes', id: 'Pengkhotbah' },
  'Song of Solomon': { en: 'Song of Solomon', id: 'Kidung Agung' },
  'Song of Songs': { en: 'Song of Songs', id: 'Kidung Agung' },
  Isaiah: { en: 'Isaiah', id: 'Yesaya' },
  Jeremiah: { en: 'Jeremiah', id: 'Yeremia' },
  Lamentations: { en: 'Lamentations', id: 'Ratapan' },
  Ezekiel: { en: 'Ezekiel', id: 'Yehezkiel' },
  Daniel: { en: 'Daniel', id: 'Daniel' },
  Hosea: { en: 'Hosea', id: 'Hosea' },
  Joel: { en: 'Joel', id: 'Yoel' },
  Amos: { en: 'Amos', id: 'Amos' },
  Obadiah: { en: 'Obadiah', id: 'Obaja' },
  Jonah: { en: 'Jonah', id: 'Yunus' },
  Micah: { en: 'Micah', id: 'Mikha' },
  Nahum: { en: 'Nahum', id: 'Nahum' },
  Habakkuk: { en: 'Habakkuk', id: 'Habakuk' },
  Zephaniah: { en: 'Zephaniah', id: 'Zefanya' },
  Haggai: { en: 'Haggai', id: 'Hagai' },
  Zechariah: { en: 'Zechariah', id: 'Zakharia' },
  Malachi: { en: 'Malachi', id: 'Maleakhi' },

  // New Testament
  Matthew: { en: 'Matthew', id: 'Matius' },
  Mark: { en: 'Mark', id: 'Markus' },
  Luke: { en: 'Luke', id: 'Lukas' },
  John: { en: 'John', id: 'Yohanes' },
  Acts: { en: 'Acts', id: 'Kisah Para Rasul' },
  Romans: { en: 'Romans', id: 'Roma' },
  '1 Corinthians': { en: '1 Corinthians', id: '1 Korintus' },
  '2 Corinthians': { en: '2 Corinthians', id: '2 Korintus' },
  Galatians: { en: 'Galatians', id: 'Galatia' },
  Ephesians: { en: 'Ephesians', id: 'Efesus' },
  Philippians: { en: 'Philippians', id: 'Filipi' },
  Colossians: { en: 'Colossians', id: 'Kolose' },
  '1 Thessalonians': { en: '1 Thessalonians', id: '1 Tesalonika' },
  '2 Thessalonians': { en: '2 Thessalonians', id: '2 Tesalonika' },
  '1 Timothy': { en: '1 Timothy', id: '1 Timotius' },
  '2 Timothy': { en: '2 Timothy', id: '2 Timotius' },
  Titus: { en: 'Titus', id: 'Titus' },
  Philemon: { en: 'Philemon', id: 'Filemon' },
  Hebrews: { en: 'Hebrews', id: 'Ibrani' },
  James: { en: 'James', id: 'Yakobus' },
  '1 Peter': { en: '1 Peter', id: '1 Petrus' },
  '2 Peter': { en: '2 Peter', id: '2 Petrus' },
  '1 John': { en: '1 John', id: '1 Yohanes' },
  '2 John': { en: '2 John', id: '2 Yohanes' },
  '3 John': { en: '3 John', id: '3 Yohanes' },
  Jude: { en: 'Jude', id: 'Yudas' },
  Revelation: { en: 'Revelation', id: 'Wahyu' },
};

// ============================================================================
// BIBLE TRANSLATION MAPPING
// ============================================================================

// Maps English Bible translations to their Indonesian equivalents
export const BIBLE_TRANSLATION_MAPPING: Record<string, { en: string; id: string }> = {
  NIV: { en: 'NIV', id: 'TB' },
  ESV: { en: 'ESV', id: 'TB' },
  KJV: { en: 'KJV', id: 'TB' },
  NASB: { en: 'NASB', id: 'TB' },
  NLT: { en: 'NLT', id: 'BIS' },
  MSG: { en: 'MSG', id: 'BIS' },
  TB: { en: 'TB', id: 'TB' },
  BIS: { en: 'BIS', id: 'BIS' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the localized Bible book name
 */
export function getLocalizedBookName(bookName: string, language: 'en' | 'id'): string {
  const translation = BIBLE_BOOK_TRANSLATIONS[bookName];
  if (translation) {
    return translation[language];
  }
  // Return the original name if translation not found
  return bookName;
}

/**
 * Get the localized Bible translation/version name
 */
export function getLocalizedTranslation(translation: string, language: 'en' | 'id'): string {
  const mapping = BIBLE_TRANSLATION_MAPPING[translation];
  if (mapping) {
    return mapping[language];
  }
  // Return the original translation if mapping not found
  return translation;
}

/**
 * Format a Bible reference with localized book name and translation
 *
 * Examples:
 * - English: "Philippians 4:6-7 (NIV)"
 * - Indonesian: "Filipi 4:6-7 (TB)"
 */
export function formatBibleReference(
  reference: BibleReference | null | undefined,
  language: 'en' | 'id',
  options?: {
    showTranslation?: boolean;
  }
): string {
  if (!reference) return '';

  const { showTranslation = true } = options || {};

  // Get localized book name
  const bookName = getLocalizedBookName(reference.book, language);

  // Format the verse reference
  const verseRef = reference.verse_end && reference.verse_end !== reference.verse_start
    ? `${reference.chapter}:${reference.verse_start}-${reference.verse_end}`
    : `${reference.chapter}:${reference.verse_start}`;

  // Get localized translation
  const translation = reference.translation
    ? getLocalizedTranslation(reference.translation, language)
    : (language === 'id' ? 'TB' : 'NIV'); // Default translation based on language

  // Build the full reference string
  const baseRef = `${bookName} ${verseRef}`;

  if (showTranslation) {
    return `${baseRef} (${translation})`;
  }

  return baseRef;
}

/**
 * Format a simple Bible reference (book name + chapter only)
 */
export function formatSimpleBibleReference(
  book: string,
  chapter: number,
  language: 'en' | 'id'
): string {
  const bookName = getLocalizedBookName(book, language);
  return `${bookName} ${chapter}`;
}
