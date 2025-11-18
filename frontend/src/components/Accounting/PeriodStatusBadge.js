import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

const PeriodStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const colorMap = {
    'open': 'bg-green-100 text-green-800 border-green-200',
    'closed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'locked': 'bg-red-100 text-red-800 border-red-200'
  };

  const translationMap = {
    'open': t('accounting.fiscalPeriod.open'),
    'closed': t('accounting.fiscalPeriod.closed'),
    'locked': t('accounting.fiscalPeriod.locked')
  };

  return (
    <Badge variant="outline" className={colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
      {translationMap[status] || status}
    </Badge>
  );
};

export default PeriodStatusBadge;
