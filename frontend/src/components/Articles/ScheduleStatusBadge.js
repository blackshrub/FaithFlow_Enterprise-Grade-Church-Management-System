import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

const ScheduleStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const colorMap = {
    'none': 'bg-gray-100 text-gray-800 border-gray-200',
    'scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
    'running': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'failed': 'bg-red-100 text-red-800 border-red-200'
  };

  const translationMap = {
    'none': t('articles.scheduling.none'),
    'scheduled': t('articles.scheduling.scheduled'),
    'running': t('articles.scheduling.running'),
    'completed': t('articles.scheduling.completed'),
    'failed': t('articles.scheduling.failed')
  };

  return (
    <Badge variant="outline" className={colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
      {translationMap[status] || status}
    </Badge>
  );
};

export default ScheduleStatusBadge;
