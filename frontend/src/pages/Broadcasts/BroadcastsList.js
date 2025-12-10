import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Loader2, MoreHorizontal, Eye, Edit, Copy, Send,
  XCircle, Trash2, Calendar, Users, Bell, CheckCircle2, AlertCircle, Clock
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  useCampaigns,
  useDeleteCampaign,
  useDuplicateCampaign,
  useSendCampaign,
  useCancelCampaign,
  useBroadcastAnalytics,
} from '../../hooks/useBroadcasts';
import { useToast } from '../../hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

// Status badge component
const CampaignStatusBadge = ({ status }) => {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary', icon: Edit },
    scheduled: { label: 'Scheduled', variant: 'outline', icon: Calendar },
    sending: { label: 'Sending', variant: 'default', icon: Loader2 },
    sent: { label: 'Sent', variant: 'success', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
    failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={`w-3 h-3 ${status === 'sending' ? 'animate-spin' : ''}`} />
      {config.label}
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

export default function BroadcastsList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { searchValue: search, setSearchValue: setSearch, deferredValue: deferredSearch, isSearchPending } = useDeferredSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });

  // Fetch campaigns
  const { data: campaignsData, isLoading } = useCampaigns({
    search: deferredSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    ...pagination
  });

  // Fetch analytics
  const { data: analytics } = useBroadcastAnalytics(30);

  // Mutations
  const deleteMutation = useDeleteCampaign();
  const duplicateMutation = useDuplicateCampaign();
  const sendMutation = useSendCampaign();
  const cancelMutation = useCancelCampaign();

  const campaigns = campaignsData?.data || [];

  const handleDelete = async (id, title) => {
    if (!window.confirm(t('broadcasts.messages.confirmDelete', { title }))) return;

    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const result = await duplicateMutation.mutateAsync(id);
      navigate(`/broadcasts/${result.data.id}/edit`);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSend = async (id, title) => {
    if (!window.confirm(t('broadcasts.messages.confirmSend', { title }))) return;

    try {
      await sendMutation.mutateAsync(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t('broadcasts.messages.confirmCancel'))) return;

    try {
      await cancelMutation.mutateAsync(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const getStatusCounts = () => {
    if (!analytics?.campaigns_by_status) return {};
    return analytics.campaigns_by_status;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('broadcasts.title')}</h1>
          <p className="text-gray-600">{t('broadcasts.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/broadcasts/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('broadcasts.newCampaign')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title={t('broadcasts.analytics.totalCampaigns')}
          value={analytics?.total_campaigns || 0}
          icon={Bell}
          description={t('broadcasts.analytics.last30Days')}
        />
        <StatsCard
          title={t('broadcasts.analytics.totalSent')}
          value={analytics?.total_notifications_sent || 0}
          icon={Send}
        />
        <StatsCard
          title={t('broadcasts.analytics.delivered')}
          value={analytics?.total_delivered || 0}
          icon={CheckCircle2}
        />
        <StatsCard
          title={t('broadcasts.analytics.deliveryRate')}
          value={`${analytics?.delivery_rate || 0}%`}
          icon={Users}
        />
      </div>

      {/* Tabs for Status Filtering */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">
            {t('broadcasts.status.all')}
            <Badge variant="secondary" className="ml-2">{campaignsData?.total || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="draft">
            {t('broadcasts.status.draft')}
            {statusCounts.draft > 0 && <Badge variant="secondary" className="ml-2">{statusCounts.draft}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            {t('broadcasts.status.scheduled')}
            {statusCounts.scheduled > 0 && <Badge variant="secondary" className="ml-2">{statusCounts.scheduled}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent">
            {t('broadcasts.status.sent')}
            {statusCounts.sent > 0 && <Badge variant="secondary" className="ml-2">{statusCounts.sent}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            {isSearchPending ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            )}
            <Input
              placeholder={t('broadcasts.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">{t('broadcasts.empty.title')}</h3>
              <p className="mt-2 text-sm text-gray-500">{t('broadcasts.empty.description')}</p>
              <Button onClick={() => navigate('/broadcasts/new')} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {t('broadcasts.newCampaign')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('broadcasts.table.title')}</TableHead>
                  <TableHead>{t('broadcasts.table.status')}</TableHead>
                  <TableHead>{t('broadcasts.table.audience')}</TableHead>
                  <TableHead>{t('broadcasts.table.stats')}</TableHead>
                  <TableHead>{t('broadcasts.table.created')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{campaign.title}</p>
                        <p className="text-sm text-gray-500 truncate">{campaign.body}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={campaign.status} />
                      {campaign.status === 'scheduled' && campaign.scheduled_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(campaign.scheduled_at), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {campaign.audience?.target_type === 'all'
                            ? t('broadcasts.audience.allMembers')
                            : campaign.audience?.target_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.status === 'sent' && campaign.stats ? (
                        <div className="text-sm">
                          <span className="text-green-600">{campaign.stats.sent_count || 0} sent</span>
                          {campaign.stats.failed_count > 0 && (
                            <span className="text-red-600 ml-2">{campaign.stats.failed_count} failed</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/broadcasts/${campaign.id}/edit`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('common.view')}
                          </DropdownMenuItem>

                          {campaign.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/broadcasts/${campaign.id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSend(campaign.id, campaign.title)}>
                                <Send className="w-4 h-4 mr-2" />
                                {t('broadcasts.actions.send')}
                              </DropdownMenuItem>
                            </>
                          )}

                          {campaign.status === 'scheduled' && (
                            <DropdownMenuItem onClick={() => handleCancel(campaign.id)}>
                              <XCircle className="w-4 h-4 mr-2" />
                              {t('broadcasts.actions.cancel')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleDuplicate(campaign.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            {t('broadcasts.actions.duplicate')}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {campaign.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(campaign.id, campaign.title)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {campaignsData?.total > pagination.limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
            disabled={pagination.offset === 0}
          >
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
            disabled={pagination.offset + pagination.limit >= campaignsData.total}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
