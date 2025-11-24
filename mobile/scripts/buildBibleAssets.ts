/**
 * Bible Asset Builder - Production Pipeline
 *
 * This script runs at BUILD TIME to:
 * 1. Detect and normalize different Bible JSON formats
 * 2. Minify keys for smaller bundle size (v, t, c, b)
 * 3. Validate structure (sequential numbering, canonical order)
 * 4. Pre-build search indexes for offline search
 * 5. Output optimized assets for mobile app
 *
 * Input:  /backend/data/bible/*.json (raw formats, 4-9MB each)
 * Output: /mobile/assets/bible-optimized/*.json (minified, 2-4MB each)
 *         /mobile/assets/bible-index/*.idx.json (search indexes, <500KB each)
 *
 * Usage: npm run build:bible
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================================================================
// MINIFIED SCHEMA TYPES
// ====================================================================

/**
 * Minified verse: { v: verseNum, t: "text" }
 */
interface MinVerse {
  v: number; // verse number
  t: string; // text
}

/**
 * Minified chapter: { c: chapterNum, vv: MinVerse[] }
 */
interface MinChapter {
  c: number; // chapter number
  vv: MinVerse[]; // verses
}

/**
 * Minified book: { b: bookNum, n: "name", cc: MinChapter[] }
 */
interface MinBook {
  b: number; // book number
  n: string; // name
  cc: MinChapter[]; // chapters
}

/**
 * Minified Bible
 */
interface MinBible {
  v: string; // version code
  name: string; // full name
  lang: string; // language code
  bb: MinBook[]; // books
}

/**
 * Search index entry (for Fuse.js)
 */
interface SearchEntry {
  b: number; // book
  c: number; // chapter
  v: number; // verse
  t: string; // text (indexed)
}

// ====================================================================
// CANONICAL BIBLE BOOK ORDER
// ====================================================================

