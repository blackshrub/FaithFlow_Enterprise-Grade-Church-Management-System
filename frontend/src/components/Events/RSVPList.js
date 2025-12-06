import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, User, Calendar, Armchair, QrCode, MessageCircle, RefreshCw, CheckCircle, XCircle, Clock, Search, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCancelRSVP } from '@/hooks/useRSVP';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersAPI, eventsAPI } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ITEMS_PER_PAGE = 20;

function RSVPList({ event, rsvpData, isLoading, selectedSession }) {
  const { t } = useTranslation();
  const cancelMutation = useCancelRSVP();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedRsvp, setSelectedRsvp] = useState(null);

  // Fetch all members to display names (for members not in RSVP member_name)
  // Use high limit since church may have many members and we need lookup for all RSVPs
  const { data: members = [] } = useQuery({
    queryKey: ['members', 'full-list'],
    queryFn: async () => {
      const response = await membersAPI.list({ limit: 1000 });
      return response.data;
    },
  });

  // Create member lookup map
  const memberMap = useMemo(() => {
    const map = {};
    members.forEach(member => {
      map[member.id] = member;
    });
    return map;
  }, [members]);

  // Get member display info (name, phone, photo)
  // Uses RSVP data first, falls back to member lookup
  const getMemberInfo = (rsvp) => {
    const member = memberMap[rsvp.member_id];
    return {
      name: rsvp.member_name || member?.full_name || `Member ID: ${rsvp.member_id}`,
      phone: rsvp.phone || member?.phone_whatsapp || member?.phone || null,
      photo: rsvp.photo_url || member?.photo_url || member?.photo_thumbnail_url || null,
      initials: (rsvp.member_name || member?.full_name || 'U').substring(0, 2).toUpperCase()
    };
  };

  // Filter and paginate RSVPs
  const filteredRsvps = useMemo(() => {
    const rsvps = rsvpData?.rsvps || [];
    if (!searchQuery.trim()) return rsvps;

    const query = searchQuery.toLowerCase();
    return rsvps.filter(rsvp => {
      const info = getMemberInfo(rsvp);
      return info.name.toLowerCase().includes(query) ||
             (info.phone && info.phone.includes(query)) ||
             (rsvp.confirmation_code && rsvp.confirmation_code.toLowerCase().includes(query));
    });
  }, [rsvpData?.rsvps, searchQuery, memberMap]);

  const totalPages = Math.ceil(filteredRsvps.length / ITEMS_PER_PAGE);
  const paginatedRsvps = filteredRsvps.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Open QR modal
  const handleViewQR = (rsvp) => {
    setSelectedRsvp(rsvp);
    setQrModalOpen(true);
  };

  // Download QR code
  const handleDownloadQR = (rsvp) => {
    if (!rsvp.qr_code) return;
    const link = document.createElement('a');
    const info = getMemberInfo(rsvp);
    link.download = `ticket_${info.name.replace(/\s+/g, '_')}_${rsvp.confirmation_code}.png`;
    link.href = rsvp.qr_code;
    link.click();
  };

  const handleCancel = async (rsvp) => {
    if (window.confirm(t('events.rsvp.confirmCancel'))) {
      try {
        await cancelMutation.mutateAsync({
          eventId: event.id,
          memberId: rsvp.member_id,
          sessionId: rsvp.session_id,
        });
        toast.success(t('events.rsvp.cancelSuccess'));
      } catch (error) {
        toast.error(t('events.rsvp.cancelError'));
        console.error('Cancel RSVP error:', error);
      }
    }
  };

  const handleRetryWhatsApp = async (rsvp) => {
    const key = `${rsvp.member_id}-${rsvp.session_id}`;
    setRetrying(prev => ({ ...prev, [key]: true }));
    
    try {
      const response = await eventsAPI.retryWhatsApp(
        event.id,
        rsvp.member_id,
        rsvp.session_id ? { session_id: rsvp.session_id } : {}
      );
      
      if (response.data.success) {
        toast.success('WhatsApp sent successfully');
        queryClient.invalidateQueries({ queryKey: ['rsvps', event.id] });
      } else {
        toast.error(`Failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Failed to send WhatsApp');
      console.error('Retry WhatsApp error:', error);
    } finally {
      setRetrying(prev => ({ ...prev, [key]: false }));
    }
  };

  const getWhatsAppStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
      case 'timeout':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <MessageCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const rsvps = rsvpData?.rsvps || [];

  // Translate RSVP status
  const getStatusLabel = (status) => {
    const statusMap = {
      'registered': t('events.rsvp.statusRegistered', 'Registered'),
      'confirmed': t('events.rsvp.statusConfirmed', 'Confirmed'),
      'cancelled': t('events.rsvp.statusCancelled', 'Cancelled'),
      'checked_in': t('events.rsvp.statusCheckedIn', 'Checked In'),
    };
    return statusMap[status] || status;
  };

  if (rsvps.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('events.rsvp.noRSVPs')}
        </h3>
        <p className="text-gray-500">
          {selectedSession
            ? t('events.rsvp.noRSVPsForSession')
            : t('events.rsvp.registerFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('events.rsvp.rsvpList')} ({filteredRsvps.length})
        </h3>
      </div>

      {/* Search Bar */}
      {rsvps.length > 10 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('events.rsvp.searchPlaceholder', 'Search by name, phone, or code...')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => handleSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {paginatedRsvps.map((rsvp, index) => {
          const memberInfo = getMemberInfo(rsvp);

          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Member Photo */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage
                    src={memberInfo.photo}
                    alt={memberInfo.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {memberInfo.initials}
                  </AvatarFallback>
                </Avatar>

                {/* RSVP Details */}
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Member Info */}
                  <div>
                    <span className="font-medium text-gray-900 block truncate">
                      {memberInfo.name}
                    </span>
                    {memberInfo.phone && (
                      <p className="text-xs text-gray-500">{memberInfo.phone}</p>
                    )}
                  </div>

                  {/* Confirmation Code - Clickable */}
                  {rsvp.confirmation_code && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 -ml-1"
                        onClick={() => handleViewQR(rsvp)}
                      >
                        <QrCode className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {rsvp.confirmation_code}
                        </span>
                      </Button>
                    </div>
                  )}

                  {/* WhatsApp Status */}
                  {rsvp.whatsapp_status && rsvp.whatsapp_status !== 'disabled' && (
                    <div className="flex items-center gap-2">
                      {getWhatsAppStatusIcon(rsvp.whatsapp_status)}
                      <span className={`text-xs ${
                        rsvp.whatsapp_status === 'sent' || rsvp.whatsapp_status === 'delivered'
                          ? 'text-green-600'
                          : rsvp.whatsapp_status === 'failed' || rsvp.whatsapp_status === 'error'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        WhatsApp: {t(`events.rsvp.whatsapp_${rsvp.whatsapp_status}`, rsvp.whatsapp_status)}
                      </span>
                      {(rsvp.whatsapp_status === 'failed' || rsvp.whatsapp_status === 'error' || rsvp.whatsapp_status === 'timeout') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetryWhatsApp(rsvp)}
                          disabled={retrying[`${rsvp.member_id}-${rsvp.session_id}`]}
                          className="h-6 px-2 text-xs"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${retrying[`${rsvp.member_id}-${rsvp.session_id}`] ? 'animate-spin' : ''}`} />
                          Retry
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Session Info */}
                  {rsvp.session_id && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{t('events.event.sessionName')}: {rsvp.session_id}</span>
                    </div>
                  )}

                  {/* Seat Info */}
                  {rsvp.seat && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Armchair className="h-4 w-4" />
                      <span>{t('events.rsvp.seatNumber', { seat: rsvp.seat })}</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  {rsvp.timestamp && (
                    <p className="text-xs text-gray-500">
                      {t('events.rsvp.registeredOn', { date: formatDate(rsvp.timestamp) })}
                    </p>
                  )}

                  {/* Status */}
                  {rsvp.status && (
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        rsvp.status === 'confirmed' || rsvp.status === 'checked_in'
                          ? 'bg-green-100 text-green-800'
                          : rsvp.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {getStatusLabel(rsvp.status)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {rsvp.qr_code && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadQR(rsvp)}
                      title={t('events.rsvp.downloadQR', 'Download QR')}
                    >
                      <Download className="h-4 w-4 text-blue-500" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(rsvp)}
                    disabled={cancelMutation.isPending}
                    title={t('events.rsvp.cancelRSVP', 'Cancel RSVP')}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            {t('events.rsvp.showing', 'Showing {{from}}-{{to}} of {{total}}', {
              from: (currentPage - 1) * ITEMS_PER_PAGE + 1,
              to: Math.min(currentPage * ITEMS_PER_PAGE, filteredRsvps.length),
              total: filteredRsvps.length
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t('common.previous', 'Previous')}
            </Button>
            <span className="flex items-center px-3 text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t('common.next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t('events.rsvp.ticketQR', 'Event Ticket')}
            </DialogTitle>
          </DialogHeader>
          {selectedRsvp && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-medium text-lg">{getMemberInfo(selectedRsvp).name}</p>
                <p className="text-2xl font-mono font-bold text-blue-600 mt-2">
                  {selectedRsvp.confirmation_code}
                </p>
              </div>

              {selectedRsvp.qr_code ? (
                <div className="flex justify-center">
                  <img
                    src={selectedRsvp.qr_code}
                    alt="QR Code"
                    className="w-64 h-64 border border-gray-200 rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 text-sm">{t('events.rsvp.noQRCode', 'No QR code available')}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-2">
                {selectedRsvp.qr_code && (
                  <Button onClick={() => handleDownloadQR(selectedRsvp)}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('events.rsvp.downloadTicket', 'Download Ticket')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RSVPList;
