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
import { useArticles, useDeleteArticle, useDuplicateArticle } from '../../hooks/useArticles';
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
          <CardTitle>{t('articles.allArticles')} ({articlesData?.pagination?.total || 0})</CardTitle>
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
                  <TableHead>{t('articles.articleTitle')}</TableHead>
                  <TableHead>{t('articles.status')}</TableHead>
                  <TableHead>{t('articles.publishDate')}</TableHead>
                  <TableHead>{t('articles.readingTime')}</TableHead>
                  <TableHead>{t('articles.views')}</TableHead>
                  <TableHead>{t('articles.scheduling.scheduleStatus')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>
                      <ArticleStatusBadge status={article.status} />
                    </TableCell>
                    <TableCell>
                      {article.publish_date 
                        ? new Date(article.publish_date).toLocaleDateString('id-ID')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <ReadingTimeDisplay readingTime={article.reading_time} />
                    </TableCell>
                    <TableCell>{article.views_count || 0}</TableCell>
                    <TableCell>
                      <ScheduleStatusBadge status={article.schedule_status} />
                    </TableCell>
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
                          onClick={() => handleDelete(article.id, article.title)}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
