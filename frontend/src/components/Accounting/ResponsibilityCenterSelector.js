import React from 'react';
import { useTranslation } from 'react-i18next';
import { useResponsibilityCenters } from '../../hooks/useAccounting';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const ResponsibilityCenterSelector = ({ 
  label, 
  value, 
  onChange, 
  required = false 
}) => {
  const { t } = useTranslation();
  const { data: centers, isLoading } = useResponsibilityCenters();

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={t('accounting.common.select')} />
        </SelectTrigger>
        <SelectContent>
          {centers?.map((center) => (
            <SelectItem key={center.id} value={center.id}>
              {center.code} - {center.name} ({t(`accounting.responsibilityCenter.${center.type}`)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ResponsibilityCenterSelector;
