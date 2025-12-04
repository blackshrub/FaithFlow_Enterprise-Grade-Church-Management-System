import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
  Plus, Search, MoreVertical, Edit, Trash2, Eye, Loader2,
  Map, Calendar, Users, Star, ChevronRight, Archive, Upload
} from 'lucide-react';
import { useJourneys, useDeleteJourney, usePublishJourney, useArchiveJourney } from '../../hooks/useExplore';

// Category styling
const categoryStyles = {
  life_transition: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Life Transition' },
  spiritual_growth: { bg: 'bg-red-100', text: 'text-red-800', label: 'Spiritual Growth' },
  relationships: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Relationships' },
  emotional_health: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Emotional Health' },
  leadership: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Leadership' },
  foundation: { bg: 'bg-green-100', text: 'text-green-800', label: 'Foundation' },
};

// Status styling
const statusStyles = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
  published: { bg: 'bg-green-100', text: 'text-green-800' },
  archived: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

export default function JourneyList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [journeyToDelete, setJourneyToDelete] = useState(null);

  // Fetch journeys
  const { data: journeysData, isLoading, error } = useJourneys({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  // Mutations
  const deleteMutation = useDeleteJourney();
  const publishMutation = usePublishJourney();
  const archiveMutation = useArchiveJourney();

  const journeys = journeysData?.journeys || [];

  // Filter by search query
  const filteredJourneys = journeys.filter((journey) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      journey.title?.en?.toLowerCase().includes(query) ||
      journey.title?.id?.toLowerCase().includes(query) ||
      journey.slug?.toLowerCase().includes(query) ||
      journey.target_situation?.toLowerCase().includes(query)
    );
  });

  const handleDelete = () => {
    if (!journeyToDelete) return;
    deleteMutation.mutate(journeyToDelete.id, {
      onSuccess: () => setJourneyToDelete(null),
    });
  };

  const handlePublish = (journeyId) => {
    publishMutation.mutate(journeyId);
  };

  const handleArchive = (journeyId) => {
    archiveMutation.mutate(journeyId);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load journeys: {error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="h-6 w-6" />
            Life Stage Journeys
          </h1>
          <p className="text-gray-600">
            Multi-week spiritual programs for specific life situations
          </p>
        </div>
        <Link to="/content-center/journey/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Journey
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {journeys.filter(j => j.status === 'published').length}
            </div>
            <p className="text-sm text-gray-500">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {journeys.filter(j => j.status === 'draft').length}
            </div>
            <p className="text-sm text-gray-500">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {journeys.reduce((sum, j) => sum + (j.enrollments_count || 0), 0)}
            </div>
            <p className="text-sm text-gray-500">Total Enrollments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {journeys.reduce((sum, j) => sum + (j.completions_count || 0), 0)}
            </div>
            <p className="text-sm text-gray-500">Completions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search journeys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryStyles).map(([value, style]) => (
                  <SelectItem key={value} value={value}>{style.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Journey List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredJourneys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No journeys found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first life stage journey'}
            </p>
            {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
              <Link to="/content-center/journey/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Journey
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJourneys.map((journey) => {
            const catStyle = categoryStyles[journey.category] || categoryStyles.spiritual_growth;
            const statStyle = statusStyles[journey.status] || statusStyles.draft;

            return (
              <Card key={journey.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Color indicator */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: journey.color || '#6366F1' }}
                    >
                      <Map className="h-6 w-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {journey.title?.en || journey.slug}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {journey.subtitle?.en || journey.target_situation}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${catStyle.bg} ${catStyle.text}`}>
                            {catStyle.label}
                          </Badge>
                          <Badge className={`${statStyle.bg} ${statStyle.text}`}>
                            {journey.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {journey.duration_weeks} weeks
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {journey.enrollments_count || 0} enrolled
                        </span>
                        {journey.average_rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {journey.average_rating.toFixed(1)}
                          </span>
                        )}
                        <span className="text-gray-400">
                          {journey.difficulty}
                        </span>
                      </div>

                      {/* Description */}
                      {journey.description?.en && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {journey.description.en}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/content-center/journey/${journey.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(`/public/explore/journey/${journey.slug}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        {journey.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handlePublish(journey.id)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {journey.status === 'published' && (
                          <DropdownMenuItem onClick={() => handleArchive(journey.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setJourneyToDelete(journey)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={journeyToDelete !== null} onOpenChange={(open) => !open && setJourneyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{journeyToDelete?.title?.en || journeyToDelete?.slug}".
              This action cannot be undone and will remove all associated content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
