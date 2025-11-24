/**
 * Verse Range Formatting Utilities
 *
 * Formats verse ranges intelligently:
 * - [1, 2, 3] → "1-3"
 * - [1, 2, 5] → "1-2, 5"
 * - [1, 3, 5] → "1, 3, 5"
 * - [1] → "1"
 */

/**
 * Format an array of verse numbers into a smart range string
 * Examples:
 * - [1, 2, 3, 4, 5] → "1-5"
 * - [1, 2, 5] → "1-2, 5"
 * - [1, 3, 5, 7] → "1, 3, 5, 7"
 * - [1, 2, 3, 7, 8, 9] → "1-3, 7-9"
 */
export function formatVerseRange(verses: number[]): string {
  if (verses.length === 0) return '';
  if (verses.length === 1) return verses[0].toString();

  // Sort verses to ensure correct ordering
  const sorted = [...verses].sort((a, b) => a - b);

  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];

    if (current === prev + 1) {
      // Consecutive verse, extend the range
      rangeEnd = current;
    } else {
      // Gap detected, save the current range and start a new one
      if (rangeStart === rangeEnd) {
        // Single verse
        ranges.push(rangeStart.toString());
      } else {
        // Range of verses
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      rangeStart = current;
      rangeEnd = current;
    }
  }

  // Add the last range
  if (rangeStart === rangeEnd) {
    ranges.push(rangeStart.toString());
  } else {
    ranges.push(`${rangeStart}-${rangeEnd}`);
  }

  return ranges.join(', ');
}

/**
 * Format a bookmark reference with smart verse ranges
 * Example: "Genesis 1:1-2, 5"
 */
export function formatBookmarkReference(
  bookName: string,
  chapter: number,
  verse: number,
  endVerse?: number
): string {
  if (!endVerse || endVerse === verse) {
    // Single verse
    return `${bookName} ${chapter}:${verse}`;
  }

  // For now, if we have endVerse, it means a simple range
  // In the future, we could store an array of verses for more complex ranges
  return `${bookName} ${chapter}:${verse}-${endVerse}`;
}

/**
 * Format verse reference from an array of verse numbers
 * Example: formatVerseReferenceFromArray("Genesis", 1, [1, 2, 5]) → "Genesis 1:1-2, 5"
 */
export function formatVerseReferenceFromArray(
  bookName: string,
  chapter: number,
  verses: number[]
): string {
  const verseRange = formatVerseRange(verses);
  return `${bookName} ${chapter}:${verseRange}`;
}
