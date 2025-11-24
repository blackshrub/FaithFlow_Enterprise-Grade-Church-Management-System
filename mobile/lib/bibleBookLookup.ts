/**
 * Bible Book Number Lookup
 *
 * Maps book names to canonical book numbers (1-66)
 * Handles multiple languages and name variations
 */

/**
 * Canonical English book names (1-66)
 */
export const CANONICAL_BOOKS: Record<number, string> = {
  // Old Testament (1-39)
  1: 'Genesis',
  2: 'Exodus',
  3: 'Leviticus',
  4: 'Numbers',
  5: 'Deuteronomy',
  6: 'Joshua',
  7: 'Judges',
  8: 'Ruth',
  9: '1 Samuel',
  10: '2 Samuel',
  11: '1 Kings',
  12: '2 Kings',
  13: '1 Chronicles',
  14: '2 Chronicles',
  15: 'Ezra',
  16: 'Nehemiah',
  17: 'Esther',
  18: 'Job',
  19: 'Psalms',
  20: 'Proverbs',
  21: 'Ecclesiastes',
  22: 'Song of Solomon',
  23: 'Isaiah',
  24: 'Jeremiah',
  25: 'Lamentations',
  26: 'Ezekiel',
  27: 'Daniel',
  28: 'Hosea',
  29: 'Joel',
  30: 'Amos',
  31: 'Obadiah',
  32: 'Jonah',
  33: 'Micah',
  34: 'Nahum',
  35: 'Habakkuk',
  36: 'Zephaniah',
  37: 'Haggai',
  38: 'Zechariah',
  39: 'Malachi',

  // New Testament (40-66)
  40: 'Matthew',
  41: 'Mark',
  42: 'Luke',
  43: 'John',
  44: 'Acts',
  45: 'Romans',
  46: '1 Corinthians',
  47: '2 Corinthians',
  48: 'Galatians',
  49: 'Ephesians',
  50: 'Philippians',
  51: 'Colossians',
  52: '1 Thessalonians',
  53: '2 Thessalonians',
  54: '1 Timothy',
  55: '2 Timothy',
  56: 'Titus',
  57: 'Philemon',
  58: 'Hebrews',
  59: 'James',
  60: '1 Peter',
  61: '2 Peter',
  62: '1 John',
  63: '2 John',
  64: '3 John',
  65: 'Jude',
  66: 'Revelation',
};

/**
 * Book name to number mapping (supports multiple languages)
 */
const BOOK_NAME_TO_NUMBER: Map<string, number> = new Map();

