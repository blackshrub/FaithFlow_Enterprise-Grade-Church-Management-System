import React from 'react';
import { Church } from 'lucide-react';

function FaithFlowLogo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 'h-6 w-6', text: 'text-lg' },
    md: { icon: 'h-8 w-8', text: 'text-2xl' },
    lg: { icon: 'h-12 w-12', text: 'text-4xl' },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-3">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-2">
        <Church className={`${currentSize.icon} text-white`} />
      </div>
      {showText && (
        <span className={`${currentSize.text} font-bold text-gray-900`}>
          Faith<span className="text-blue-600">Flow</span>
        </span>
      )}
    </div>
  );
}

export default FaithFlowLogo;
