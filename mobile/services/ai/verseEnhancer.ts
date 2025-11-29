/**
 * Verse Enhancer
 *
 * Detects Bible verse references in user messages and enhances context
 * with the actual verse text for better AI responses.
 *
 * Supports:
 * - Standard format: John 3:16, Romans 8:28
 * - Range format: Psalm 23:1-6, Matthew 5:3-12
 * - Indonesian books: Yohanes 3:16, Mazmur 23
 */

export interface VerseReference {
  book: string;
  bookId: string; // Standardized book ID
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  raw: string; // Original matched text
}

export interface EnhancedVerse {
  reference: VerseReference;
  text?: string;
  translation: 'ESV' | 'TB' | 'NIV';
}

// Book name mappings (English -> Standard ID)
const ENGLISH_BOOKS: Record<string, string> = {
  'genesis': 'GEN', 'gen': 'GEN',
  'exodus': 'EXO', 'exo': 'EXO', 'ex': 'EXO',
  'leviticus': 'LEV', 'lev': 'LEV',
  'numbers': 'NUM', 'num': 'NUM',
  'deuteronomy': 'DEU', 'deut': 'DEU', 'deu': 'DEU',
  'joshua': 'JOS', 'josh': 'JOS',
  'judges': 'JDG', 'judg': 'JDG',
  'ruth': 'RUT',
  '1 samuel': '1SA', '1samuel': '1SA', '1 sam': '1SA', '1sam': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2 sam': '2SA', '2sam': '2SA',
  '1 kings': '1KI', '1kings': '1KI', '1 kgs': '1KI',
  '2 kings': '2KI', '2kings': '2KI', '2 kgs': '2KI',
  '1 chronicles': '1CH', '1chronicles': '1CH', '1 chr': '1CH',
  '2 chronicles': '2CH', '2chronicles': '2CH', '2 chr': '2CH',
  'ezra': 'EZR',
  'nehemiah': 'NEH', 'neh': 'NEH',
  'esther': 'EST', 'esth': 'EST',
  'job': 'JOB',
  'psalm': 'PSA', 'psalms': 'PSA', 'ps': 'PSA', 'psa': 'PSA',
  'proverbs': 'PRO', 'prov': 'PRO', 'pro': 'PRO',
  'ecclesiastes': 'ECC', 'eccl': 'ECC', 'ecc': 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG', 'songs': 'SNG', 'sos': 'SNG',
  'isaiah': 'ISA', 'isa': 'ISA',
  'jeremiah': 'JER', 'jer': 'JER',
  'lamentations': 'LAM', 'lam': 'LAM',
  'ezekiel': 'EZK', 'ezek': 'EZK', 'eze': 'EZK',
  'daniel': 'DAN', 'dan': 'DAN',
  'hosea': 'HOS', 'hos': 'HOS',
  'joel': 'JOL',
  'amos': 'AMO', 'amo': 'AMO',
  'obadiah': 'OBA', 'obad': 'OBA',
  'jonah': 'JON', 'jon': 'JON',
  'micah': 'MIC', 'mic': 'MIC',
  'nahum': 'NAH', 'nah': 'NAH',
  'habakkuk': 'HAB', 'hab': 'HAB',
  'zephaniah': 'ZEP', 'zeph': 'ZEP',
  'haggai': 'HAG', 'hag': 'HAG',
  'zechariah': 'ZEC', 'zech': 'ZEC',
  'malachi': 'MAL', 'mal': 'MAL',
  'matthew': 'MAT', 'matt': 'MAT', 'mat': 'MAT', 'mt': 'MAT',
  'mark': 'MRK', 'mrk': 'MRK', 'mk': 'MRK',
  'luke': 'LUK', 'luk': 'LUK', 'lk': 'LUK',
  'john': 'JHN', 'jn': 'JHN', 'jhn': 'JHN',
  'acts': 'ACT', 'act': 'ACT',
  'romans': 'ROM', 'rom': 'ROM', 'ro': 'ROM',
  '1 corinthians': '1CO', '1corinthians': '1CO', '1 cor': '1CO', '1cor': '1CO',
  '2 corinthians': '2CO', '2corinthians': '2CO', '2 cor': '2CO', '2cor': '2CO',
  'galatians': 'GAL', 'gal': 'GAL',
  'ephesians': 'EPH', 'eph': 'EPH',
  'philippians': 'PHP', 'phil': 'PHP', 'php': 'PHP',
  'colossians': 'COL', 'col': 'COL',
  '1 thessalonians': '1TH', '1thessalonians': '1TH', '1 thess': '1TH', '1thess': '1TH',
  '2 thessalonians': '2TH', '2thessalonians': '2TH', '2 thess': '2TH', '2thess': '2TH',
  '1 timothy': '1TI', '1timothy': '1TI', '1 tim': '1TI', '1tim': '1TI',
  '2 timothy': '2TI', '2timothy': '2TI', '2 tim': '2TI', '2tim': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'philemon': 'PHM', 'phlm': 'PHM', 'phm': 'PHM',
  'hebrews': 'HEB', 'heb': 'HEB',
  'james': 'JAS', 'jas': 'JAS', 'jam': 'JAS',
  '1 peter': '1PE', '1peter': '1PE', '1 pet': '1PE', '1pet': '1PE',
  '2 peter': '2PE', '2peter': '2PE', '2 pet': '2PE', '2pet': '2PE',
  '1 john': '1JN', '1john': '1JN', '1 jn': '1JN',
  '2 john': '2JN', '2john': '2JN', '2 jn': '2JN',
  '3 john': '3JN', '3john': '3JN', '3 jn': '3JN',
  'jude': 'JUD',
  'revelation': 'REV', 'rev': 'REV', 'revelations': 'REV',
};

