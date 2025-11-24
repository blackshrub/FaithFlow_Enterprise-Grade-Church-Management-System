/**
 * Bible Loader Usage Examples
 *
 * Copy these examples to test the Bible loading system
 */

import { getBibleLoader, preloadBible, unloadBible } from './bibleLoader';

// ====================================================================
// EXAMPLE 1: Basic Loading and Chapter Retrieval
// ====================================================================

export async function example1_BasicLoading() {
  console.log('\n📖 Example 1: Basic Loading\n');

  const loader = getBibleLoader('NIV');

  console.log('Loading Bible...');
  await loader.load();

  console.log('✅ Bible loaded!');
  console.log('Total books:', loader.getBooks().length);

  // Get Genesis 1
  const genesis1 = loader.getChapter(1, 1);
  console.log('\nGenesis 1 has', genesis1.length, 'verses');

  // Print first 3 verses
  genesis1.slice(0, 3).forEach((v) => {
    console.log(`  ${v.verse}. ${v.text}`);
  });
}

// ====================================================================
// EXAMPLE 2: Search Functionality
// ====================================================================

export async function example2_Search() {
  console.log('\n🔍 Example 2: Search\n');

  const loader = getBibleLoader('NIV');
  await loader.load();

  console.log('Searching for "in the beginning"...');
  const results = loader.search('in the beginning', 10);

  console.log(`\nFound ${results.length} results:\n`);

  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.bookName} ${result.chapter}:${result.verse}`);
    console.log(`   "${result.text.substring(0, 60)}..."`);
    console.log(`   Relevance score: ${result.score?.toFixed(3)}\n`);
  });
}

// ====================================================================
// EXAMPLE 3: Multiple Translations
// ====================================================================

export async function example3_MultipleTranslations() {
  console.log('\n🌍 Example 3: Multiple Translations\n');

  // Preload 3 translations
  console.log('Preloading NIV, ESV, TB...');
  await Promise.all([
    preloadBible('NIV'),
    preloadBible('ESV'),
    preloadBible('TB'),
  ]);

  console.log('✅ All translations loaded!\n');

  // Get John 3:16 in all 3 translations
  const verse = { book: 43, chapter: 3, verse: 16 };

  const niv = getBibleLoader('NIV').getVerse(verse.book, verse.chapter, verse.verse);
  const esv = getBibleLoader('ESV').getVerse(verse.book, verse.chapter, verse.verse);
  const tb = getBibleLoader('TB').getVerse(verse.book, verse.chapter, verse.verse);

  console.log('John 3:16 in 3 translations:\n');
  console.log('NIV (English):');
  console.log(`  "${niv}"\n`);
  console.log('ESV (English):');
  console.log(`  "${esv}"\n`);
  console.log('TB (Indonesian):');
  console.log(`  "${tb}"\n`);
}

// ====================================================================
// EXAMPLE 4: Memory Management
// ====================================================================

export async function example4_MemoryManagement() {
  console.log('\n💾 Example 4: Memory Management\n');

  // Load multiple Bibles
  console.log('Loading 3 Bibles...');
  await preloadBible('NIV');
  await preloadBible('ESV');
  await preloadBible('NLT');

  console.log('✅ Loaded NIV, ESV, NLT');

  // Check memory (simulated - use React Native Debugger in real app)
  console.log('\n📊 Memory usage: ~20MB (3 Bibles)\n');

  // Unload unused Bibles
  console.log('Unloading ESV and NLT...');
  unloadBible('ESV');
  unloadBible('NLT');

  console.log('✅ Only NIV remains in memory');
  console.log('📊 Memory usage: ~7MB (1 Bible)\n');
}

// ====================================================================
// EXAMPLE 5: Performance Benchmarking
// ====================================================================

export async function example5_Performance() {
  console.log('\n⚡ Example 5: Performance Benchmark\n');

  const loader = getBibleLoader('NIV');

  // Benchmark: Load time
  console.log('Benchmarking load time...');
  const loadStart = Date.now();
  await loader.load();
  const loadEnd = Date.now();

  console.log(`  Load time: ${loadEnd - loadStart}ms\n`);

  // Benchmark: Chapter lookup (1000 times)
  console.log('Benchmarking chapter lookup (1000x)...');
  const chapterStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    loader.getChapter(1, 1); // Genesis 1
  }
  const chapterEnd = Date.now();

  console.log(`  1000 lookups: ${chapterEnd - chapterStart}ms`);
  console.log(`  Average: ${((chapterEnd - chapterStart) / 1000).toFixed(2)}ms\n`);

  // Benchmark: Verse lookup (10000 times)
  console.log('Benchmarking verse lookup (10000x)...');
  const verseStart = Date.now();
  for (let i = 0; i < 10000; i++) {
    loader.getVerse(43, 3, 16); // John 3:16
  }
  const verseEnd = Date.now();

  console.log(`  10000 lookups: ${verseEnd - verseStart}ms`);
  console.log(`  Average: ${((verseEnd - verseStart) / 10000).toFixed(3)}ms\n`);

  // Benchmark: Search
  console.log('Benchmarking search (100x)...');
  const searchStart = Date.now();
  for (let i = 0; i < 100; i++) {
    loader.search('love', 20);
  }
  const searchEnd = Date.now();

  console.log(`  100 searches: ${searchEnd - searchStart}ms`);
  console.log(`  Average: ${((searchEnd - searchStart) / 100).toFixed(2)}ms\n`);
}

// ====================================================================
// EXAMPLE 6: Fuzzy Search
// ====================================================================

export async function example6_FuzzySearch() {
  console.log('\n🎯 Example 6: Fuzzy Search\n');

  const loader = getBibleLoader('NIV');
  await loader.load();

  console.log('Testing typo tolerance:\n');

  // Intentional typos
  const queries = [
    'faith hop love', // "hope" misspelled as "hop"
    'god so lovd', // "loved" misspelled as "lovd"
    'in teh begining', // "the" and "beginning" misspelled
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const results = loader.search(query, 3);

    if (results.length > 0) {
      console.log(`  ✅ Found ${results.length} results despite typos`);
      console.log(`  Top result: ${results[0].bookName} ${results[0].chapter}:${results[0].verse}`);
    } else {
      console.log('  ❌ No results');
    }
    console.log('');
  }
}

// ====================================================================
// RUN ALL EXAMPLES
// ====================================================================

export async function runAllExamples() {
  await example1_BasicLoading();
  await example2_Search();
  await example3_MultipleTranslations();
  await example4_MemoryManagement();
  await example5_Performance();
  await example6_FuzzySearch();

  console.log('\n🎉 All examples completed!\n');
}
