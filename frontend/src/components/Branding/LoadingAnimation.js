import React, { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';

function LoadingAnimation({ message }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(true);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center">
        {/* Pulse Ripple Animation */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-blue-600 rounded-full opacity-75 animate-ping" />
          <div className="absolute inset-0 bg-blue-600 rounded-full opacity-75 animate-pulse" />
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <p className="text-xl font-semibold text-gray-900 mb-2">
          Faith<span className="text-blue-600">Flow</span>
        </p>
        <p className="text-sm text-gray-600">
          {message || 'Loading...'}
        </p>
      </div>
    </div>
  );
}

export default LoadingAnimation;
