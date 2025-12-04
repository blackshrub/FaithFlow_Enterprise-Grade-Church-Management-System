/**
 * Table Skeleton Loader Component
 *
 * Provides loading placeholder for data tables with configurable rows and columns.
 * Uses shimmer animation for a polished loading experience.
 */
import React from 'react';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

/**
 * TableSkeleton - Full table skeleton with header and rows
 * @param {Object} props
 * @param {number} props.rows - Number of skeleton rows (default: 5)
 * @param {number} props.columns - Number of columns (default: 5)
 * @param {boolean} props.showCheckbox - Show checkbox column (default: false)
 * @param {boolean} props.showAvatar - Show avatar in first data column (default: false)
 * @param {string[]} props.headers - Optional header labels
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  showCheckbox = false,
  showAvatar = false,
  headers = []
}) {
  const effectiveColumns = showCheckbox ? columns + 1 : columns;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showCheckbox && (
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4" />
            </TableHead>
          )}
          {Array.from({ length: columns }).map((_, idx) => (
            <TableHead key={idx}>
              {headers[idx] ? (
                <span className="text-gray-400">{headers[idx]}</span>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <TableRow key={rowIdx}>
            {showCheckbox && (
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
            )}
            {Array.from({ length: columns }).map((_, colIdx) => (
              <TableCell key={colIdx}>
                {colIdx === 0 && showAvatar ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ) : colIdx === columns - 1 ? (
                  // Actions column - smaller buttons
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ) : (
                  <Skeleton className="h-4 w-full max-w-[150px]" />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * CardSkeleton - Skeleton for card-based layouts
 */
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ListSkeleton - Skeleton for list items
 */
export function ListSkeleton({ count = 5, showAvatar = true }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-4 p-3 bg-white rounded-lg">
          {showAvatar && <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * StatsSkeleton - Skeleton for stats/dashboard cards
 */
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export default TableSkeleton;
