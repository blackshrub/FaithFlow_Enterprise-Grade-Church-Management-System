import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses', labelId: 'Semua Status' },
  { value: 'new', label: 'New', labelId: 'Baru' },
  { value: 'contacted', label: 'Contacted', labelId: 'Dihubungi' },
  { value: 'scheduled', label: 'Scheduled', labelId: 'Dijadwalkan' },
  { value: 'completed', label: 'Completed', labelId: 'Selesai' },
  { value: 'cancelled', label: 'Cancelled', labelId: 'Dibatalkan' },
];

const RequestFilters = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onClearFilters,
}) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';

  const hasActiveFilters = search || (status && status !== 'all');

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t('requestForms.searchPlaceholder', 'Search by name or phone...')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Filter */}
      <Select value={status || 'all'} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder={t('requestForms.filterByStatus', 'Filter by status')} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {isIndonesian ? option.labelId : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default RequestFilters;
