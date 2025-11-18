import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useArticles';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const CategorySelector = ({ value = [], onChange, label }) => {
  const { t } = useTranslation();
  const { data: categories, isLoading } = useCategories();

  const selectedCategories = categories?.filter(cat => value.includes(cat.id)) || [];
  const availableCategories = categories?.filter(cat => !value.includes(cat.id)) || [];

  const handleAdd = (categoryId) => {
    if (!value.includes(categoryId)) {
      onChange([...value, categoryId]);
    }
  };

  const handleRemove = (categoryId) => {
    onChange(value.filter(id => id !== categoryId));
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCategories.map((cat) => (
          <Badge key={cat.id} variant="secondary" className="flex items-center gap-1">
            {cat.name}
            <X
              className="w-3 h-3 cursor-pointer"
              onClick={() => handleRemove(cat.id)}
            />
          </Badge>
        ))}
      </div>

      <Select onValueChange={handleAdd} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={t('articles.categories.selectCategories')} />
        </SelectTrigger>
        <SelectContent>
          {availableCategories.length === 0 ? (
            <SelectItem value="_none" disabled>
              {t('articles.categories.noCategories')}
            </SelectItem>
          ) : (
            availableCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategorySelector;
