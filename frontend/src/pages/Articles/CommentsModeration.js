import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

export default function CommentsModeration() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('articles.comments.title')}</h1>
          <p className="text-gray-600">{t('articles.comments.manageComments')}</p>
        </div>
        <MessageSquare className="w-12 h-12 text-blue-600" />
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('articles.comments.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="pending">{t('articles.comments.pending')}</SelectItem>
              <SelectItem value="approved">{t('articles.comments.approved')}</SelectItem>
              <SelectItem value="spam">{t('articles.comments.spam')}</SelectItem>
              <SelectItem value="trash">{t('articles.comments.trash')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('articles.comments.title')}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>{t('articles.comments.noComments')}</p>
            <p className="text-sm mt-2">Comments will appear here when articles receive comments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
