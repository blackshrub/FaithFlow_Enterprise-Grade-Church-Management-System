import React from 'react';
import { useMemberStatusHistory } from '../../hooks/useStatusAutomation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, User, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function StatusHistoryTimeline({ memberId }) {
  const { data: history = [], isLoading, error } = useMemberStatusHistory(memberId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading status history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-red-500">Failed to load status history</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">No status changes yet</p>
        </CardContent>
      </Card>
    );
  }

  const getChangeTypeIcon = (type) => {
    switch (type) {
      case 'manual':
        return <User className="h-4 w-4" />;
      case 'automation':
        return <Zap className="h-4 w-4" />;
      case 'conflict_resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getChangeTypeBadge = (type) => {
    switch (type) {
      case 'manual':
        return <Badge variant="secondary">Manual</Badge>;
      case 'automation':
        return <Badge variant="default" className="bg-blue-600">Automation</Badge>;
      case 'conflict_resolved':
        return <Badge variant="default" className="bg-green-600">Conflict Resolved</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Change History</CardTitle>
        <CardDescription>{history.length} change(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {history.map((entry, index) => (
            <div key={entry.id} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className={`absolute left-2.5 w-3 h-3 rounded-full ${
                  entry.change_type === 'automation'
                    ? 'bg-blue-600'
                    : entry.change_type === 'conflict_resolved'
                    ? 'bg-green-600'
                    : 'bg-gray-400'
                } border-2 border-white`}
              />

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getChangeTypeBadge(entry.change_type)}
                    <span className="text-xs text-gray-500">
                      {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {entry.previous_status && (
                    <Badge variant="outline">{entry.previous_status}</Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge variant="default">{entry.new_status}</Badge>
                </div>

                {entry.change_type === 'manual' && entry.changed_by_user_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-3 w-3" />
                    <span>Changed by {entry.changed_by_user_name}</span>
                  </div>
                )}

                {entry.change_type === 'automation' && entry.rule_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="h-3 w-3" />
                    <span>Rule: {entry.rule_name}</span>
                  </div>
                )}

                {entry.change_type === 'conflict_resolved' && entry.changed_by_user_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Resolved by {entry.changed_by_user_name}</span>
                  </div>
                )}

                {entry.notes && (
                  <p className="text-xs text-gray-500 italic">{entry.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
