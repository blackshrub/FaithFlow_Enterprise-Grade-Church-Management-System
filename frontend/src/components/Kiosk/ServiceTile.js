/**
 * Service Tile Component
 *
 * Vertical stacked design for kiosk home services
 * Icon on top, title and description below
 * Supports highlight prop for special golden styling (e.g., Accept Jesus)
 */

import React from 'react';
import { motion } from 'framer-motion';

const ServiceTile = ({ icon: Icon, title, description, onClick, disabled = false, highlight = false }) => {
  // Dynamic classes based on highlight prop
  const bgClass = highlight
    ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 shadow-amber-100'
    : 'bg-white border border-gray-100';

  const iconBgClass = highlight
    ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200'
    : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200';

  const titleClass = highlight
    ? 'text-amber-900'
    : 'text-gray-900';

  const descClass = highlight
    ? 'text-amber-700/80'
    : 'text-gray-500';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full h-full ${bgClass} rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center`}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {/* Highlight glow effect for Accept Jesus */}
      {highlight && (
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Icon Container */}
      <div className={`relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ${iconBgClass} rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 transition-transform duration-300`}>
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" strokeWidth={1.8} />

        {/* Highlight badge */}
        {highlight && (
          <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-sm sm:text-base">✝</span>
          </div>
        )}
      </div>

      {/* Title - large for kiosk readability */}
      <h3 className={`text-base sm:text-lg lg:text-xl font-bold ${titleClass} leading-tight line-clamp-2`}>
        {title}
      </h3>

      {/* Description - visible on tablet and up */}
      {description && (
        <p className={`hidden sm:block text-sm lg:text-base mt-1 sm:mt-2 ${descClass} leading-snug line-clamp-2`}>
          {description}
        </p>
      )}
    </motion.button>
  );
};

export default ServiceTile;
