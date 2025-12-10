import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Loader2, MoreHorizontal, Eye, Edit, Copy, Send,
  Trash2, FileText, Tag, Clock, CheckCircle2, XCircle, Hash
} from 'lucide-react';
import { useDeferredSearch } from '../../hooks/useDeferredSearch';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
  useTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
  useTemplateCategories,
  useCreateCampaignFromTemplate,
} from '../../hooks/useNotificationTemplates';
import { useToast } from '../../hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

// Status badge component
const ActiveStatusBadge = ({ isActive }) => {
  return (
    <Badge variant={isActive ? 'success' : 'secondary'} className="flex items-center gap-1">
      {isActive ? (
        <>
          <CheckCircle2 className="w-3 h-3" />
          Active
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3" />
          Inactive
        </>
      )}
    </Badge>
  );
};

// Stats card component
const StatsCard = ({ title, value, icon: Icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function TemplatesList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { searchValue: search, setSearchValue: setSearch, deferredValue: deferredSearch, isSearchPending } = useDeferredSearch();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null });

  // Fetch templates
  const { data: templatesData, isLoading } = useTemplates({
    search: deferredSearch || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    ...pagination
  });

  // Fetch categories
  const { data: categoriesData } = useTemplateCategories();
  const categories = categoriesData?.categories || [];

  // Mutations
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();
  const createCampaignMutation = useCreateCampaignFromTemplate();

  const templates = templatesData?.data || [];
  const total = templatesData?.total || 0;

  // Stats
  const activeCount = templates.filter(t => t.is_active).length;
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog.template) return;

    try {
      await deleteMutation.mutateAsync(deleteDialog.template.id);
      setDeleteDialog({ open: false, template: null });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle duplicate
  const handleDuplicate = async (template) => {
    try {
      await duplicateMutation.mutateAsync(template.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle create campaign from template
  const handleCreateCampaign = async (template) => {
    try {
      const result = await createCampaignMutation.mutateAsync({
        id: template.id,
        data: { variables: {} }
      });
      navigate(`/broadcasts/${result.data.id}/edit`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('notificationTemplates.title', 'Notification Templates')}</h1>
          <p className="text-muted-foreground">
            {t('notificationTemplates.description', 'Create reusable templates for push notifications')}
          </p>
        </div>
        <Button onClick={() => navigate('/notification-templates/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('notificationTemplates.create', 'Create Template')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title={t('notificationTemplates.stats.total', 'Total Templates')}
          value={total}
          icon={FileText}
          description={t('notificationTemplates.stats.totalDesc', 'All templates in library')}
        />
        <StatsCard
          title={t('notificationTemplates.stats.active', 'Active Templates')}
          value={activeCount}
          icon={CheckCircle2}
          description={t('notificationTemplates.stats.activeDesc', 'Ready to use')}
        />
        <StatsCard
          title={t('notificationTemplates.stats.usage', 'Total Usage')}
          value={totalUsage}
          icon={Hash}
          description={t('notificationTemplates.stats.usageDesc', 'Campaigns created')}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('notificationTemplates.list', 'Templates')}</CardTitle>
          <CardDescription>
            {t('notificationTemplates.listDesc', 'Manage your notification templates')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('notificationTemplates.searchPlaceholder', 'Search templates...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('notificationTemplates.categoryFilter', 'Category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('notificationTemplates.allCategories', 'All Categories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {search || categoryFilter !== 'all'
                ? t('notificationTemplates.noResults', 'No templates found matching your filters')
                : t('notificationTemplates.empty', 'No templates yet. Create your first one!')}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('notificationTemplates.table.name', 'Name')}</TableHead>
                    <TableHead>{t('notificationTemplates.table.category', 'Category')}</TableHead>
                    <TableHead>{t('notificationTemplates.table.status', 'Status')}</TableHead>
                    <TableHead>{t('notificationTemplates.table.usage', 'Usage')}</TableHead>
                    <TableHead>{t('notificationTemplates.table.updated', 'Last Updated')}</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {template.description || template.title}
                          </span>
                          {template.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {template.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {template.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{template.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <ActiveStatusBadge isActive={template.is_active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {template.usage_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/notification-templates/${template.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('notificationTemplates.actions.view', 'View')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/notification-templates/${template.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('notificationTemplates.actions.edit', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="mr-2 h-4 w-4" />
                              {t('notificationTemplates.actions.duplicate', 'Duplicate')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleCreateCampaign(template)}>
                              <Send className="mr-2 h-4 w-4" />
                              {t('notificationTemplates.actions.createCampaign', 'Create Campaign')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteDialog({ open: true, template })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('notificationTemplates.actions.delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, template: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notificationTemplates.deleteDialog.title', 'Delete Template')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notificationTemplates.deleteDialog.description', 'Are you sure you want to delete this template? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.delete', 'Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