const CANONICAL_BOOKS = [
  { num: 1, en: 'Genesis', id: 'Kejadian', zh: '创世记' },
  { num: 2, en: 'Exodus', id: 'Keluaran', zh: '出埃及记' },
  { num: 3, en: 'Leviticus', id: 'Imamat', zh: '利未记' },
  { num: 4, en: 'Numbers', id: 'Bilangan', zh: '民数记' },
  { num: 5, en: 'Deuteronomy', id: 'Ulangan', zh: '申命记' },
  { num: 6, en: 'Joshua', id: 'Yosua', zh: '约书亚记' },
  { num: 7, en: 'Judges', id: 'Hakim-hakim', zh: '士师记' },
  { num: 8, en: 'Ruth', id: 'Rut', zh: '路得记' },
  { num: 9, en: '1 Samuel', id: '1 Samuel', zh: '撒母耳记上' },
  { num: 10, en: '2 Samuel', id: '2 Samuel', zh: '撒母耳记下' },
  { num: 11, en: '1 Kings', id: '1 Raja-raja', zh: '列王纪上' },
  { num: 12, en: '2 Kings', id: '2 Raja-raja', zh: '列王纪下' },
  { num: 13, en: '1 Chronicles', id: '1 Tawarikh', zh: '历代志上' },
  { num: 14, en: '2 Chronicles', id: '2 Tawarikh', zh: '历代志下' },
  { num: 15, en: 'Ezra', id: 'Ezra', zh: '以斯拉记' },
  { num: 16, en: 'Nehemiah', id: 'Nehemia', zh: '尼希米记' },
  { num: 17, en: 'Esther', id: 'Ester', zh: '以斯帖记' },
  { num: 18, en: 'Job', id: 'Ayub', zh: '约伯记' },
  { num: 19, en: 'Psalms', id: 'Mazmur', zh: '诗篇' },
  { num: 20, en: 'Proverbs', id: 'Amsal', zh: '箴言' },
  { num: 21, en: 'Ecclesiastes', id: 'Pengkhotbah', zh: '传道书' },
  { num: 22, en: 'Song of Solomon', id: 'Kidung Agung', zh: '雅歌' },
  { num: 23, en: 'Isaiah', id: 'Yesaya', zh: '以赛亚书' },
  { num: 24, en: 'Jeremiah', id: 'Yeremia', zh: '耶利米书' },
  { num: 25, en: 'Lamentations', id: 'Ratapan', zh: '耶利米哀歌' },
  { num: 26, en: 'Ezekiel', id: 'Yehezkiel', zh: '以西结书' },
  { num: 27, en: 'Daniel', id: 'Daniel', zh: '但以理书' },
  { num: 28, en: 'Hosea', id: 'Hosea', zh: '何西阿书' },
  { num: 29, en: 'Joel', id: 'Yoel', zh: '约珥书' },
  { num: 30, en: 'Amos', id: 'Amos', zh: '阿摩司书' },
  { num: 31, en: 'Obadiah', id: 'Obaja', zh: '俄巴底亚书' },
  { num: 32, en: 'Jonah', id: 'Yunus', zh: '约拿书' },
  { num: 33, en: 'Micah', id: 'Mikha', zh: '弥迦书' },
  { num: 34, en: 'Nahum', id: 'Nahum', zh: '那鸿书' },
  { num: 35, en: 'Habakkuk', id: 'Habakuk', zh: '哈巴谷书' },
  { num: 36, en: 'Zephaniah', id: 'Zefanya', zh: '西番雅书' },
  { num: 37, en: 'Haggai', id: 'Hagai', zh: '哈该书' },
  { num: 38, en: 'Zechariah', id: 'Zakharia', zh: '撒迦利亚书' },
  { num: 39, en: 'Malachi', id: 'Maleakhi', zh: '玛拉基书' },
  { num: 40, en: 'Matthew', id: 'Matius', zh: '马太福音' },
  { num: 41, en: 'Mark', id: 'Markus', zh: '马可福音' },
  { num: 42, en: 'Luke', id: 'Lukas', zh: '路加福音' },
  { num: 43, en: 'John', id: 'Yohanes', zh: '约翰福音' },
  { num: 44, en: 'Acts', id: 'Kisah Para Rasul', zh: '使徒行传' },
  { num: 45, en: 'Romans', id: 'Roma', zh: '罗马书' },
  { num: 46, en: '1 Corinthians', id: '1 Korintus', zh: '哥林多前书' },
  { num: 47, en: '2 Corinthians', id: '2 Korintus', zh: '哥林多后书' },
  { num: 48, en: 'Galatians', id: 'Galatia', zh: '加拉太书' },
  { num: 49, en: 'Ephesians', id: 'Efesus', zh: '以弗所书' },
  { num: 50, en: 'Philippians', id: 'Filipi', zh: '腓立比书' },
  { num: 51, en: 'Colossians', id: 'Kolose', zh: '歌罗西书' },
  { num: 52, en: '1 Thessalonians', id: '1 Tesalonika', zh: '帖撒罗尼迦前书' },
  { num: 53, en: '2 Thessalonians', id: '2 Tesalonika', zh: '帖撒罗尼迦后书' },
  { num: 54, en: '1 Timothy', id: '1 Timotius', zh: '提摩太前书' },
  { num: 55, en: '2 Timothy', id: '2 Timotius', zh: '提摩太后书' },
  { num: 56, en: 'Titus', id: 'Titus', zh: '提多书' },
  { num: 57, en: 'Philemon', id: 'Filemon', zh: '腓利门书' },
  { num: 58, en: 'Hebrews', id: 'Ibrani', zh: '希伯来书' },
  { num: 59, en: 'James', id: 'Yakobus', zh: '雅各书' },
  { num: 60, en: '1 Peter', id: '1 Petrus', zh: '彼得前书' },
  { num: 61, en: '2 Peter', id: '2 Petrus', zh: '彼得后书' },
  { num: 62, en: '1 John', id: '1 Yohanes', zh: '约翰一书' },
  { num: 63, en: '2 John', id: '2 Yohanes', zh: '约翰二书' },
  { num: 64, en: '3 John', id: '3 Yohanes', zh: '约翰三书' },
  { num: 65, en: 'Jude', id: 'Yudas', zh: '犹大书' },
  { num: 66, en: 'Revelation', id: 'Wahyu', zh: '启示录' },
];

