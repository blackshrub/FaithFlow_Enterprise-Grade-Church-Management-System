import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

const PrayerRequestStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const colorMap = {
    'new': 'bg-blue-100 text-blue-800 border-blue-200',
    'prayed': 'bg-green-100 text-green-800 border-green-200'
  };

  const translationMap = {
    'new': t('prayerRequests.statuses.new'),
    'prayed': t('prayerRequests.statuses.prayed')
  };

  return (
    <Badge variant="outline" className={colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
      {translationMap[status] || status}
    </Badge>
  );
};

export default PrayerRequestStatusBadge;
