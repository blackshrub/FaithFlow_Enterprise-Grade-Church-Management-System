import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTags, useCreateTag } from '../../hooks/useArticles';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { X } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const TagSelector = ({ value = [], onChange, label }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: tags, isLoading } = useTags();
  const createTagMutation = useCreateTag();
  const [inputValue, setInputValue] = useState('');

  const selectedTags = tags?.filter(tag => value.includes(tag.id)) || [];

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      
      // Check if tag already exists
      const existingTag = tags?.find(t => t.name.toLowerCase() === inputValue.toLowerCase());
      
      if (existingTag) {
        // Add existing tag
        if (!value.includes(existingTag.id)) {
          onChange([...value, existingTag.id]);
        }
        setInputValue('');
      } else {
        // Create new tag
        try {
          const response = await createTagMutation.mutateAsync({
            name: inputValue.trim()
          });
          
          const newTag = response.data;
          onChange([...value, newTag.id]);
          setInputValue('');
          
          toast({
            title: t('common.success'),
            description: `Tag "${inputValue}" created`
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: t('common.error'),
            description: error.message
          });
        }
      }
    }
  };

  const handleRemove = (tagId) => {
    onChange(value.filter(id => id !== tagId));
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="outline" className="flex items-center gap-1">
            {tag.name}
            <X
              className="w-3 h-3 cursor-pointer"
              onClick={() => handleRemove(tag.id)}
            />
          </Badge>
        ))}
      </div>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('articles.tagsManagement.inlineCreate')}
        disabled={isLoading || createTagMutation.isPending}
      />
      <p className="text-xs text-gray-500">{t('articles.tagsManagement.inlineCreate')}</p>
    </div>
  );
};

export default TagSelector;
