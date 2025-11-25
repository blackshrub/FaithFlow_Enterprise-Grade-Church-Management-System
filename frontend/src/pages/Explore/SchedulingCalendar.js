import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
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
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Plus, Loader2, BookOpen, MessageSquare, User, HelpCircle, Edit, Trash2
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';

const contentTypeConfig = {
  devotion: { label: 'Devotion', icon: BookOpen, color: 'bg-blue-500' },
  verse: { label: 'Verse', icon: MessageSquare, color: 'bg-green-500' },
  figure: { label: 'Figure', icon: User, color: 'bg-purple-500' },
  quiz: { label: 'Quiz', icon: HelpCircle, color: 'bg-orange-500' },
};

export default function SchedulingCalendar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterContentType, setFilterContentType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Calculate month boundaries
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Fetch scheduled content for current month
  const { data: scheduledContent, isLoading } = useQuery({
    queryKey: ['explore', 'schedule', year, month, filterContentType],
    queryFn: () => exploreService.getScheduledContent({
      start_date: firstDay.toISOString().split('T')[0],
      end_date: lastDay.toISOString().split('T')[0],
      content_type: filterContentType === 'all' ? undefined : filterContentType,
    }),
    staleTime: 30000,
  });

  // Fetch all available content for scheduling
  const { data: availableContent } = useQuery({
    queryKey: ['explore', 'available-content', filterContentType],
    queryFn: async () => {
      const types = filterContentType === 'all'
        ? ['devotion', 'verse', 'figure', 'quiz']
        : [filterContentType];

      const results = await Promise.all(
        types.map(type => exploreService.listContent(type, { limit: 100, published: false }))
      );

      return results.flatMap((result, index) =>
        (result.content || []).map(item => ({
          ...item,
          content_type: types[index]
        }))
      );
    },
    enabled: showScheduleDialog,
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: ({ contentType, contentId }) =>
      exploreService.unscheduleContent(contentType, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['explore', 'schedule']);
      toast({
        title: 'Success',
        description: 'Content unscheduled successfully',
      });
    },
  });

  // Schedule content mutation
  const scheduleMutation = useMutation({
    mutationFn: ({ contentType, contentId, date }) =>
      exploreService.scheduleContent(contentType, contentId, date),
    onSuccess: () => {
      queryClient.invalidateQueries(['explore', 'schedule']);
      setShowScheduleDialog(false);
      toast({
        title: 'Success',
        description: 'Content scheduled successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule content',
        variant: 'destructive',
      });
    },
  });

  // Group content by date
  const contentByDate = useMemo(() => {
    if (!scheduledContent?.content) return {};

    return scheduledContent.content.reduce((acc, item) => {
      const date = item.scheduled_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [scheduledContent]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    const startDay = firstDay.getDay(); // 0 = Sunday

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    if (date) {
      setSelectedDate(date);
      setShowScheduleDialog(true);
    }
  };

  const handleScheduleContent = (contentId, contentType) => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    scheduleMutation.mutate({ contentType, contentId, date: dateStr });
  };

  const handleUnschedule = (item) => {
    if (window.confirm('Remove this content from the schedule?')) {
      deleteMutation.mutate({
        contentType: item.content_type,
        contentId: item.id
      });
    }
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/explore"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Content Scheduling Calendar
          </h1>
          <p className="text-gray-600 mt-1">
            Schedule and manage daily content publication
          </p>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[200px] text-center">
                {monthNames[month]} {year}
              </h2>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterContentType} onValueChange={setFilterContentType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="devotion">Devotions</SelectItem>
                  <SelectItem value="verse">Verses</SelectItem>
                  <SelectItem value="figure">Figures</SelectItem>
                  <SelectItem value="quiz">Quizzes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calendar Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((date, index) => {
                  const dateStr = date ? date.toISOString().split('T')[0] : null;
                  const dayContent = dateStr ? contentByDate[dateStr] || [] : [];

                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] border-b border-r p-2 ${
                        date ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-100'
                      } ${isToday(date) ? 'bg-blue-50' : ''}`}
                      onClick={() => handleDateClick(date)}
                    >
                      {date && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${
                              isToday(date) ? 'text-blue-600 font-bold' : 'text-gray-700'
                            }`}>
                              {date.getDate()}
                            </span>
                            {dayContent.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {dayContent.length}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayContent.slice(0, 3).map((item, idx) => {
                              const config = contentTypeConfig[item.content_type] || {};
                              const Icon = config.icon || BookOpen;

                              return (
                                <div
                                  key={idx}
                                  className={`text-xs p-1 rounded ${config.color} bg-opacity-10 flex items-center gap-1 group`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Icon className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate flex-1">
                                    {item.title?.en || item.name?.en || 'Untitled'}
                                  </span>
                                  <button
                                    onClick={() => handleUnschedule(item)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </button>
                                </div>
                              );
                            })}
                            {dayContent.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{dayContent.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Content Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(contentTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${config.color}`} />
                  <Icon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{config.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Content Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Schedule Content for {selectedDate?.toLocaleDateString()}
            </DialogTitle>
            <DialogDescription>
              Select content to schedule for this date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Existing scheduled content for this date */}
            {selectedDate && contentByDate[selectedDate.toISOString().split('T')[0]]?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Currently Scheduled:</h3>
                <div className="space-y-2">
                  {contentByDate[selectedDate.toISOString().split('T')[0]].map((item, idx) => {
                    const config = contentTypeConfig[item.content_type] || {};
                    const Icon = config.icon || BookOpen;

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.title?.en || item.name?.en || 'Untitled'}
                            </p>
                            <p className="text-sm text-gray-500">{config.label}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnschedule(item)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available content to schedule */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Available Content:</h3>
              {!availableContent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : availableContent.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No unscheduled content available
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableContent.map((item) => {
                    const config = contentTypeConfig[item.content_type] || {};
                    const Icon = config.icon || BookOpen;

                    return (
                      <div key={`${item.content_type}-${item.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.title?.en || item.name?.en || 'Untitled'}
                            </p>
                            <p className="text-sm text-gray-500">{config.label}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScheduleContent(item.id, item.content_type)}
                          disabled={scheduleMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Schedule
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
