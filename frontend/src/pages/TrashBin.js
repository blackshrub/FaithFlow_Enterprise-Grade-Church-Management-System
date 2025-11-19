import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Trash2, RotateCcw, Loader2, AlertTriangle, Trash } from 'lucide-react';
import MemberAvatar from '../components/MemberAvatar';
import { format } from 'date-fns';

export default function TrashBin() {
  const { church } = useAuth();
  const queryClient = useQueryClient();

  // Fetch trash
  const { data: trashedMembers = [], isLoading, error } = useQuery({
    queryKey: queryKeys.members.trash(church?.id),
    queryFn: () => membersAPI.listTrash().then(res => res.data),
    enabled: !!church?.id,
  });

  // Restore mutation
  const restoreMember = useMutation({
    mutationFn: (memberId) => membersAPI.restore(memberId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.trash(church?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success('Member restored successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to restore member');
    },
  });

  // Permanent delete mutation
  const permanentDelete = useMutation({
    mutationFn: (memberId) => membersAPI.permanentDelete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.trash(church?.id) });
      toast.success('Member permanently deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete member');
    },
  });

  const handleRestore = (member) => {
    if (window.confirm(`Restore ${member.full_name}?`)) {
      restoreMember.mutate(member.id);
    }
  };

  const handlePermanentDelete = (member) => {
    if (window.confirm(`PERMANENTLY delete ${member.full_name}? This cannot be undone!`)) {
      permanentDelete.mutate(member.id);
    }
  };

  const getDaysInTrash = (deletedAt) => {
    if (!deletedAt) return 0;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diff = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🗑️ Trash Bin</h1>
          <p className="text-gray-600 mt-1">
            Deleted members are kept for 14 days, then permanently removed
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Members</CardTitle>
          <CardDescription>
            {trashedMembers.length} member(s) in trash • Auto-deleted after 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading trash...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Failed to load trash</p>
            </div>
          ) : trashedMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trash className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">Trash bin is empty</p>
              <p className="text-sm mt-2">Deleted members will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead>Days in Trash</TableHead>
                  <TableHead>Auto-Delete In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trashedMembers.map((member) => {
                  const daysInTrash = getDaysInTrash(member.deleted_at);
                  const daysRemaining = Math.max(0, 14 - daysInTrash);
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <MemberAvatar 
                          name={member.full_name} 
                          photo={member.photo_base64}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          {member.member_status && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {member.member_status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {member.phone_whatsapp && <p>{member.phone_whatsapp}</p>}
                          {member.email && <p>{member.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.deleted_at ? (
                          <span className="text-sm text-gray-600">
                            {format(new Date(member.deleted_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{daysInTrash} days</Badge>
                      </TableCell>
                      <TableCell>
                        {daysRemaining > 0 ? (
                          <Badge 
                            variant="outline" 
                            className={daysRemaining <= 3 ? 'border-red-500 text-red-600' : 'border-amber-500 text-amber-600'}
                          >
                            {daysRemaining} days
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Deleting soon</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(member)}
                            disabled={restoreMember.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete(member)}
                            disabled={permanentDelete.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Forever
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {trashedMembers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Auto-Cleanup Policy</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Members in trash for more than <strong>14 days</strong> are automatically and permanently deleted every day at 2:00 AM.
                  Make sure to restore any accidentally deleted members before then!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
