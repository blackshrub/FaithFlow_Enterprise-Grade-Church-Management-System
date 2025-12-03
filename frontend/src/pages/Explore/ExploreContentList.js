import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Search, Plus, Edit, Trash2, Calendar, Eye, Loader2, AlertCircle
} from 'lucide-react';
import { useExploreContentList, useDeleteExploreContent, useBulkDeleteExploreContent } from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

export default function ExploreContentList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Map URL path names to API content type names
  const urlToApiContentType = {
    'devotion': 'daily_devotion',
    'verse': 'verse_of_the_day',
    'figure': 'bible_figure',
    'quiz': 'daily_quiz',
    'bible_study': 'bible_study',
    'bible-study': 'bible_study',
    'devotion_plan': 'devotion_plan',
    'devotion-plan': 'devotion_plan',
    'topical': 'topical_category',          // /content-center/topical -> categories
    'topical/verses': 'topical_verse',      // /content-center/topical/verses -> verses
    'topical_verse': 'topical_verse',
    'topical-verse': 'topical_verse',
    'topical_category': 'topical_category',
    'topical-category': 'topical_category',
  };

  // Extract content type from URL path (e.g., /content-center/devotion -> daily_devotion)
  const contentType = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // Get the segment after 'content-center'
    const ccIndex = pathParts.indexOf('content-center');
    let urlType = '';
    if (ccIndex !== -1 && pathParts[ccIndex + 1]) {
      // Handle nested paths like /content-center/topical/verses
      const contentSegments = pathParts.slice(ccIndex + 1);
      // Join first two segments for nested content types
      if (contentSegments.length >= 2 && contentSegments[0] === 'topical') {
        urlType = `${contentSegments[0]}/${contentSegments[1]}`;
      } else {
        urlType = contentSegments[0].replace(/-/g, '_');
      }
    } else {
      urlType = pathParts[pathParts.length - 1]?.replace(/-/g, '_') || 'devotion';
    }
    // Map to API content type
    return urlToApiContentType[urlType] || urlType.replace(/-/g, '_');
  }, [location.pathname]);

  // URL-friendly content type (for routes)
  // Maps API content types to their URL paths for navigation
  const urlContentType = useMemo(() => {
    const contentTypeToUrl = {
      'daily_devotion': 'devotion',
      'verse_of_the_day': 'verse',
      'bible_figure': 'figure',
      'daily_quiz': 'quiz',
      'bible_study': 'bible-study',
      'devotion_plan': 'devotion-plan',
      'topical_verse': 'topical/verses',
      'topical_category': 'topical',
    };
    return contentTypeToUrl[contentType] || contentType.replace(/_/g, '-');
  }, [contentType]);

  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Fetch content list with multi-tenant cache isolation
  const { data, isLoading, error } = useExploreContentList(contentType, { search, limit: 50 });

  // Delete mutation with multi-tenant cache isolation
  const deleteMutation = useDeleteExploreContent(contentType);

  // Bulk delete mutation with multi-tenant cache isolation
  const bulkDeleteMutation = useBulkDeleteExploreContent(contentType);

  const handleDelete = (id) => {
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete, {
        onSuccess: () => setItemToDelete(null),
        onError: () => setItemToDelete(null)
      });
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedItems, {
      onSuccess: () => {
        setSelectedItems([]);
        setShowBulkDeleteDialog(false);
      },
      onError: () => setShowBulkDeleteDialog(false)
    });
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const contentTypeLabels = {
    daily_devotion: 'Daily Devotions',
    verse_of_the_day: 'Verse of the Day',
    bible_figure: 'Bible Figures',
    daily_quiz: 'Daily Quizzes',
    bible_study: 'Bible Studies',
    devotion_plan: 'Devotion Plans',
    topical_verse: 'Topical Verses',
    topical_category: 'Topical Categories',
  };

  const getTitle = (item) => {
    return item.title?.en || item.name?.en || item.id;
  };

  const getScheduledDate = (item) => {
    return item.scheduled_date || '-';
  };

  const getStatus = (item) => {
    if (item.published) return 'Published';
    if (item.scheduled_date) return 'Scheduled';
    return 'Draft';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/content-center"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {contentTypeLabels[contentType] || 'Content'}
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your {contentTypeLabels[contentType]?.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedItems.length})
            </Button>
          )}
          <Link to={`/content-center/${urlContentType}/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-600">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p>Error loading content: {error.message}</p>
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Plus className="h-12 w-12 mb-3 text-gray-300" />
              <p>No content found</p>
              <Link to={`/content-center/${urlContentType}/new`}>
                <Button variant="link" className="mt-2">
                  Create your first {contentTypeLabels[contentType]?.toLowerCase()}
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === data.items.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(data.items.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getTitle(item)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          getStatus(item) === 'Published'
                            ? 'bg-green-100 text-green-800'
                            : getStatus(item) === 'Scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {getStatus(item)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {getScheduledDate(item)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/public/explore/${contentType}/${item.id}`, '_blank')}
                          aria-label={t('explore.actions.view')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link to={`/content-center/${urlContentType}/${item.id}/edit`}>
                          <Button variant="ghost" size="sm" aria-label={t('explore.actions.edit')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                          aria-label={t('explore.actions.delete')}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Pagination (Placeholder) */}
      {data?.items && data.items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            {t('explore.contentList.showing', { count: data.items.length, total: data.total || data.items.length })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              {t('explore.actions.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled>
              {t('explore.actions.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('explore.actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('explore.confirmations.deleteContent')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('explore.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('explore.actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('explore.confirmations.deleteSelected', { count: selectedItems.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDeleteMutation.isPending}
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('explore.actions.delete')} ({selectedItems.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
