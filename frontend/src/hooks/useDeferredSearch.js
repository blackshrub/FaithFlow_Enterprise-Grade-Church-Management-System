/**
 * React 19 Deferred Search Hook
 *
 * Uses React 19's useDeferredValue to provide smooth search UX:
 * - Immediate input feedback (no input lag)
 * - Deferred query updates (prevents excessive re-renders)
 * - Loading indicator when search is pending
 *
 * Usage:
 *   const { searchValue, setSearchValue, deferredValue, isSearchPending } = useDeferredSearch();
 *   <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
 *   {isSearchPending && <Spinner />}
 *   // Use deferredValue for API queries
 */
import { useState, useDeferredValue, useCallback } from 'react';

export function useDeferredSearch(initialValue = '') {
  const [searchValue, setSearchValue] = useState(initialValue);

  // React 19's useDeferredValue defers updates during rendering
  // This provides a smooth typing experience without blocking the UI
  const deferredValue = useDeferredValue(searchValue);

  // Check if search is still pending (input !== deferred)
  const isSearchPending = searchValue !== deferredValue;

  // Clear search helper
  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  return {
    searchValue,         // The current input value (immediate)
    setSearchValue,      // Setter for the search input
    deferredValue,       // The deferred value (for queries)
    isSearchPending,     // True while search is pending
    clearSearch          // Helper to clear search
  };
}

export default useDeferredSearch;
