import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

const ArticleStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const colorMap = {
    'draft': 'bg-gray-100 text-gray-800 border-gray-200',
    'published': 'bg-green-100 text-green-800 border-green-200',
    'archived': 'bg-red-100 text-red-800 border-red-200'
  };

  const translationMap = {
    'draft': t('articles.draft'),
    'published': t('articles.published'),
    'archived': t('articles.archived')
  };

  return (
    <Badge variant="outline" className={colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
      {translationMap[status] || status}
    </Badge>
  );
};

export default ArticleStatusBadge;
