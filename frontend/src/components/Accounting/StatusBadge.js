import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const colorMap = {
    'draft': 'bg-gray-100 text-gray-800 border-gray-200',
    'approved': 'bg-green-100 text-green-800 border-green-200',
    'active': 'bg-blue-100 text-blue-800 border-blue-200',
    'closed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'pending': 'bg-blue-100 text-blue-800 border-blue-200',
    'processing': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'failed': 'bg-red-100 text-red-800 border-red-200'
  };

  const translationMap = {
    'draft': t('accounting.journal.draft'),
    'approved': t('accounting.journal.approved'),
    'active': t('accounting.budget.active')
  };

  return (
    <Badge variant="outline" className={colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
      {translationMap[status] || status}
    </Badge>
  );
};

export default StatusBadge;
