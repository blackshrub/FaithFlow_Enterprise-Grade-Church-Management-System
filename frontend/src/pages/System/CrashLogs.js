import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCrashLogs,
  useCrashLogStats,
  useUpdateCrashLog,
  useDeleteCrashLog
} from '../../hooks/useCrashLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertTriangle,
  Bug,
  Smartphone,
  Monitor,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Apple,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Status badge color mapping
const statusColors = {
  new: 'bg-red-100 text-red-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  new: AlertTriangle,
  investigating: Clock,
  resolved: CheckCircle,
  ignored: XCircle,
};

// Platform icon mapping
const PlatformIcon = ({ platform }) => {
  if (platform === 'ios') {
    return <Apple className="h-4 w-4" />;
  }
  if (platform === 'android') {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
};

export default function CrashLogs() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({
    status: '',
    platform: '',
    search: '',
  });
  const [selectedCrash, setSelectedCrash] = useState(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '' });

  // Queries
  const { data: crashLogsData, isLoading, refetch } = useCrashLogs({
    skip: (page - 1) * limit,
    limit,
    status: filters.status || undefined,
    platform: filters.platform || undefined,
    search: filters.search || undefined,
  });

  const { data: stats } = useCrashLogStats();
  const updateMutation = useUpdateCrashLog();
  const deleteMutation = useDeleteCrashLog();

  const crashLogs = crashLogsData?.crash_logs || [];
  const total = crashLogsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  // Handle status update
  const handleUpdateStatus = () => {
    if (!selectedCrash) return;
    updateMutation.mutate(
      {
        id: selectedCrash.id,
        data: {
          status: updateForm.status,
          resolution_notes: updateForm.notes || undefined,
        }
      },
      {
        onSuccess: () => {
          setUpdateDialogOpen(false);
          setSelectedCrash(null);
          setUpdateForm({ status: '', notes: '' });
        }
      }
    );
  };

  // Handle delete
  const handleDelete = (id) => {
    if (window.confirm(t('crashLogs.confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  // Open update dialog
  const openUpdateDialog = (crash) => {
    setSelectedCrash(crash);
    setUpdateForm({ status: crash.status, notes: crash.resolution_notes || '' });
    setUpdateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bug className="h-8 w-8 text-red-600" />
            {t('crashLogs.title', 'Crash Logs')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('crashLogs.description', 'Monitor and manage mobile app crash reports')}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('crashLogs.totalCrashes', 'Total Crashes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_crashes || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700">
                {t('crashLogs.newCrashes', 'New')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{stats.by_status?.new || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">
                {t('crashLogs.investigating', 'Investigating')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{stats.by_status?.investigating || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                {t('crashLogs.resolved', 'Resolved')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{stats.by_status?.resolved || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('crashLogs.uniqueUsers', 'Unique Users')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_users || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Stats */}
      {stats?.by_platform && Object.keys(stats.by_platform).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('crashLogs.byPlatform', 'Crashes by Platform')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {Object.entries(stats.by_platform).map(([platform, count]) => (
                <div key={platform} className="flex items-center gap-2">
                  <PlatformIcon platform={platform} />
                  <span className="capitalize">{platform}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('common.filters', 'Filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('crashLogs.searchPlaceholder', 'Search by error message...')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('crashLogs.allStatuses', 'All Statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('crashLogs.allStatuses', 'All Statuses')}</SelectItem>
                <SelectItem value="new">{t('crashLogs.status.new', 'New')}</SelectItem>
                <SelectItem value="investigating">{t('crashLogs.status.investigating', 'Investigating')}</SelectItem>
                <SelectItem value="resolved">{t('crashLogs.status.resolved', 'Resolved')}</SelectItem>
                <SelectItem value="ignored">{t('crashLogs.status.ignored', 'Ignored')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.platform || "all"}
              onValueChange={(value) => handleFilterChange('platform', value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('crashLogs.allPlatforms', 'All Platforms')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('crashLogs.allPlatforms', 'All Platforms')}</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Crash Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('crashLogs.recentCrashes', 'Recent Crashes')}</CardTitle>
          <CardDescription>
            {t('crashLogs.showing', 'Showing {{from}}-{{to}} of {{total}} crashes', {
              from: (page - 1) * limit + 1,
              to: Math.min(page * limit, total),
              total,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : crashLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bug className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('crashLogs.noCrashes', 'No crash logs found')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('crashLogs.error', 'Error')}</TableHead>
                    <TableHead>{t('crashLogs.platform', 'Platform')}</TableHead>
                    <TableHead>{t('crashLogs.appVersion', 'App Version')}</TableHead>
                    <TableHead>{t('crashLogs.status', 'Status')}</TableHead>
                    <TableHead>{t('crashLogs.time', 'Time')}</TableHead>
                    <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crashLogs.map((crash) => {
                    const StatusIcon = statusIcons[crash.status] || AlertTriangle;
                    return (
                      <TableRow key={crash.id}>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium text-sm truncate">
                              {crash.error_type}: {crash.error_message}
                            </p>
                            {crash.screen_name && (
                              <p className="text-xs text-gray-500">
                                Screen: {crash.screen_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={crash.device_info?.platform} />
                            <span className="text-sm capitalize">
                              {crash.device_info?.platform || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {crash.device_info?.app_version || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[crash.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {t(`crashLogs.status.${crash.status}`, crash.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {crash.timestamp
                              ? formatDistanceToNow(new Date(crash.timestamp), { addSuffix: true })
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUpdateDialog(crash)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(crash.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-600">
                    {t('common.page', 'Page')} {page} {t('common.of', 'of')} {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('crashLogs.crashDetails', 'Crash Details')}</DialogTitle>
            <DialogDescription>
              {selectedCrash?.error_type}: {selectedCrash?.error_message}
            </DialogDescription>
          </DialogHeader>

          {selectedCrash && (
            <div className="space-y-4">
              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-500">{t('crashLogs.platform', 'Platform')}</p>
                  <p className="capitalize">{selectedCrash.device_info?.platform}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">{t('crashLogs.osVersion', 'OS Version')}</p>
                  <p>{selectedCrash.device_info?.os_version}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">{t('crashLogs.appVersion', 'App Version')}</p>
                  <p>{selectedCrash.device_info?.app_version}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">{t('crashLogs.device', 'Device')}</p>
                  <p>{selectedCrash.device_info?.device_model}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">{t('crashLogs.screen', 'Screen')}</p>
                  <p>{selectedCrash.screen_name || '-'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">{t('crashLogs.network', 'Network')}</p>
                  <p>{selectedCrash.is_online ? 'Online' : 'Offline'} ({selectedCrash.network_type || '-'})</p>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedCrash.stack_trace && (
                <div>
                  <p className="font-medium text-gray-500 mb-1">{t('crashLogs.stackTrace', 'Stack Trace')}</p>
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-48">
                    {selectedCrash.stack_trace}
                  </pre>
                </div>
              )}

              {/* Update Form */}
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium">{t('crashLogs.updateStatus', 'Update Status')}</label>
                  <Select
                    value={updateForm.status}
                    onValueChange={(value) => setUpdateForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{t('crashLogs.status.new', 'New')}</SelectItem>
                      <SelectItem value="investigating">{t('crashLogs.status.investigating', 'Investigating')}</SelectItem>
                      <SelectItem value="resolved">{t('crashLogs.status.resolved', 'Resolved')}</SelectItem>
                      <SelectItem value="ignored">{t('crashLogs.status.ignored', 'Ignored')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('crashLogs.resolutionNotes', 'Resolution Notes')}</label>
                  <Textarea
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('crashLogs.notesPlaceholder', 'Add notes about the resolution...')}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