const BOOK_TO_NUMBER = new Map<string, number>();
CANONICAL_BOOKS.forEach((book) => {
  BOOK_TO_NUMBER.set(book.en, book.num);
  BOOK_TO_NUMBER.set(book.id, book.num);
  BOOK_TO_NUMBER.set(book.zh, book.num);
  // Handle case variations
  BOOK_TO_NUMBER.set(book.en.toLowerCase(), book.num);
});

// Handle common variations
BOOK_TO_NUMBER.set('Psalm', 19); // Singular form
BOOK_TO_NUMBER.set('Song Of Solomon', 22); // Different capitalization

// ====================================================================
// FORMAT DETECTION & NORMALIZATION
// ====================================================================

/**
 * Detect Bible JSON format
 */
function detectFormat(data: any): 'nested' | 'flat' | 'unknown' {
  if (data.metadata && Array.isArray(data.verses)) {
    return 'flat'; // Indonesian/Chinese format
  }

  const keys = Object.keys(data);
  if (keys.length > 0 && typeof data[keys[0]] === 'object') {
    return 'nested'; // English format
  }

  return 'unknown';
}

/**
 * Normalize nested format (English Bibles)
 */
function normalizeNested(data: any, versionCode: string): MinBible {
  console.log(`   📖 Normalizing nested format (English)...`);

  const books: MinBook[] = [];
  const warnings: string[] = [];

  for (const [bookName, chapters] of Object.entries(data)) {
    const bookNum = BOOK_TO_NUMBER.get(bookName);

    if (!bookNum) {
      warnings.push(`Unknown book: "${bookName}"`);
      continue;
    }

    const minChapters: MinChapter[] = [];

    for (const [chapterStr, verses] of Object.entries(chapters as any)) {
      const chapterNum = parseInt(chapterStr);
      const minVerses: MinVerse[] = [];

      for (const [verseStr, text] of Object.entries(verses as any)) {
        const verseNum = parseInt(verseStr);

        if (!text || typeof text !== 'string') {
          warnings.push(`Missing text: ${bookName} ${chapterNum}:${verseNum}`);
          continue;
        }

        minVerses.push({ v: verseNum, t: text.trim() });
      }

      // Sort verses
      minVerses.sort((a, b) => a.v - b.v);

      // Validate sequential numbering
      for (let i = 0; i < minVerses.length; i++) {
        if (minVerses[i].v !== i + 1) {
          warnings.push(`Non-sequential verse: ${bookName} ${chapterNum}:${minVerses[i].v} (expected ${i + 1})`);
        }
      }

      minChapters.push({ c: chapterNum, vv: minVerses });
    }

    // Sort chapters
    minChapters.sort((a, b) => a.c - b.c);

    books.push({
      b: bookNum,
      n: bookName,
      cc: minChapters,
    });
  }

  // Sort books by canonical order
  books.sort((a, b) => a.b - b.b);

  // Print warnings
  if (warnings.length > 0) {
    console.log(`   ⚠️  ${warnings.length} warnings:`);
    warnings.slice(0, 5).forEach((w) => console.log(`      - ${w}`));
    if (warnings.length > 5) {
      console.log(`      ... and ${warnings.length - 5} more`);
    }
  }

  const totalVerses = books.reduce(
    (sum, b) => sum + b.cc.reduce((s, c) => s + c.vv.length, 0),
    0
  );
  console.log(`   ✅ Extracted ${totalVerses.toLocaleString()} verses from ${books.length} books`);

  return {
    v: versionCode,
    name: `${versionCode} Bible`,
    lang: 'en',
    bb: books,
  };
}

