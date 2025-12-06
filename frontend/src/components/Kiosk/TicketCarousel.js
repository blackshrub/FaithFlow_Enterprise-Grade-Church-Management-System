/**
 * TicketCarousel - Horizontal swipeable carousel for event tickets
 *
 * Uses CSS scroll-snap for native-feeling swipe behavior
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import EventTicketCard from './EventTicketCard';
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
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'EEEE, d MMMM yyyy', { locale: getLocale(lang) });
  } catch {
    return dateStr;
  }
};

// Format time for display
const formatEventTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    try {
      const date = parseISO(timeStr);
      return format(date, 'HH:mm'); // 24-hour format
    } catch {
      return timeStr;
    }
  }
  return timeStr;
};

const TicketCarousel = ({
  tickets,
  event,
  primaryMemberId
}) => {
  const { t, i18n } = useTranslation('kiosk');
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Generate single ticket image
  const generateTicketImage = useCallback(async (ticket, isPrimary) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

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
    if (ticket.qr_code) {
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
    }

    // Confirmation code
    ctx.fillStyle = '#6B7280';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('group_registration.confirmation_code', 'Confirmation Code'), width / 2, 500);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 42px Courier, monospace';
    ctx.fillText(ticket.confirmation_code || '', width / 2, 550);

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
    }

    // Footer
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(0, height - 70, width, 70);

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

    return canvas;
  }, [event, t, currentLang]);

  // Save all tickets
  const handleSaveAllTickets = useCallback(async () => {
    if (!tickets || tickets.length === 0) return;

    setIsSavingAll(true);

    try {
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const isPrimary = ticket.member_id === primaryMemberId || ticket.is_primary;

        const canvas = await generateTicketImage(ticket, isPrimary);

        const link = document.createElement('a');
        const fileName = `ticket_${(ticket.member_name || 'guest').replace(/\s+/g, '_')}_${ticket.confirmation_code}.png`;
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Small delay between downloads to avoid browser blocking
        if (i < tickets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error('Error saving all tickets:', error);
    } finally {
      setIsSavingAll(false);
    }
  }, [tickets, primaryMemberId, generateTicketImage]);

  // Check scroll position
  const checkScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Update current index based on scroll position
  const updateCurrentIndex = () => {
    if (!scrollRef.current || tickets.length === 0) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const newIndex = Math.round(scrollLeft / clientWidth);
    setCurrentIndex(Math.min(Math.max(newIndex, 0), tickets.length - 1));
  };

  // Scroll to specific ticket
  const scrollToIndex = (index) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth'
    });
  };

  // Navigation buttons
  const scrollLeft = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const scrollRight = () => {
    if (currentIndex < tickets.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  // Set up scroll event listener
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      checkScrollButtons();
      updateCurrentIndex();
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    checkScrollButtons(); // Initial check

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [tickets.length]);

  if (!tickets || tickets.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Swipe Hint (only show on first view) */}
      {tickets.length > 1 && (
        <motion.p
          className="text-center text-sm text-gray-500 mb-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 0.5 }}
        >
          {t('group_registration.swipe_hint', 'Swipe to see all tickets')}
        </motion.p>
      )}

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow (desktop) */}
        {tickets.length > 1 && canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 shadow-lg hover:bg-white hidden sm:flex"
            onClick={scrollLeft}
          >
            <ChevronLeft size={24} />
          </Button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {tickets.map((ticket, index) => (
            <div
              key={ticket.member_id || index}
              className="flex-shrink-0 w-full snap-center px-4"
            >
              <EventTicketCard
                ticket={ticket}
                event={event}
                isPrimary={ticket.member_id === primaryMemberId || ticket.is_primary}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow (desktop) */}
        {tickets.length > 1 && canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 shadow-lg hover:bg-white hidden sm:flex"
            onClick={scrollRight}
          >
            <ChevronRight size={24} />
          </Button>
        )}
      </div>

      {/* Pagination Dots */}
      {tickets.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {tickets.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`
                w-2.5 h-2.5 rounded-full transition-all duration-200
                ${index === currentIndex
                  ? 'bg-blue-600 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
              aria-label={`Go to ticket ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Ticket Counter */}
      <p className="text-center text-sm text-gray-500 mt-2">
        {currentIndex + 1} / {tickets.length}
      </p>

      {/* Save All Tickets Button (only show if multiple tickets) */}
      {tickets.length > 1 && (
        <div className="mt-6 px-4 max-w-sm mx-auto">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSaveAllTickets}
            disabled={isSavingAll}
          >
            {isSavingAll ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                {t('group_registration.saving_tickets', 'Saving tickets...')}
              </>
            ) : (
              <>
                <Download size={18} className="mr-2" />
                {t('group_registration.save_all_tickets', 'Save All Tickets')} ({tickets.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Hide scrollbar with CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default TicketCarousel;
