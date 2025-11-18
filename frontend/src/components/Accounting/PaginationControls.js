import React from 'react';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PaginationControls = ({ pagination, onPageChange }) => {
  const { t } = useTranslation();

  if (!pagination) return null;

  const { total, limit, offset, has_more, current_page, total_pages } = pagination;

  const handlePrevious = () => {
    if (offset > 0) {
      onPageChange({ limit, offset: Math.max(0, offset - limit) });
    }
  };

  const handleNext = () => {
    if (has_more) {
      onPageChange({ limit, offset: offset + limit });
    }
  };

  const from = Math.min(offset + 1, total);
  const to = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-gray-700">
        {t('accounting.pagination.showing', { from, to, total })}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={offset === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('accounting.pagination.previous')}
        </Button>
        <div className="text-sm text-gray-700">
          {t('accounting.pagination.page')} {current_page} {t('accounting.pagination.of')} {total_pages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!has_more}
        >
          {t('accounting.pagination.next')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
