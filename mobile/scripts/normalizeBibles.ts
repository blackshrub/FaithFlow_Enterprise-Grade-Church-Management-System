/**
 * Bible JSON Normalizer Script
 *
 * Converts 6 different Bible JSON formats into unified normalized structure.
 * Supports both nested (English) and flat (Indonesian, Chinese) formats.
 *
 * Usage: npx ts-node scripts/normalizeBibles.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

interface BibleMetadata {
  code: string;
  name: string;
  shortname: string;
  language: string;
  lang_short: string;
  year?: string;
  publisher?: string;
  copyright?: string;
  description?: string;
}

interface BibleBook {
  number: number;
  name: string;
  englishName: string;
  chapters: number;
}

interface BibleVerse {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

interface NormalizedBible {
  metadata: BibleMetadata;
  books: BibleBook[];
  verses: BibleVerse[];
}

// ====================================================================
// CANONICAL BIBLE BOOK MAPPING
// ====================================================================

const BIBLE_BOOKS = [
  // Old Testament
  { number: 1, english: 'Genesis', indonesian: 'Kejadian', chinese: '创世记' },
  { number: 2, english: 'Exodus', indonesian: 'Keluaran', chinese: '出埃及记' },
  { number: 3, english: 'Leviticus', indonesian: 'Imamat', chinese: '利未记' },
  { number: 4, english: 'Numbers', indonesian: 'Bilangan', chinese: '民数记' },
  { number: 5, english: 'Deuteronomy', indonesian: 'Ulangan', chinese: '申命记' },
  { number: 6, english: 'Joshua', indonesian: 'Yosua', chinese: '约书亚记' },
  { number: 7, english: 'Judges', indonesian: 'Hakim-hakim', chinese: '士师记' },
  { number: 8, english: 'Ruth', indonesian: 'Rut', chinese: '路得记' },
  { number: 9, english: '1 Samuel', indonesian: '1 Samuel', chinese: '撒母耳记上' },
  { number: 10, english: '2 Samuel', indonesian: '2 Samuel', chinese: '撒母耳记下' },
  { number: 11, english: '1 Kings', indonesian: '1 Raja-raja', chinese: '列王纪上' },
  { number: 12, english: '2 Kings', indonesian: '2 Raja-raja', chinese: '列王纪下' },
  { number: 13, english: '1 Chronicles', indonesian: '1 Tawarikh', chinese: '历代志上' },
  { number: 14, english: '2 Chronicles', indonesian: '2 Tawarikh', chinese: '历代志下' },
  { number: 15, english: 'Ezra', indonesian: 'Ezra', chinese: '以斯拉记' },
  { number: 16, english: 'Nehemiah', indonesian: 'Nehemia', chinese: '尼希米记' },
  { number: 17, english: 'Esther', indonesian: 'Ester', chinese: '以斯帖记' },
  { number: 18, english: 'Job', indonesian: 'Ayub', chinese: '约伯记' },
  { number: 19, english: 'Psalms', indonesian: 'Mazmur', chinese: '诗篇' },
  { number: 20, english: 'Proverbs', indonesian: 'Amsal', chinese: '箴言' },
  { number: 21, english: 'Ecclesiastes', indonesian: 'Pengkhotbah', chinese: '传道书' },
  { number: 22, english: 'Song of Solomon', indonesian: 'Kidung Agung', chinese: '雅歌' },
  { number: 23, english: 'Isaiah', indonesian: 'Yesaya', chinese: '以赛亚书' },
  { number: 24, english: 'Jeremiah', indonesian: 'Yeremia', chinese: '耶利米书' },
  { number: 25, english: 'Lamentations', indonesian: 'Ratapan', chinese: '耶利米哀歌' },
  { number: 26, english: 'Ezekiel', indonesian: 'Yehezkiel', chinese: '以西结书' },
  { number: 27, english: 'Daniel', indonesian: 'Daniel', chinese: '但以理书' },
  { number: 28, english: 'Hosea', indonesian: 'Hosea', chinese: '何西阿书' },
  { number: 29, english: 'Joel', indonesian: 'Yoel', chinese: '约珥书' },
  { number: 30, english: 'Amos', indonesian: 'Amos', chinese: '阿摩司书' },
  { number: 31, english: 'Obadiah', indonesian: 'Obaja', chinese: '俄巴底亚书' },
  { number: 32, english: 'Jonah', indonesian: 'Yunus', chinese: '约拿书' },
  { number: 33, english: 'Micah', indonesian: 'Mikha', chinese: '弥迦书' },
  { number: 34, english: 'Nahum', indonesian: 'Nahum', chinese: '那鸿书' },
  { number: 35, english: 'Habakkuk', indonesian: 'Habakuk', chinese: '哈巴谷书' },
  { number: 36, english: 'Zephaniah', indonesian: 'Zefanya', chinese: '西番雅书' },
  { number: 37, english: 'Haggai', indonesian: 'Hagai', chinese: '哈该书' },
  { number: 38, english: 'Zechariah', indonesian: 'Zakharia', chinese: '撒迦利亚书' },
  { number: 39, english: 'Malachi', indonesian: 'Maleakhi', chinese: '玛拉基书' },
  // New Testament
  { number: 40, english: 'Matthew', indonesian: 'Matius', chinese: '马太福音' },
  { number: 41, english: 'Mark', indonesian: 'Markus', chinese: '马可福音' },
  { number: 42, english: 'Luke', indonesian: 'Lukas', chinese: '路加福音' },
  { number: 43, english: 'John', indonesian: 'Yohanes', chinese: '约翰福音' },
  { number: 44, english: 'Acts', indonesian: 'Kisah Para Rasul', chinese: '使徒行传' },
  { number: 45, english: 'Romans', indonesian: 'Roma', chinese: '罗马书' },
  { number: 46, english: '1 Corinthians', indonesian: '1 Korintus', chinese: '哥林多前书' },
  { number: 47, english: '2 Corinthians', indonesian: '2 Korintus', chinese: '哥林多后书' },
  { number: 48, english: 'Galatians', indonesian: 'Galatia', chinese: '加拉太书' },
  { number: 49, english: 'Ephesians', indonesian: 'Efesus', chinese: '以弗所书' },
  { number: 50, english: 'Philippians', indonesian: 'Filipi', chinese: '腓立比书' },
  { number: 51, english: 'Colossians', indonesian: 'Kolose', chinese: '歌罗西书' },
  { number: 52, english: '1 Thessalonians', indonesian: '1 Tesalonika', chinese: '帖撒罗尼迦前书' },
  { number: 53, english: '2 Thessalonians', indonesian: '2 Tesalonika', chinese: '帖撒罗尼迦后书' },
  { number: 54, english: '1 Timothy', indonesian: '1 Timotius', chinese: '提摩太前书' },
  { number: 55, english: '2 Timothy', indonesian: '2 Timotius', chinese: '提摩太后书' },
  { number: 56, english: 'Titus', indonesian: 'Titus', chinese: '提多书' },
  { number: 57, english: 'Philemon', indonesian: 'Filemon', chinese: '腓利门书' },
  { number: 58, english: 'Hebrews', indonesian: 'Ibrani', chinese: '希伯来书' },
  { number: 59, english: 'James', indonesian: 'Yakobus', chinese: '雅各书' },
  { number: 60, english: '1 Peter', indonesian: '1 Petrus', chinese: '彼得前书' },
  { number: 61, english: '2 Peter', indonesian: '2 Petrus', chinese: '彼得后书' },
  { number: 62, english: '1 John', indonesian: '1 Yohanes', chinese: '约翰一书' },
  { number: 63, english: '2 John', indonesian: '2 Yohanes', chinese: '约翰二书' },
  { number: 64, english: '3 John', indonesian: '3 Yohanes', chinese: '约翰三书' },
  { number: 65, english: 'Jude', indonesian: 'Yudas', chinese: '犹大书' },
  { number: 66, english: 'Revelation', indonesian: 'Wahyu', chinese: '启示录' },
];

// Create reverse lookup maps
const ENGLISH_TO_NUMBER = new Map(BIBLE_BOOKS.map(b => [b.english, b.number]));
const NUMBER_TO_ENGLISH = new Map(BIBLE_BOOKS.map(b => [b.number, b.english]));

// ====================================================================
// NORMALIZER FUNCTIONS
// ====================================================================

/**
 * Normalize English Bible (NIV, ESV, NKJV, NLT)
 * Format: { "BookName": { "chapter": { "verse": "text" } } }
 */
