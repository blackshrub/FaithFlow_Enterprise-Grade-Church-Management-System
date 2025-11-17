import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

function SuccessModal({ name, photo, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-12 max-w-md w-full mx-4 shadow-2xl transform scale-in animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full rounded-full object-cover border-4 border-green-500"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-5xl font-bold text-green-600">
                    {name?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('events.kiosk.checkInComplete')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('events.kiosk.memberCheckedIn', { name })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;