// Indonesian book names -> Standard ID
const INDONESIAN_BOOKS: Record<string, string> = {
  'kejadian': 'GEN', 'kej': 'GEN',
  'keluaran': 'EXO', 'kel': 'EXO',
  'imamat': 'LEV', 'im': 'LEV',
  'bilangan': 'NUM', 'bil': 'NUM',
  'ulangan': 'DEU', 'ul': 'DEU',
  'yosua': 'JOS', 'yos': 'JOS',
  'hakim-hakim': 'JDG', 'hakim': 'JDG', 'hak': 'JDG',
  'rut': 'RUT',
  '1 samuel': '1SA', '1samuel': '1SA', '1 sam': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2 sam': '2SA',
  '1 raja-raja': '1KI', '1 raja': '1KI', '1raja': '1KI', '1 raj': '1KI',
  '2 raja-raja': '2KI', '2 raja': '2KI', '2raja': '2KI', '2 raj': '2KI',
  '1 tawarikh': '1CH', '1tawarikh': '1CH', '1 taw': '1CH',
  '2 tawarikh': '2CH', '2tawarikh': '2CH', '2 taw': '2CH',
  'ezra': 'EZR',
  'nehemia': 'NEH', 'neh': 'NEH',
  'ester': 'EST', 'est': 'EST',
  'ayub': 'JOB',
  'mazmur': 'PSA', 'maz': 'PSA',
  'amsal': 'PRO', 'ams': 'PRO',
  'pengkhotbah': 'ECC', 'pkh': 'ECC',
  'kidung agung': 'SNG', 'kid': 'SNG',
  'yesaya': 'ISA', 'yes': 'ISA',
  'yeremia': 'JER', 'yer': 'JER',
  'ratapan': 'LAM', 'rat': 'LAM',
  'yehezkiel': 'EZK', 'yeh': 'EZK',
  'daniel': 'DAN', 'dan': 'DAN',
  'hosea': 'HOS', 'hos': 'HOS',
  'yoel': 'JOL',
  'amos': 'AMO', 'amo': 'AMO',
  'obaja': 'OBA', 'ob': 'OBA',
  'yunus': 'JON', 'yun': 'JON',
  'mikha': 'MIC', 'mik': 'MIC',
  'nahum': 'NAH', 'nah': 'NAH',
  'habakuk': 'HAB', 'hab': 'HAB',
  'zefanya': 'ZEP', 'zef': 'ZEP',
  'hagai': 'HAG', 'hag': 'HAG',
  'zakharia': 'ZEC', 'zak': 'ZEC',
  'maleakhi': 'MAL', 'mal': 'MAL',
  'matius': 'MAT', 'mat': 'MAT',
  'markus': 'MRK', 'mrk': 'MRK',
  'lukas': 'LUK', 'luk': 'LUK',
  'yohanes': 'JHN', 'yoh': 'JHN',
  'kisah para rasul': 'ACT', 'kisah rasul': 'ACT', 'kis': 'ACT',
  'roma': 'ROM', 'rom': 'ROM',
  '1 korintus': '1CO', '1korintus': '1CO', '1 kor': '1CO',
  '2 korintus': '2CO', '2korintus': '2CO', '2 kor': '2CO',
  'galatia': 'GAL', 'gal': 'GAL',
  'efesus': 'EPH', 'ef': 'EPH',
  'filipi': 'PHP', 'fil': 'PHP',
  'kolose': 'COL', 'kol': 'COL',
  '1 tesalonika': '1TH', '1tesalonika': '1TH', '1 tes': '1TH',
  '2 tesalonika': '2TH', '2tesalonika': '2TH', '2 tes': '2TH',
  '1 timotius': '1TI', '1timotius': '1TI', '1 tim': '1TI',
  '2 timotius': '2TI', '2timotius': '2TI', '2 tim': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'filemon': 'PHM', 'flm': 'PHM',
  'ibrani': 'HEB', 'ibr': 'HEB',
  'yakobus': 'JAS', 'yak': 'JAS',
  '1 petrus': '1PE', '1petrus': '1PE', '1 pet': '1PE',
  '2 petrus': '2PE', '2petrus': '2PE', '2 pet': '2PE',
  '1 yohanes': '1JN', '1yohanes': '1JN', '1 yoh': '1JN',
  '2 yohanes': '2JN', '2yohanes': '2JN', '2 yoh': '2JN',
  '3 yohanes': '3JN', '3yohanes': '3JN', '3 yoh': '3JN',
  'yudas': 'JUD', 'yud': 'JUD',
  'wahyu': 'REV', 'why': 'REV',
};

