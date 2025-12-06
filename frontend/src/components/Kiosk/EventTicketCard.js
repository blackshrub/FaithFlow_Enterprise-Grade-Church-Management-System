/**
 * EventTicketCard - Displays a single event ticket with QR code
 */

import React, { useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  Phone,
  Loader2,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { id as idLocale, enUS } from 'date-fns/locale';

// Get locale based on language code
const getLocale = (lang) => {
  return lang === 'id' ? idLocale : enUS;
};

// Format date for display with locale support
const formatEventDate = (dateStr, lang = 'en') => {
  if (!dateStr) return '';
  try {
    // Handle ISO strings like "2025-12-06T00:00:00"
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'EEEE, d MMMM yyyy', { locale: getLocale(lang) });
    // e.g., "Saturday, 6 December 2025" or "Sabtu, 6 Desember 2025"
  } catch {
    return dateStr;
  }
};

// Format time for display
const formatEventTime = (timeStr) => {
  if (!timeStr) return '';
  // Handle various time formats
  if (timeStr.includes('T')) {
    try {
      const date = parseISO(timeStr);
      return format(date, 'HH:mm'); // e.g., "09:00" (24-hour format is universal)
    } catch {
      return timeStr;
    }
  }
  return timeStr;
};

const EventTicketCard = ({
  ticket,
  event,
  isPrimary = false,
  ticketRef // Optional ref for external access
}) => {
  const { t, i18n } = useTranslation('kiosk');
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const cardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generate and download ticket image
  const handleDownload = useCallback(async () => {
    if (!ticket.qr_code) return;

    setIsDownloading(true);

    try {
      // Create canvas for ticket image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Ticket dimensions (2:3 aspect ratio, good for mobile)
      const width = 600;
      const height = 900;
      canvas.width = width;
      canvas.height = height;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#2563EB');
      gradient.addColorStop(1, '#4F46E5');

      // Draw header background
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, 140);

      // Draw body background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 140, width, height - 140);

      // Header text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText(t('group_registration.ticket_for', 'Ticket for'), 30, 50);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(ticket.member_name || '', 30, 95);

      if (isPrimary) {
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('★ ' + t('group_registration.primary_badge', 'You'), 30, 125);
      }

      // Load and draw QR code
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = reject;
        qrImage.src = ticket.qr_code;
      });

      // QR code background
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(0, 140, width, 380);

      // QR code with white padding
      const qrSize = 280;
      const qrX = (width - qrSize) / 2;
      const qrY = 180;

      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      ctx.shadowBlur = 0;

      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Confirmation code
      ctx.fillStyle = '#6B7280';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('group_registration.confirmation_code', 'Confirmation Code'), width / 2, 500);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 42px Courier, monospace';
      ctx.fillText(ticket.confirmation_code || '', width / 2, 550);

      // Reset text alignment
      ctx.textAlign = 'left';

      // Event details
      const detailsY = 620;
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(event?.event_name || event?.name || '', 30, detailsY);

      ctx.fillStyle = '#4B5563';
      ctx.font = '18px system-ui, -apple-system, sans-serif';

      let y = detailsY + 40;
      if (event?.event_date) {
        ctx.fillText('📅 ' + formatEventDate(event.event_date, currentLang), 30, y);
        y += 32;
      }
      if (event?.start_time) {
        ctx.fillText('🕐 ' + formatEventTime(event.start_time), 30, y);
        y += 32;
      }
      if (event?.location) {
        ctx.fillText('📍 ' + event.location, 30, y);
        y += 32;
      }

      // Footer
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(0, height - 70, width, 70);

      // Dashed line
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 70);
      ctx.lineTo(width, height - 70);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('group_registration.show_qr_hint', 'Show this QR code at check-in'), width / 2, height - 30);

      // Download
      const link = document.createElement('a');
      const fileName = `ticket_${(ticket.member_name || 'guest').replace(/\s+/g, '_')}_${ticket.confirmation_code}.png`;
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error('Error generating ticket image:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [ticket, event, isPrimary, t, currentLang]);

  // WhatsApp status badge
  const renderWhatsAppStatus = () => {
    const status = ticket.whatsapp_status;

    if (status === 'sent') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle size={12} className="mr-1" />
          {t('group_registration.whatsapp_sent', 'Sent to WhatsApp')}
        </Badge>
      );
    }

    if (status === 'pending' || status === 'sending') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Loader2 size={12} className="mr-1 animate-spin" />
          {t('group_registration.whatsapp_sending', 'Sending...')}
        </Badge>
      );
    }

    if (status === 'no_phone') {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          <Phone size={12} className="mr-1" />
          {t('group_registration.no_phone', 'No phone')}
        </Badge>
      );
    }

    if (status === 'not_configured') {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle size={12} className="mr-1" />
          {t('group_registration.whatsapp_not_configured', 'WhatsApp not configured')}
        </Badge>
      );
    }

    if (status === 'failed' || status === 'error') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle size={12} className="mr-1" />
          {t('group_registration.whatsapp_failed', 'Send failed')}
        </Badge>
      );
    }

    return null;
  };

  return (
    <motion.div
      className="w-full max-w-sm mx-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ticket Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">
                {t('group_registration.ticket_for', 'Ticket for')}
              </p>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {ticket.member_name}
                {isPrimary && (
                  <Star size={16} className="text-yellow-300" />
                )}
              </h3>
            </div>
            {isPrimary && (
              <Badge className="bg-white/20 text-white border-white/30">
                {t('group_registration.primary_badge', 'You')}
              </Badge>
            )}
          </div>
        </div>

        {/* QR Code Section */}
        <div className="p-6 flex flex-col items-center bg-gray-50">
          {ticket.qr_code && (
            <div className="bg-white p-4 rounded-xl shadow-inner">
              <img
                src={ticket.qr_code}
                alt="Event QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
          )}

          {/* Confirmation Code */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-1">
              {t('group_registration.confirmation_code', 'Confirmation Code')}
            </p>
            <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">
              {ticket.confirmation_code}
            </p>
          </div>

          {/* WhatsApp Status */}
          <div className="mt-3">
            {renderWhatsAppStatus()}
          </div>
        </div>

        {/* Event Details */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <h4 className="font-semibold text-gray-900 text-lg">
            {event?.event_name || event?.name}
          </h4>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} className="text-blue-500" />
            <span>{formatEventDate(event?.event_date, currentLang)}</span>
          </div>

          {event?.start_time && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={16} className="text-blue-500" />
              <span>{formatEventTime(event?.start_time)}</span>
            </div>
          )}

          {event?.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} className="text-blue-500" />
              <span>{event?.location}</span>
            </div>
          )}
        </div>

        {/* Ticket Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-dashed border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-3">
            {t('group_registration.show_qr_hint', 'Show this QR code at check-in')}
          </p>

          {/* Download Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDownload}
            disabled={isDownloading || !ticket.qr_code}
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {t('common.processing', 'Processing...')}
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                {t('group_registration.save_ticket', 'Save Ticket')}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default EventTicketCard;
