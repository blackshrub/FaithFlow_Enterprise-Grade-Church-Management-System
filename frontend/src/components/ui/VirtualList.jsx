/**
 * Virtual List Component
 *
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 * Only renders items visible in the viewport + overscan buffer.
 *
 * Benefits:
 * - Handles 10,000+ items smoothly
 * - Minimal memory footprint
 * - Smooth scrolling
 */
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * VirtualList - Virtualized list for large datasets
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - Render function (item, index) => React.Node
 * @param {number} props.estimateSize - Estimated item height in pixels (default: 60)
 * @param {number} props.overscan - Number of items to render outside viewport (default: 5)
 * @param {string} props.className - Additional CSS classes for container
 */
export function VirtualList({
  items,
  renderItem,
  estimateSize = 60,
  overscan = 5,
  className = '',
  ...props
}) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ contain: 'strict' }}
      {...props}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * VirtualTable - Virtualized table rows for large datasets
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderRow - Render function (item, index) => TableRow
 * @param {number} props.rowHeight - Row height in pixels (default: 56)
 * @param {number} props.overscan - Number of rows to render outside viewport (default: 5)
 * @param {React.Node} props.header - Table header element
 */
export function VirtualTable({
  items,
  renderRow,
  rowHeight = 56,
  overscan = 5,
  header,
  className = '',
  containerHeight = 600,
  ...props
}) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={className} {...props}>
      {header}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: containerHeight, contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${rowHeight}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderRow(items[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
