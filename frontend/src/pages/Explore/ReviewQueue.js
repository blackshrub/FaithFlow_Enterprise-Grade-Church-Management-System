/**
 * AI Content Review Queue
 *
 * This page displays all AI-generated content pending review.
 * Staff can approve or reject content with one click - no creative input required.
 * The AI autonomously generates content (devotions, figures, quizzes, etc.)
 * and this queue allows staff to review before publishing.
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckCircle, XCircle, Clock, Sparkles, Loader2, RefreshCw,
  FileText, User, HelpCircle, BookOpen, MessageSquare,
  Calendar, ChevronDown, Image, Eye, AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/useToast';
import exploreService from '../../services/exploreService';

// Content type configuration
const CONTENT_TYPES = {
  daily_devotion: {
    label: 'Devotion',
    icon: FileText,
    color: 'bg-blue-100 text-blue-800',
  },
  verse_of_the_day: {
    label: 'Verse',
    icon: MessageSquare,
    color: 'bg-green-100 text-green-800',
  },
  bible_figure: {
    label: 'Bible Figure',
    icon: User,
    color: 'bg-purple-100 text-purple-800',
  },
  daily_quiz: {
    label: 'Quiz',
    icon: HelpCircle,
    color: 'bg-orange-100 text-orange-800',
  },
  bible_study: {
    label: 'Bible Study',
    icon: BookOpen,
    color: 'bg-indigo-100 text-indigo-800',
  },
};

export default function ReviewQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [previewItem, setPreviewItem] = useState(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [itemToReject, setItemToReject] = useState(null);

  // Fetch review queue
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['review-queue', activeTab],
    queryFn: () => exploreService.getReviewQueue({
      content_type: activeTab === 'all' ? undefined : activeTab,
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['review-queue-stats'],
    queryFn: () => exploreService.getReviewQueueStats(),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ contentType, contentId, scheduledDate }) =>
      exploreService.approveContent(contentType, contentId, scheduledDate),
    onSuccess: () => {
      toast({
        title: 'Content Approved',
        description: 'The content has been published.',
      });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve content',
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ contentType, contentId, reason }) =>
      exploreService.rejectContent(contentType, contentId, reason),
    onSuccess: () => {
      toast({
        title: 'Content Rejected',
        description: 'The content has been rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-stats'] });
      setRejectDialogOpen(false);
      setRejectReason('');
      setItemToReject(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject content',
        variant: 'destructive',
      });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: ({ contentIds, scheduledDate }) =>
      exploreService.bulkApproveContent(contentIds, scheduledDate),
    onSuccess: (data) => {
      toast({
        title: 'Bulk Approve Complete',
        description: data.message,
      });
      setSelectedItems([]);
      setScheduleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk approve',
        variant: 'destructive',
      });
    },
  });

  // Trigger generation mutation
  const generateMutation = useMutation({
    mutationFn: (contentTypes) => exploreService.triggerGeneration(contentTypes),
    onSuccess: (data) => {
      toast({
        title: 'Generation Started',
        description: data.message || 'AI is generating new content...',
      });
      // Refetch after a delay to show new content
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        queryClient.invalidateQueries({ queryKey: ['review-queue-stats'] });
      }, 5000);
    },
    onError: (error) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate content',
        variant: 'destructive',
      });
    },
  });

  // Handle item selection
  const handleSelectItem = useCallback((item, checked) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        content_type: item._content_type,
        content_id: item.id,
      }]);
    } else {
      setSelectedItems(prev =>
        prev.filter(i => i.content_id !== item.id)
      );
    }
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((checked) => {
    if (checked && queueData?.items) {
      setSelectedItems(queueData.items.map(item => ({
        content_type: item._content_type,
        content_id: item.id,
      })));
    } else {
      setSelectedItems([]);
    }
  }, [queueData]);

  // Handle approve click
  const handleApprove = useCallback((item) => {
    approveMutation.mutate({
      contentType: item._content_type,
      contentId: item.id,
    });
  }, [approveMutation]);

  // Handle reject click
  const handleRejectClick = useCallback((item) => {
    setItemToReject(item);
    setRejectDialogOpen(true);
  }, []);

  // Confirm reject
  const handleConfirmReject = useCallback(() => {
    if (itemToReject) {
      rejectMutation.mutate({
        contentType: itemToReject._content_type,
        contentId: itemToReject.id,
        reason: rejectReason,
      });
    }
  }, [itemToReject, rejectReason, rejectMutation]);

  // Handle bulk approve
  const handleBulkApprove = useCallback((schedule = false) => {
    if (schedule) {
      setScheduleDialogOpen(true);
    } else {
      bulkApproveMutation.mutate({ contentIds: selectedItems });
    }
  }, [selectedItems, bulkApproveMutation]);

  // Confirm scheduled approval
  const handleConfirmSchedule = useCallback(() => {
    bulkApproveMutation.mutate({
      contentIds: selectedItems,
      scheduledDate: scheduledDate || null,
    });
  }, [selectedItems, scheduledDate, bulkApproveMutation]);

  // Get content type icon
  const getContentIcon = (type) => {
    const config = CONTENT_TYPES[type];
    if (!config) return FileText;
    return config.icon;
  };

  // Get content type badge
  const getContentBadge = (type) => {
    const config = CONTENT_TYPES[type];
    if (!config) return { label: type, color: 'bg-gray-100 text-gray-800' };
    return config;
  };

  const items = queueData?.items || [];
  const stats = statsData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            AI Review Queue
          </h1>
          <p className="text-gray-600 mt-1">
            Review and approve AI-generated content before publishing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={generateMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => generateMutation.mutate(['all'])}>
                Generate All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateMutation.mutate(['devotion'])}>
                Generate Devotion
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateMutation.mutate(['verse'])}>
                Generate Verse
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateMutation.mutate(['figure'])}>
                Generate Bible Figure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateMutation.mutate(['quiz'])}>
                Generate Quiz
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Generated Today</p>
                <p className="text-3xl font-bold text-purple-600">{stats.generated_today || 0}</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved_today || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected Today</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected_today || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkApprove(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule All
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkApprove(false)}
                  disabled={bulkApproveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({queueData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="devotion">
            Devotions ({stats.by_type?.devotion?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="verse">
            Verses ({stats.by_type?.verse?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="figure">
            Figures ({stats.by_type?.figure?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="quiz">
            Quizzes ({stats.by_type?.quiz?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="study">
            Studies ({stats.by_type?.study?.pending || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No content pending review</h3>
                <p className="text-gray-500 mt-2">
                  AI-generated content will appear here for your review.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => generateMutation.mutate(['all'])}
                  disabled={generateMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Content Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  checked={selectedItems.length === items.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select all</span>
              </div>

              {/* Content Items */}
              {items.map((item) => {
                const ContentIcon = getContentIcon(item._content_type);
                const badge = getContentBadge(item._content_type);
                const isSelected = selectedItems.some(i => i.content_id === item.id);

                return (
                  <Card key={item.id} className={isSelected ? 'ring-2 ring-blue-500' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectItem(item, checked)}
                          className="mt-1"
                        />

                        {/* Content Icon */}
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${badge.color.split(' ')[0]}`}>
                            <ContentIcon className={`h-6 w-6 ${badge.color.split(' ')[1]}`} />
                          </div>
                        </div>

                        {/* Content Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={badge.color}>{badge.label}</Badge>
                            <span className="text-sm text-gray-500">
                              {item.created_at && format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>

                          <h3 className="font-semibold text-gray-900 truncate">
                            {item._display_title}
                          </h3>

                          {/* Preview text */}
                          {item.content?.en && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                              {item.content.en.substring(0, 200)}...
                            </p>
                          )}
                          {item.biography?.en && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                              {item.biography.en.substring(0, 200)}...
                            </p>
                          )}
                          {item.verse_text?.en && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1 italic">
                              "{item.verse_text.en}"
                            </p>
                          )}

                          {/* Image indicator */}
                          {(item.cover_image || item.image_url) && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                              <Image className="h-4 w-4" />
                              <span>Image included</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewItem(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectClick(item)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleApprove(item)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem && (
                <>
                  <Badge className={getContentBadge(previewItem._content_type).color}>
                    {getContentBadge(previewItem._content_type).label}
                  </Badge>
                  {previewItem._display_title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewItem && (
            <div className="space-y-4">
              {/* Image Preview */}
              {(previewItem.cover_image || previewItem.image_url) && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={previewItem.cover_image || previewItem.image_url}
                    alt={previewItem._display_title}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Content based on type */}
              {previewItem._content_type === 'daily_devotion' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">Scripture Reference</h4>
                    <p className="text-gray-600">{previewItem.scripture_reference}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Content (English)</h4>
                    <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                      {previewItem.content?.en}
                    </div>
                  </div>
                  {previewItem.content?.id && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Content (Indonesian)</h4>
                      <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                        {previewItem.content?.id}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previewItem._content_type === 'bible_figure' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700">Testament</h4>
                      <p className="text-gray-600">{previewItem.testament}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Era</h4>
                      <p className="text-gray-600">{previewItem.era}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Biography (English)</h4>
                    <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                      {previewItem.biography?.en}
                    </div>
                  </div>
                  {previewItem.life_lessons?.en && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Life Lessons</h4>
                      <ul className="list-disc list-inside text-gray-600">
                        {previewItem.life_lessons.en.map((lesson, i) => (
                          <li key={i}>{lesson}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {previewItem._content_type === 'verse_of_the_day' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">Verse Reference</h4>
                    <p className="text-gray-600">{previewItem.verse_reference}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Verse Text</h4>
                    <p className="text-gray-600 italic">"{previewItem.verse_text?.en}"</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Reflection</h4>
                    <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                      {previewItem.reflection?.en}
                    </div>
                  </div>
                </div>
              )}

              {previewItem._content_type === 'daily_quiz' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">
                      Questions ({previewItem.questions?.length || 0})
                    </h4>
                    {previewItem.questions?.map((q, i) => (
                      <div key={i} className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{i + 1}. {q.question?.en}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {q.options?.en?.map((opt, j) => (
                            <div
                              key={j}
                              className={`p-2 rounded ${j === q.correct_answer ? 'bg-green-100 border-green-500 border' : 'bg-white border'}`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleRejectClick(previewItem);
                setPreviewItem(null);
              }}
            >
              <XCircle className="h-4 w-4 mr-1 text-red-500" />
              Reject
            </Button>
            <Button
              onClick={() => {
                handleApprove(previewItem);
                setPreviewItem(null);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Reject Content
            </DialogTitle>
            <DialogDescription>
              This content will be marked as rejected and removed from the queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Reason (optional)
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why are you rejecting this content? This helps improve future AI generation."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Schedule Publication
            </DialogTitle>
            <DialogDescription>
              Choose a date to publish {selectedItems.length} selected item{selectedItems.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Publication Date
              </label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSchedule}
              disabled={bulkApproveMutation.isPending || !scheduledDate}
            >
              {bulkApproveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
