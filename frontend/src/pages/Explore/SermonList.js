import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  Plus, MoreVertical, Edit, Trash2, Loader2, Music, Calendar,
  BookOpen, Sparkles, Info, ChevronRight
} from 'lucide-react';
import { useSermons, useDeleteSermon } from '../../hooks/useExplore';
import { format, parseISO, isFuture, isPast, isThisWeek } from 'date-fns';

// Integration mode badges
const integrationModeStyles = {
  full: { bg: 'bg-green-100', text: 'text-green-800', label: 'Full' },
  partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
  disabled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Off' },
};

export default function SermonList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [sermonToDelete, setSermonToDelete] = useState(null);

  // Fetch sermons (next 8 weeks by default)
  const { data: sermonsData, isLoading, error } = useSermons(12);

  // Delete mutation
  const deleteMutation = useDeleteSermon();

  const sermons = sermonsData?.sermons || [];

  // Group sermons by month
  const groupedSermons = sermons.reduce((groups, sermon) => {
    const date = parseISO(sermon.date);
    const month = format(date, 'MMMM yyyy');
    if (!groups[month]) groups[month] = [];
    groups[month].push(sermon);
    return groups;
  }, {});

  const handleDelete = () => {
    if (!sermonToDelete) return;
    deleteMutation.mutate(sermonToDelete.id, {
      onSuccess: () => setSermonToDelete(null),
    });
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load sermons: {error.message}</p>
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
            <Music className="h-6 w-6" />
            Sermon Integration
          </h1>
          <p className="text-gray-600">
            Input Sunday sermons to integrate themes into weekly Explore content
          </p>
        </div>
        <Link to="/content-center/sermons/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Sermon
          </Button>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How Sermon Integration Works</h3>
              <p className="text-gray-600 mt-1">
                When you input a Sunday sermon with themes, the Explore content (devotions, verses, quizzes)
                throughout the week will be influenced by the sermon's themes. This creates a cohesive
                spiritual journey that reinforces Sunday's message.
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1">
                  <Badge className="bg-green-100 text-green-800">Full</Badge>
                  <span className="text-gray-500">Deep thematic influence</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                  <span className="text-gray-500">Light connection</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className="bg-gray-100 text-gray-800">Off</Badge>
                  <span className="text-gray-500">Independent content</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sermon List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : sermons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No sermons yet</h3>
            <p className="text-gray-500 mb-4">
              Add your first Sunday sermon to start integrating themes into Explore content
            </p>
            <Link to="/content-center/sermons/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Sermon
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSermons).map(([month, monthSermons]) => (
            <div key={month}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{month}</h2>
              <div className="space-y-3">
                {monthSermons.map((sermon) => {
                  const date = parseISO(sermon.date);
                  const isPastSermon = isPast(date);
                  const isCurrentWeek = isThisWeek(date, { weekStartsOn: 0 });
                  const integrationStyle = integrationModeStyles[sermon.integration_mode] || integrationModeStyles.disabled;

                  return (
                    <Card
                      key={sermon.id}
                      className={`hover:shadow-md transition-shadow ${
                        isCurrentWeek ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Date Badge */}
                          <div className={`flex-shrink-0 w-16 text-center p-2 rounded-lg ${
                            isPastSermon ? 'bg-gray-100' : 'bg-blue-100'
                          }`}>
                            <div className={`text-2xl font-bold ${
                              isPastSermon ? 'text-gray-500' : 'text-blue-600'
                            }`}>
                              {format(date, 'd')}
                            </div>
                            <div className={`text-xs ${
                              isPastSermon ? 'text-gray-400' : 'text-blue-500'
                            }`}>
                              {format(date, 'EEE')}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {sermon.title?.en || 'Untitled'}
                                </h3>
                                {sermon.series_name?.en && (
                                  <p className="text-sm text-gray-500">
                                    Series: {sermon.series_name.en}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isCurrentWeek && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    This Week
                                  </Badge>
                                )}
                                <Badge className={`${integrationStyle.bg} ${integrationStyle.text}`}>
                                  {integrationStyle.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Scripture & Theme */}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {sermon.main_scripture?.book} {sermon.main_scripture?.chapter}:{sermon.main_scripture?.verses}
                              </span>
                              {sermon.preacher && (
                                <span>{sermon.preacher}</span>
                              )}
                            </div>

                            {/* Themes */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {sermon.primary_theme?.replace('_', ' ')}
                              </Badge>
                              {(sermon.secondary_themes || []).slice(0, 3).map(theme => (
                                <Badge key={theme} variant="outline" className="text-gray-600">
                                  {theme.replace('_', ' ')}
                                </Badge>
                              ))}
                              {(sermon.secondary_themes || []).length > 3 && (
                                <Badge variant="outline" className="text-gray-400">
                                  +{sermon.secondary_themes.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/content-center/sermons/${sermon.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setSermonToDelete(sermon)}
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
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={sermonToDelete !== null} onOpenChange={(open) => !open && setSermonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sermon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the sermon "{sermonToDelete?.title?.en}" and its content integration settings.
              This action cannot be undone.
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