// All books combined
const ALL_BOOKS = { ...ENGLISH_BOOKS, ...INDONESIAN_BOOKS };

// Standard book ID to display name
const BOOK_DISPLAY_NAMES: Record<string, { en: string; id: string }> = {
  'GEN': { en: 'Genesis', id: 'Kejadian' },
  'EXO': { en: 'Exodus', id: 'Keluaran' },
  'LEV': { en: 'Leviticus', id: 'Imamat' },
  'NUM': { en: 'Numbers', id: 'Bilangan' },
  'DEU': { en: 'Deuteronomy', id: 'Ulangan' },
  'JOS': { en: 'Joshua', id: 'Yosua' },
  'JDG': { en: 'Judges', id: 'Hakim-hakim' },
  'RUT': { en: 'Ruth', id: 'Rut' },
  'PSA': { en: 'Psalm', id: 'Mazmur' },
  'PRO': { en: 'Proverbs', id: 'Amsal' },
  'ISA': { en: 'Isaiah', id: 'Yesaya' },
  'JER': { en: 'Jeremiah', id: 'Yeremia' },
  'MAT': { en: 'Matthew', id: 'Matius' },
  'MRK': { en: 'Mark', id: 'Markus' },
  'LUK': { en: 'Luke', id: 'Lukas' },
  'JHN': { en: 'John', id: 'Yohanes' },
  'ACT': { en: 'Acts', id: 'Kisah Para Rasul' },
  'ROM': { en: 'Romans', id: 'Roma' },
  '1CO': { en: '1 Corinthians', id: '1 Korintus' },
  '2CO': { en: '2 Corinthians', id: '2 Korintus' },
  'GAL': { en: 'Galatians', id: 'Galatia' },
  'EPH': { en: 'Ephesians', id: 'Efesus' },
  'PHP': { en: 'Philippians', id: 'Filipi' },
  'COL': { en: 'Colossians', id: 'Kolose' },
  'HEB': { en: 'Hebrews', id: 'Ibrani' },
  'JAS': { en: 'James', id: 'Yakobus' },
  '1PE': { en: '1 Peter', id: '1 Petrus' },
  '2PE': { en: '2 Peter', id: '2 Petrus' },
  '1JN': { en: '1 John', id: '1 Yohanes' },
  'REV': { en: 'Revelation', id: 'Wahyu' },
  // Add more as needed...
};

