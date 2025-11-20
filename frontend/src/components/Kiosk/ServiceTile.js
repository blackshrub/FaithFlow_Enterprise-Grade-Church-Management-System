/**
 * Service Tile Component
 * 
 * Large, friendly tile for kiosk home services
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const ServiceTile = ({ icon: Icon, title, description, onClick, disabled = false }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Icon className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-lg text-gray-600">
              {description}
            </p>
          )}
        </div>
        
        {/* Arrow */}
        <div className="flex-shrink-0 self-center">
          <ChevronRight className="w-8 h-8 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.button>
  );
};

export default ServiceTile;