// Build lookup map with normalized keys (lowercase, spaces removed)
function buildLookup() {
  // English canonical names
  Object.entries(CANONICAL_BOOKS).forEach(([num, name]) => {
    const key = name.toLowerCase().replace(/\s+/g, '');
    BOOK_NAME_TO_NUMBER.set(key, parseInt(num));
  });

  // Indonesian (Terjemahan Baru)
  const indonesianBooks: Record<string, number> = {
    'Kejadian': 1,
    'Keluaran': 2,
    'Imamat': 3,
    'Bilangan': 4,
    'Ulangan': 5,
    'Yosua': 6,
    'Hakim-Hakim': 7,
    'Rut': 8,
    '1 Samuel': 9,
    '2 Samuel': 10,
    '1 Raja-Raja': 11,
    '2 Raja-Raja': 12,
    '1 Tawarikh': 13,
    '2 Tawarikh': 14,
    'Ezra': 15,
    'Nehemia': 16,
    'Ester': 17,
    'Ayub': 18,
    'Mazmur': 19,
    'Amsal': 20,
    'Pengkhotbah': 21,
    'Kidung Agung': 22,
    'Yesaya': 23,
    'Yeremia': 24,
    'Ratapan': 25,
    'Yehezkiel': 26,
    'Daniel': 27,
    'Hosea': 28,
    'Yoel': 29,
    'Amos': 30,
    'Obaja': 31,
    'Yunus': 32,
    'Mikha': 33,
    'Nahum': 34,
    'Habakuk': 35,
    'Zefanya': 36,
    'Hagai': 37,
    'Zakharia': 38,
    'Maleakhi': 39,
    'Matius': 40,
    'Markus': 41,
    'Lukas': 42,
    'Yohanes': 43,
    'Kisah Para Rasul': 44,
    'Roma': 45,
    '1 Korintus': 46,
    '2 Korintus': 47,
    'Galatia': 48,
    'Efesus': 49,
    'Filipi': 50,
    'Kolose': 51,
    '1 Tesalonika': 52,
    '2 Tesalonika': 53,
    '1 Timotius': 54,
    '2 Timotius': 55,
    'Titus': 56,
    'Filemon': 57,
    'Ibrani': 58,
    'Yakobus': 59,
    '1 Petrus': 60,
    '2 Petrus': 61,
    '1 Yohanes': 62,
    '2 Yohanes': 63,
    '3 Yohanes': 64,
    'Yudas': 65,
    'Wahyu': 66,
  };

  Object.entries(indonesianBooks).forEach(([name, num]) => {
    const key = name.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    BOOK_NAME_TO_NUMBER.set(key, num);
  });

  // Chinese (Simplified)
  const chineseBooks: Record<string, number> = {
    '创世记': 1,
    '出埃及记': 2,
    '利未记': 3,
    '民数记': 4,
    '申命记': 5,
    '约书亚记': 6,
    '士师记': 7,
    '路得记': 8,
    '撒母耳记上': 9,
    '撒母耳记下': 10,
    '列王纪上': 11,
    '列王纪下': 12,
    '历代志上': 13,
    '历代志下': 14,
    '以斯拉记': 15,
    '尼希米记': 16,
    '以斯帖记': 17,
    '约伯记': 18,
    '诗篇': 19,
    '箴言': 20,
    '传道书': 21,
    '雅歌': 22,
    '以赛亚书': 23,
    '耶利米书': 24,
    '耶利米哀歌': 25,
    '以西结书': 26,
    '但以理书': 27,
    '何西阿书': 28,
    '约珥书': 29,
    '阿摩司书': 30,
    '俄巴底亚书': 31,
    '约拿书': 32,
    '弥迦书': 33,
    '那鸿书': 34,
    '哈巴谷书': 35,
    '西番雅书': 36,
    '哈该书': 37,
    '撒迦利亚书': 38,
    '玛拉基书': 39,
    '马太福音': 40,
    '马可福音': 41,
    '路加福音': 42,
    '约翰福音': 43,
    '使徒行传': 44,
    '罗马书': 45,
    '哥林多前书': 46,
    '哥林多后书': 47,
    '加拉太书': 48,
    '以弗所书': 49,
    '腓立比书': 50,
    '歌罗西书': 51,
    '帖撒罗尼迦前书': 52,
    '帖撒罗尼迦后书': 53,
    '提摩太前书': 54,
    '提摩太后书': 55,
    '提多书': 56,
    '腓利门书': 57,
    '希伯来书': 58,
    '雅各书': 59,
    '彼得前书': 60,
    '彼得后书': 61,
    '约翰一书': 62,
    '约翰二书': 63,
    '约翰三书': 64,
    '犹大书': 65,
    '启示录': 66,
  };

  Object.entries(chineseBooks).forEach(([name, num]) => {
    BOOK_NAME_TO_NUMBER.set(name, num);
  });

  // Common variations
  const variations: Record<string, number> = {
    'Psalm': 19, // Singular form
    'Song Of Solomon': 22, // Different capitalization
    'Song of Songs': 22,
    'Canticles': 22,
    'Acts of the Apostles': 44,
  };

  Object.entries(variations).forEach(([name, num]) => {
    const key = name.toLowerCase().replace(/\s+/g, '');
    BOOK_NAME_TO_NUMBER.set(key, num);
  });
}

// Build lookup on module load
buildLookup();

/**
 * Get book number from book name (any language)
 */
export function getBookNumber(bookName: string): number | undefined {
  const normalized = bookName.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  return BOOK_NAME_TO_NUMBER.get(normalized);
}

/**
 * Get canonical English book name from number
 */
export function getBookName(bookNumber: number): string | undefined {
  return CANONICAL_BOOKS[bookNumber];
}

/**
 * Check if book number is valid (1-66)
 */
export function isValidBookNumber(bookNumber: number): boolean {
  return bookNumber >= 1 && bookNumber <= 66;
}

/**
 * Get testament for a book number
 */
export function getTestament(bookNumber: number): 'OT' | 'NT' | undefined {
  if (!isValidBookNumber(bookNumber)) return undefined;
  return bookNumber <= 39 ? 'OT' : 'NT';
}