/**
 * Normalize flat format (Indonesian/Chinese Bibles)
 */
function normalizeFlatFormat(data: any): MinBible {
  console.log(`   📖 Normalizing flat format (Indonesian/Chinese)...`);

  const bookMap = new Map<number, Map<number, MinVerse[]>>();
  const warnings: string[] = [];

  // Group verses by book and chapter
  for (const verse of data.verses) {
    const bookNum = verse.book;
    const chapterNum = verse.chapter;
    const verseNum = verse.verse;
    const text = verse.text;

    if (!text || typeof text !== 'string') {
      warnings.push(`Missing text: Book ${bookNum}, ${chapterNum}:${verseNum}`);
      continue;
    }

    if (!bookMap.has(bookNum)) {
      bookMap.set(bookNum, new Map());
    }

    if (!bookMap.get(bookNum)!.has(chapterNum)) {
      bookMap.get(bookNum)!.set(chapterNum, []);
    }

    bookMap.get(bookNum)!.get(chapterNum)!.push({ v: verseNum, t: text.trim() });
  }

  // Build minified structure
  const books: MinBook[] = [];

  for (const [bookNum, chapters] of bookMap.entries()) {
    const minChapters: MinChapter[] = [];

    for (const [chapterNum, verses] of chapters.entries()) {
      // Sort verses
      verses.sort((a, b) => a.v - b.v);

      // Validate sequential numbering
      for (let i = 0; i < verses.length; i++) {
        if (verses[i].v !== i + 1) {
          warnings.push(`Non-sequential verse: Book ${bookNum}, ${chapterNum}:${verses[i].v} (expected ${i + 1})`);
        }
      }

      minChapters.push({ c: chapterNum, vv: verses });
    }

    // Sort chapters
    minChapters.sort((a, b) => a.c - b.c);

    // Get book name from first verse
    const firstVerse = data.verses.find((v: any) => v.book === bookNum);
    const bookName = firstVerse?.book_name || `Book ${bookNum}`;

    books.push({
      b: bookNum,
      n: bookName,
      cc: minChapters,
    });
  }

  // Sort books
  books.sort((a, b) => a.b - b.b);

  // Print warnings
  if (warnings.length > 0) {
    console.log(`   ⚠️  ${warnings.length} warnings:`);
    warnings.slice(0, 5).forEach((w) => console.log(`      - ${w}`));
    if (warnings.length > 5) {
      console.log(`      ... and ${warnings.length - 5} more`);
    }
  }

  const totalVerses = books.reduce(
    (sum, b) => sum + b.cc.reduce((s, c) => s + c.vv.length, 0),
    0
  );
  console.log(`   ✅ Extracted ${totalVerses.toLocaleString()} verses from ${books.length} books`);

  return {
    v: data.metadata.shortname || data.metadata.module,
    name: data.metadata.name,
    lang: data.metadata.lang_short,
    bb: books,
  };
}

/**
 * Build search index
 */
function buildSearchIndex(bible: MinBible): any {
  console.log(`   🔍 Building search index...`);

  const searchEntries: SearchEntry[] = [];

  for (const book of bible.bb) {
    for (const chapter of book.cc) {
      for (const verse of chapter.vv) {
        searchEntries.push({
          b: book.b,
          c: chapter.c,
          v: verse.v,
          t: verse.t,
        });
      }
    }
  }

  // Build Fuse.js index
  const fuse = new Fuse(searchEntries, {
    keys: ['t'],
    threshold: 0.3,
    minMatchCharLength: 3,
    includeScore: false,
    useExtendedSearch: false,
  });

  // Export index data (Fuse internal structure)
  const index = (fuse as any)._docs; // Access internal index

  console.log(`   ✅ Indexed ${searchEntries.length.toLocaleString()} verses`);

  return { entries: index };
}