function normalizeEnglishBible(
  filePath: string,
  code: string,
  name: string
): NormalizedBible {
  console.log(`\n📖 Normalizing ${code}...`);

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const verses: BibleVerse[] = [];
  let totalVerses = 0;

  // Extract verses
  for (const [bookName, chapters] of Object.entries(raw)) {
    const bookNumber = ENGLISH_TO_NUMBER.get(bookName);

    if (!bookNumber) {
      console.warn(`⚠️  Unknown book: ${bookName}`);
      continue;
    }

    for (const [chapterStr, verseObj] of Object.entries(chapters as any)) {
      const chapterNum = parseInt(chapterStr);

      for (const [verseStr, text] of Object.entries(verseObj as any)) {
        const verseNum = parseInt(verseStr);
        verses.push({
          book: bookNumber,
          chapter: chapterNum,
          verse: verseNum,
          text: text as string,
        });
        totalVerses++;
      }
    }
  }

  // Sort verses
  verses.sort((a, b) => {
    if (a.book !== b.book) return a.book - b.book;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  console.log(`   ✅ Extracted ${totalVerses.toLocaleString()} verses`);

  // Generate books list
  const booksMap = new Map<number, { maxChapter: number }>();
  verses.forEach(v => {
    const existing = booksMap.get(v.book);
    if (!existing || v.chapter > existing.maxChapter) {
      booksMap.set(v.book, { maxChapter: v.chapter });
    }
  });

  const books: BibleBook[] = Array.from(booksMap.entries()).map(([num, data]) => ({
    number: num,
    name: NUMBER_TO_ENGLISH.get(num) || '',
    englishName: NUMBER_TO_ENGLISH.get(num) || '',
    chapters: data.maxChapter,
  }));

  return {
    metadata: {
      code,
      name,
      shortname: code,
      language: 'English',
      lang_short: 'en',
    },
    books,
    verses,
  };
}

/**
 * Normalize Indonesian/Chinese Bible (TB, CHS)
 * Format: { "metadata": {...}, "verses": [{book_name, book, chapter, verse, text}] }
 */
function normalizeFlatBible(filePath: string): NormalizedBible {
  console.log(`\n📖 Normalizing ${path.basename(filePath)}...`);

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const verses: BibleVerse[] = raw.verses.map((v: any) => ({
    book: v.book,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text,
  }));

  console.log(`   ✅ Extracted ${verses.length.toLocaleString()} verses`);

  // Generate books list
  const booksMap = new Map<number, { name: string; maxChapter: number }>();
  raw.verses.forEach((v: any) => {
    const existing = booksMap.get(v.book);
    if (!existing) {
      booksMap.set(v.book, { name: v.book_name, maxChapter: v.chapter });
    } else if (v.chapter > existing.maxChapter) {
      existing.maxChapter = v.chapter;
    }
  });

  const books: BibleBook[] = Array.from(booksMap.entries()).map(([num, data]) => ({
    number: num,
    name: data.name,
    englishName: NUMBER_TO_ENGLISH.get(num) || '',
    chapters: data.maxChapter,
  }));

  return {
    metadata: {
      code: raw.metadata.shortname || raw.metadata.module,
      name: raw.metadata.name,
      shortname: raw.metadata.shortname || raw.metadata.module,
      language: raw.metadata.lang,
      lang_short: raw.metadata.lang_short,
      year: raw.metadata.year,
      publisher: raw.metadata.publisher,
      copyright: raw.metadata.copyright_statement,
      description: raw.metadata.description,
    },
    books,
    verses,
  };
}

// ====================================================================
// MAIN NORMALIZATION
// ====================================================================

function main() {
  console.log('============================================================');
  console.log('📚 Bible JSON Normalizer');
  console.log('============================================================');

  const BIBLE_DIR = path.join(__dirname, '../assets/bible');
  const OUTPUT_DIR = path.join(__dirname, '../assets/bible/normalized');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const bibles = [
    // English Bibles (nested format)
    {
      input: path.join(BIBLE_DIR, 'niv.json'),
      output: path.join(OUTPUT_DIR, 'niv.json'),
      code: 'NIV',
      name: 'New International Version',
      type: 'english',
    },
    {
      input: path.join(BIBLE_DIR, 'esv.json'),
      output: path.join(OUTPUT_DIR, 'esv.json'),
      code: 'ESV',
      name: 'English Standard Version',
      type: 'english',
    },
    {
      input: path.join(BIBLE_DIR, 'nkjv.json'),
      output: path.join(OUTPUT_DIR, 'nkjv.json'),
      code: 'NKJV',
      name: 'New King James Version',
      type: 'english',
    },
    {
      input: path.join(BIBLE_DIR, 'nlt.json'),
      output: path.join(OUTPUT_DIR, 'nlt.json'),
      code: 'NLT',
      name: 'New Living Translation',
      type: 'english',
    },
    // Indonesian & Chinese (flat format)
    {
      input: path.join(BIBLE_DIR, 'indo_tb.json'),
      output: path.join(OUTPUT_DIR, 'indo_tb.json'),
      type: 'flat',
    },
    {
      input: path.join(BIBLE_DIR, 'chinese_union_simp.json'),
      output: path.join(OUTPUT_DIR, 'chinese_union_simp.json'),
      type: 'flat',
    },
  ];

  // Normalize all Bibles
  for (const bible of bibles) {
    try {
      const normalized =
        bible.type === 'english'
          ? normalizeEnglishBible(bible.input, bible.code!, bible.name!)
          : normalizeFlatBible(bible.input);

      fs.writeFileSync(bible.output, JSON.stringify(normalized, null, 2));
      console.log(`   💾 Saved to ${path.basename(bible.output)}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  console.log('\n============================================================');
  console.log('✅ Normalization Complete!');
  console.log('============================================================\n');
}

// Run
main();
