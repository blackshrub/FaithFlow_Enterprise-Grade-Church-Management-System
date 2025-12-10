import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Printer, QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MemberQRModal({ member, onClose, isLoading }) {
  const { t } = useTranslation();

  const handleDownload = () => {
    if (!member.personal_qr_code) return;
    
    const link = document.createElement('a');
    link.href = member.personal_qr_code;
    link.download = `${member.full_name}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>${member.full_name} - ${t('members.personalQR')}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .code { font-size: 32px; font-weight: bold; color: #3C5AFF; margin: 20px 0; }
            img { max-width: 400px; margin: 20px auto; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>${member.full_name}</h1>
          <p>${t('members.universalID')}</p>
          <div class="code">${member.personal_id_code}</div>
          <img src="${member.personal_qr_code}" alt="QR Code" />
          <p>${t('members.useForCheckIn')}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {t('members.personalQR')}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {member.full_name}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            {t('members.universalID')}
          </p>

          {isLoading ? (
            <div className="py-12">
              <Loader2 className="h-16 w-16 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : member.personal_qr_code ? (
            <>
              <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-200 mb-4">
                <img
                  src={member.personal_qr_code}
                  alt="Personal QR Code"
                  className="w-64 h-64"
                  data-testid="qr-code-image"
                />
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-1">{t('members.memberID')}</p>
                <p className="text-3xl font-bold text-blue-600 font-mono">
                  {member.personal_id_code}
                </p>
              </div>

              <p className="text-xs text-gray-500 mb-6">
                {t('members.useForCheckIn')}
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1"
                  data-testid="download-qr-button"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('members.downloadQR')}
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {t('members.printQR')}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12">
              <QrCode className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {t('members.personalQR')} {t('common.na')}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}

export default MemberQRModal;