/**
 * Build regex pattern for book names
 */
function buildBookPattern(): string {
  const allNames = Object.keys(ALL_BOOKS).sort((a, b) => b.length - a.length);
  return allNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
}

/**
 * Detect Bible verse references in text
 */
export function detectVerseReferences(text: string): VerseReference[] {
  const references: VerseReference[] = [];
  const bookPattern = buildBookPattern();

  // Pattern: Book Chapter:Verse(-EndVerse)
  const versePattern = new RegExp(
    `(${bookPattern})\\s*(\\d+)\\s*:\\s*(\\d+)(?:\\s*-\\s*(\\d+))?`,
    'gi'
  );

  let match;
  while ((match = versePattern.exec(text)) !== null) {
    const bookName = match[1].toLowerCase();
    const bookId = ALL_BOOKS[bookName];

    if (bookId) {
      references.push({
        book: match[1],
        bookId,
        chapter: parseInt(match[2], 10),
        verseStart: parseInt(match[3], 10),
        verseEnd: match[4] ? parseInt(match[4], 10) : undefined,
        raw: match[0],
      });
    }
  }

  return references;
}

/**
 * Format verse reference for display
 */
export function formatReference(ref: VerseReference, lang: 'en' | 'id' = 'en'): string {
  const bookName = BOOK_DISPLAY_NAMES[ref.bookId]?.[lang] || ref.book;
  const verseRange = ref.verseEnd
    ? `${ref.verseStart}-${ref.verseEnd}`
    : ref.verseStart.toString();

  return `${bookName} ${ref.chapter}:${verseRange}`;
}

/**
 * Enhance user message with verse context
 *
 * Returns enhanced system prompt addition if verses are detected
 */
export function enhanceWithVerseContext(
  userMessage: string,
  lang: 'en' | 'id' = 'en'
): string | null {
  const references = detectVerseReferences(userMessage);

  if (references.length === 0) {
    return null;
  }

  // Build context enhancement
  const verseList = references.map(ref => formatReference(ref, lang)).join(', ');

  const contextAddition = lang === 'id'
    ? `\n\n[KONTEKS AYAT: Pengguna menyebutkan ${verseList}. Berikan penjelasan ayat ini dengan akurat.]`
    : `\n\n[VERSE CONTEXT: User mentioned ${verseList}. Provide accurate explanation of these verses.]`;

  return contextAddition;
}

/**
 * Check if message is asking about a specific verse
 */
export function isVerseQuestion(text: string): boolean {
  const verseQuestionPatterns = [
    /what does .+ mean/i,
    /explain .+ \d+:\d+/i,
    /meaning of .+ \d+:\d+/i,
    /apa (arti|makna) .+ \d+:\d+/i,
    /jelaskan .+ \d+:\d+/i,
  ];

  return verseQuestionPatterns.some(pattern => pattern.test(text)) &&
    detectVerseReferences(text).length > 0;
}

export default detectVerseReferences;
