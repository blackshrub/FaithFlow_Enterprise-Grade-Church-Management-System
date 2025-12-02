import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useArticles, useDeleteArticle, useDuplicateArticle, useUpdateArticle } from '../../hooks/useArticles';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import ArticleStatusBadge from '../../components/Articles/ArticleStatusBadge';
import ScheduleStatusBadge from '../../components/Articles/ScheduleStatusBadge';
import ReadingTimeDisplay from '../../components/Articles/ReadingTimeDisplay';
import QuickEditModal from '../../components/Articles/QuickEditModal';
import { useToast } from '../../hooks/use-toast';

export default function ArticlesList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    status: true,
    publishDate: true,
    readingTime: true,
    views: true,
    scheduleStatus: true,
    actions: true
  });

  const { data: articlesData, isLoading } = useArticles({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    schedule_status: scheduleFilter === 'all' ? undefined : scheduleFilter,
    ...pagination
  });

  const deleteMutation = useDeleteArticle();
  const duplicateMutation = useDuplicateArticle();

  const articles = articlesData?.data || [];

  const toggleSelection = (articleId) => {
    setSelectedArticles(prev =>
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedArticles.length === articles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(articles.map(a => a.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedArticles.length === 0) return;
    if (!window.confirm(`Delete ${selectedArticles.length} articles?`)) return;

    try {
      for (const id of selectedArticles) {
        await deleteMutation.mutateAsync(id);
      }
      toast({ title: t('common.success'), description: `${selectedArticles.length} articles deleted` });
      setSelectedArticles([]);
    } catch (error) {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    }
  };

  const handleDuplicate = async (articleId) => {
    try {
      await duplicateMutation.mutateAsync(articleId);
      toast({ title: t('common.success'), description: t('articles.messages.duplicateSuccess') });
    } catch (error) {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    }
  };

  const handleDelete = async (articleId, title) => {
    if (!window.confirm(t('articles.messages.confirmDelete'))) return;

    try {
      await deleteMutation.mutateAsync(articleId);
      toast({
        title: t('common.success'),
        description: t('articles.messages.deleteSuccess')
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('articles.allArticles')}</h1>
          <p className="text-gray-600">{t('articles.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/articles/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('articles.addNew')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('articles.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="draft">{t('articles.draft')}</SelectItem>
                <SelectItem value="published">{t('articles.published')}</SelectItem>
                <SelectItem value="archived">{t('articles.archived')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('articles.scheduling.scheduleStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="scheduled">{t('articles.scheduling.scheduled')}</SelectItem>
                <SelectItem value="completed">{t('articles.scheduling.completed')}</SelectItem>
                <SelectItem value="failed">{t('articles.scheduling.failed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('articles.allArticles')} ({articlesData?.pagination?.total || 0})</CardTitle>
            {selectedArticles.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                Delete {selectedArticles.length} Selected
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('common.noData')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedArticles.length === articles.length && articles.length > 0}
                      onChange={toggleAllSelection}
                      className="rounded"
                    />
                  </TableHead>
                  {visibleColumns.title && <TableHead>{t('articles.articleTitle')}</TableHead>}
                  {visibleColumns.status && <TableHead>{t('articles.status')}</TableHead>}
                  {visibleColumns.publishDate && <TableHead>{t('articles.publishDate')}</TableHead>}
                  {visibleColumns.readingTime && <TableHead>{t('articles.readingTime')}</TableHead>}
                  {visibleColumns.views && <TableHead>{t('articles.views')}</TableHead>}
                  {visibleColumns.scheduleStatus && <TableHead>{t('articles.scheduling.scheduleStatus')}</TableHead>}
                  {visibleColumns.actions && <TableHead>{t('members.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedArticles.includes(article.id)}
                        onChange={() => toggleSelection(article.id)}
                        className="rounded"
                      />
                    </TableCell>
                    {visibleColumns.title && <TableCell className="font-medium">{article.title}</TableCell>}
                    {visibleColumns.status && (
                      <TableCell>
                        <ArticleStatusBadge status={article.status} />
                      </TableCell>
                    )}
                    {visibleColumns.publishDate && (
                      <TableCell>
                        {article.publish_date 
                          ? new Date(article.publish_date).toLocaleDateString('id-ID')
                          : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.readingTime && (
                      <TableCell>
                        <ReadingTimeDisplay readingTime={article.reading_time} />
                      </TableCell>
                    )}
                    {visibleColumns.views && <TableCell>{article.views_count || 0}</TableCell>}
                    {visibleColumns.scheduleStatus && (
                      <TableCell>
                        <ScheduleStatusBadge status={article.schedule_status} />
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/articles/${article.id}/edit`)}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingArticle(article);
                              setShowQuickEdit(true);
                            }}
                          >
                            Quick Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(article.id)}
                          >
                            {t('articles.duplicate')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(article.id, article.title)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Edit Modal */}
      <QuickEditModal
        open={showQuickEdit}
        onOpenChange={setShowQuickEdit}
        article={editingArticle}
        onSuccess={() => {
          // Proper cache invalidation instead of page reload
          setShowQuickEdit(false);
          setEditingArticle(null);
        }}
      />
    </div>
  );
}
