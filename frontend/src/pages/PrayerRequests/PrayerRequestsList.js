import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Heart, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { usePrayerRequests, useDeletePrayerRequest, useUpdatePrayerRequest } from '../../hooks/usePrayerRequests';
import PrayerRequestStatusBadge from '../../components/PrayerRequests/PrayerRequestStatusBadge';
import { useToast } from '../../hooks/use-toast';

export default function PrayerRequestsList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: requestsData, isLoading } = usePrayerRequests({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    limit: 50,
    offset: 0
  });

  const deleteMutation = useDeletePrayerRequest();
  const updateMutation = useUpdatePrayerRequest();

  const requests = requestsData?.data || [];

  const handleDelete = async (id, title) => {
    if (!window.confirm(t('prayerRequests.messages.confirmDelete'))) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: t('common.success'),
        description: t('prayerRequests.messages.deleteSuccess')
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  const handleMarkAsPrayed = async (id) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status: 'prayed' } });
      toast({
        title: t('common.success'),
        description: t('prayerRequests.messages.markedAsPrayed')
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
          <h1 className="text-3xl font-bold">{t('prayerRequests.title')}</h1>
          <p className="text-gray-600">{t('prayerRequests.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/prayer-requests/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('prayerRequests.createRequest')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="prayer-requests-search"
                name="prayer-requests-search"
                aria-label={t('common.search')}
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter} name="prayer-status-filter">
              <SelectTrigger id="prayer-status-filter" aria-label={t('prayerRequests.filters.filterByStatus')}>
                <SelectValue placeholder={t('prayerRequests.filters.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="new">{t('prayerRequests.statuses.new')}</SelectItem>
                <SelectItem value="prayed">{t('prayerRequests.statuses.prayed')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter} name="prayer-category-filter">
              <SelectTrigger id="prayer-category-filter" aria-label={t('prayerRequests.filters.filterByCategory')}>
                <SelectValue placeholder={t('prayerRequests.filters.filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="healing">{t('prayerRequests.categories.healing')}</SelectItem>
                <SelectItem value="health">{t('prayerRequests.categories.health')}</SelectItem>
                <SelectItem value="family">{t('prayerRequests.categories.family')}</SelectItem>
                <SelectItem value="work">{t('prayerRequests.categories.work')}</SelectItem>
                <SelectItem value="financial">{t('prayerRequests.categories.financial')}</SelectItem>
                <SelectItem value="provision">{t('prayerRequests.categories.provision')}</SelectItem>
                <SelectItem value="spiritual">{t('prayerRequests.categories.spiritual')}</SelectItem>
                <SelectItem value="guidance">{t('prayerRequests.categories.guidance')}</SelectItem>
                <SelectItem value="thanksgiving">{t('prayerRequests.categories.thanksgiving')}</SelectItem>
                <SelectItem value="comfort">{t('prayerRequests.categories.comfort')}</SelectItem>
                <SelectItem value="salvation">{t('prayerRequests.categories.salvation')}</SelectItem>
                <SelectItem value="other">{t('prayerRequests.categories.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('prayerRequests.allRequests')} ({requestsData?.pagination?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{t('prayerRequests.messages.noRequests')}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/prayer-requests/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('prayerRequests.messages.createFirst')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('prayerRequests.requestTitle')}</TableHead>
                  <TableHead>{t('prayerRequests.requesterName')}</TableHead>
                  <TableHead>{t('prayerRequests.category')}</TableHead>
                  <TableHead>{t('prayerRequests.status')}</TableHead>
                  <TableHead>{t('dashboard.createdAt')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {request.title}
                        {request.needs_follow_up && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title={t('prayerRequests.needsFollowUp')}>
                            <AlertCircle className="w-3 h-3" />
                            Follow-up
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{request.member_name || 'Anonymous'}</TableCell>
                    <TableCell>{t(`prayerRequests.categories.${request.category}`)}</TableCell>
                    <TableCell>
                      <PrayerRequestStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/prayer-requests/${request.id}`)}
                        >
                          {t('prayerRequests.viewRequest')}
                        </Button>
                        {request.status === 'new' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPrayed(request.id)}
                          >
                            {t('prayerRequests.actions.markAsPrayed')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(request.id, request.title)}
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