// ====================================================================
// MAIN PIPELINE
// ====================================================================

async function main() {
  console.log('================================================================');
  console.log('📚 Bible Asset Builder - Production Pipeline');
  console.log('================================================================\n');

  const SOURCE_DIR = path.join(__dirname, '../../backend/data/bible');
  const OUTPUT_DIR = path.join(__dirname, '../assets/bible-optimized');
  const INDEX_DIR = path.join(__dirname, '../assets/bible-index');

  // Create output directories
  [OUTPUT_DIR, INDEX_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const bibles = [
    { file: 'niv.json', code: 'NIV', name: 'New International Version' },
    { file: 'esv.json', code: 'ESV', name: 'English Standard Version' },
    { file: 'nkjv.json', code: 'NKJV', name: 'New King James Version' },
    { file: 'nlt.json', code: 'NLT', name: 'New Living Translation' },
    { file: 'indo_tb.json', code: 'TB', name: 'Terjemahan Baru' },
    { file: 'chinese_union_simp.json', code: 'CHS', name: 'Chinese Union Simplified' },
  ];

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  for (const bible of bibles) {
    const sourcePath = path.join(SOURCE_DIR, bible.file);
    const outputPath = path.join(OUTPUT_DIR, `${bible.code.toLowerCase()}.json`);
    const indexPath = path.join(INDEX_DIR, `${bible.code.toLowerCase()}.idx.json`);

    if (!fs.existsSync(sourcePath)) {
      console.log(`⏭️  Skipping ${bible.code} (file not found)\n`);
      continue;
    }

    console.log(`\n📖 Processing ${bible.code}...`);

    try {
      // Read source
      const sourceSize = fs.statSync(sourcePath).size;
      totalOriginalSize += sourceSize;
      console.log(`   📂 Source: ${(sourceSize / 1024 / 1024).toFixed(1)}MB`);

      const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

      // Detect format
      const format = detectFormat(raw);
      console.log(`   🔍 Format detected: ${format}`);

      // Normalize
      let normalized: MinBible;
      if (format === 'nested') {
        normalized = normalizeNested(raw, bible.code);
      } else if (format === 'flat') {
        normalized = normalizeFlatFormat(raw);
      } else {
        console.log(`   ❌ Unknown format, skipping\n`);
        continue;
      }

      // Write optimized Bible
      const optimized = JSON.stringify(normalized);
      fs.writeFileSync(outputPath, optimized);
      const optimizedSize = fs.statSync(outputPath).size;
      totalOptimizedSize += optimizedSize;

      console.log(`   💾 Optimized: ${(optimizedSize / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   📉 Reduction: ${(((sourceSize - optimizedSize) / sourceSize) * 100).toFixed(1)}%`);

      // Build search index
      const searchIndex = buildSearchIndex(normalized);
      fs.writeFileSync(indexPath, JSON.stringify(searchIndex));
      const indexSize = fs.statSync(indexPath).size;

      console.log(`   🔍 Index: ${(indexSize / 1024).toFixed(0)}KB`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  console.log('\n================================================================');
  console.log('📊 Summary');
  console.log('================================================================');
  console.log(`Original total:  ${(totalOriginalSize / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Optimized total: ${(totalOptimizedSize / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Total savings:   ${(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)}%`);
  console.log('\n✅ Build complete!');
  console.log('\n💡 You can now safely delete:');
  console.log('   - /mobile/assets/bible/*.json (raw files)');
  console.log('   - /mobile/assets/bible/normalized/*.json (old normalized files)');
  console.log('\n📦 Mobile app will use:');
  console.log('   - /mobile/assets/bible-optimized/*.json (minified Bibles)');
  console.log('   - /mobile/assets/bible-index/*.idx.json (search indexes)');
  console.log('================================================================\n');
}

main().catch(console.error);
