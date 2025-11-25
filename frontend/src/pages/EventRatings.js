/**
 * Event Ratings & Reviews Page
 *
 * Admin/Staff view for all event ratings and reviews
 * Features:
 * - List all ratings across all events
 * - Filter by event
 * - View statistics (average rating, distribution)
 * - Delete inappropriate reviews
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Star,
  Trash2,
  Calendar,
  User,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import ratingReviewService from '../services/ratingReviewService';
import { eventsAPI } from '../services/api';

export default function EventRatings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch events for filter dropdown
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsAPI.list(),
  });

  // Fetch ratings
  const { data: ratings = [], isLoading, error } = useQuery({
    queryKey: ['ratings', selectedEvent],
    queryFn: () => {
      const params = selectedEvent !== 'all' ? { event_id: selectedEvent } : {};
      return ratingReviewService.getRatings(params);
    },
  });

  // Fetch statistics for all events
  const { data: allStats = [] } = useQuery({
    queryKey: ['ratings-stats-all'],
    queryFn: () => ratingReviewService.getAllEventsStats(),
  });

  // Delete rating mutation
  const deleteMutation = useMutation({
    mutationFn: (ratingId) => ratingReviewService.deleteRating(ratingId),
    onSuccess: () => {
      queryClient.invalidateQueries(['ratings']);
      queryClient.invalidateQueries(['ratings-stats-all']);
      toast.success('Rating deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete rating');
    },
  });

  // Filter ratings by search query
  const filteredRatings = ratings.filter((rating) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rating.event_name?.toLowerCase().includes(query) ||
      rating.member_name?.toLowerCase().includes(query) ||
      rating.review?.toLowerCase().includes(query)
    );
  });

  // Calculate rating color based on value
  const getRatingColor = (rating) => {
    if (rating >= 8) return 'text-green-600 bg-green-50';
    if (rating >= 6) return 'text-blue-600 bg-blue-50';
    if (rating >= 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get average rating for selected event or overall
  const getAverageRating = () => {
    if (filteredRatings.length === 0) return 0;
    const sum = filteredRatings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / filteredRatings.length).toFixed(1);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Event Ratings & Reviews</h1>
        <p className="text-gray-600 mt-2">
          View and manage member feedback for all events
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Reviews
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredRatings.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedEvent === 'all' ? 'Across all events' : 'For selected event'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Rating
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getAverageRating()}</div>
            <p className="text-xs text-gray-500 mt-1">Out of 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Events Rated
            </CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allStats.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Events with at least one review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Filter */}
            <div className="space-y-2">
              <Label htmlFor="event-filter" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Event
              </Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger id="event-filter">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by event, member, or review text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ratings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Ratings & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading ratings...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Failed to load ratings. Please try again.
            </div>
          ) : filteredRatings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No ratings found. Members can rate events they attended via the mobile app.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRatings.map((rating) => (
                    <TableRow key={rating.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {rating.event_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {rating.member_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`${getRatingColor(rating.rating)} font-bold text-base`}
                        >
                          {rating.rating}/10
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          {rating.review ? (
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {rating.review}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              No written review
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(rating.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this rating? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(rating.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Statistics Section */}
      {allStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allStats.slice(0, 5).map((stat) => (
                <div key={stat.event_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{stat.event_name}</h3>
                      <p className="text-sm text-gray-500">
                        {stat.total_reviews} reviews • Avg: {stat.average_rating}/10
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEvent(stat.event_id)}
                    >
                      View Reviews
                    </Button>
                  </div>
                  {/* Rating Distribution Bar Chart */}
                  <div className="flex items-center gap-1 h-8">
                    {Object.entries(stat.rating_distribution)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([rating, count]) => {
                        const percentage =
                          (count / stat.total_reviews) * 100 || 0;
                        return (
                          <div
                            key={rating}
                            className="relative group flex-1"
                            style={{ height: `${Math.max(percentage, 5)}%` }}
                          >
                            <div
                              className={`h-full ${getRatingColor(
                                Number(rating)
                              )} rounded-sm transition-all hover:opacity-80`}
                              title={`Rating ${rating}: ${count} reviews`}
                            />
                            <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                              {rating}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
