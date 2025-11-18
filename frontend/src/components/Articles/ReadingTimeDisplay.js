import React from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ReadingTimeDisplay = ({ readingTime }) => {
  const { t } = useTranslation();

  if (!readingTime || readingTime <= 0) return null;

  return (
    <div className="flex items-center text-sm text-gray-600">
      <Clock className="w-4 h-4 mr-1" />
      <span>{readingTime} {t('articles.minRead')}</span>
    </div>
  );
};

export default ReadingTimeDisplay;
