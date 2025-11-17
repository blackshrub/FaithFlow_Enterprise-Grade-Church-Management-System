import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function OnsiteRSVPModal({ data, onConfirm, onClose }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('events.kiosk.notRegistered')}
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-8">
          <p className="text-lg text-gray-700 mb-4">
            {t('events.kiosk.notRegisteredMessage', { name: data.member_name })}
          </p>
          <p className="text-md text-gray-600">
            {t('events.kiosk.onsiteRSVPQuestion')}
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-14 text-lg"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
          >
            {t('events.kiosk.onsiteRSVP')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OnsiteRSVPModal;
