import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function OnsiteRSVPModal({ data, onConfirm, onClose }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-start mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-yellow-100 rounded-full p-2 sm:p-3">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {t('events.kiosk.notRegistered')}
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        <div className="mb-6 sm:mb-8">
          <p className="text-base sm:text-lg text-gray-700 mb-3 sm:mb-4">
            {t('events.kiosk.notRegisteredMessage', { name: data.member_name })}
          </p>
          <p className="text-sm sm:text-base text-gray-600">
            {t('events.kiosk.onsiteRSVPQuestion')}
          </p>
        </div>

        <div className="flex gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 sm:h-14 text-sm sm:text-lg"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-11 sm:h-14 text-sm sm:text-lg bg-green-600 hover:bg-green-700"
          >
            {t('events.kiosk.onsiteRSVP')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OnsiteRSVPModal;
