/**
 * Service Tile Component
 *
 * Large, friendly tile for kiosk home services
 * Fixed height for uniform card sizes
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const ServiceTile = ({ icon: Icon, title, description, onClick, disabled = false }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full h-full min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3 sm:gap-4 lg:gap-6 h-full">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 sm:w-18 sm:h-18 lg:w-24 lg:h-24 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Icon className="w-7 h-7 sm:w-9 sm:h-9 lg:w-12 lg:h-12 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              {description}
            </p>
          )}
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 self-center">
          <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.button>
  );
};

export default ServiceTile;
