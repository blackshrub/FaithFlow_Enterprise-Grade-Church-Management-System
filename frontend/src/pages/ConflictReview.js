import React, { useState } from 'react';
import { useStatusConflicts, useResolveConflict } from '../hooks/useStatusAutomation';
import { useMemberStatuses } from '../hooks/useSettings';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Loader2, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

export default function ConflictReview() {
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [comment, setComment] = useState('');
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  const { data: conflicts = [], isLoading, error } = useStatusConflicts(statusFilter);
  const resolveConflict = useResolveConflict();

  const handleResolve = (conflict) => {
    setSelectedConflict(conflict);
    setSelectedStatusId('');
    setComment('');
    setIsResolveDialogOpen(true);
  };

  const handleSubmitResolve = () => {
    resolveConflict.mutate(
      { conflictId: selectedConflict.id, statusId: selectedStatusId || null, comment },
      {
        onSuccess: () => {
          setIsResolveDialogOpen(false);
          setSelectedConflict(null);
          setSelectedStatusId('');
          setComment('');
        },
      }
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Status Conflicts</h1>
          <p className="text-gray-600 mt-1">Review and resolve conflicting status rules</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('open')}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved
          </Button>
          <Button
            variant={!statusFilter ? 'default' : 'outline'}
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conflicts List</CardTitle>
          <CardDescription>
            {conflicts.length} conflict(s) {statusFilter ? `(${statusFilter})` : 'total'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading conflicts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Failed to load conflicts</p>
            </div>
          ) : conflicts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p className="font-medium">No conflicts!</p>
              <p className="text-sm mt-2">All rules are working without conflicts</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Matched Rules</TableHead>
                  <TableHead>Possible Statuses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((conflict) => (
                  <TableRow key={conflict.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{conflict.member_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{conflict.current_status || 'None'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{conflict.matched_rules?.length || 0} rules</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {conflict.possible_statuses?.map((status) => (
                          <Badge
                            key={status.id}
                            style={{
                              backgroundColor: status.color,
                              color: '#fff',
                            }}
                          >
                            {status.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {conflict.status === 'pending' ? (
                        <Badge variant="destructive">Pending</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">Resolved</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {conflict.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleResolve(conflict)}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Status Conflict</DialogTitle>
            <DialogDescription>
              Select the correct status for {selectedConflict?.member_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Member</p>
              <p className="text-lg font-semibold">{selectedConflict?.member_name}</p>
              <p className="text-sm text-gray-600 mt-1">
                Current: {selectedConflict?.current_status || 'None'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Matched Rules</Label>
              <div className="space-y-2">
                {selectedConflict?.matched_rules?.map((rule, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="font-medium text-sm text-blue-900">{rule.name}</p>
                    <p className="text-xs text-blue-700 mt-1">{rule.human_readable}</p>
                    <p className="text-xs text-gray-500 mt-1">Priority: {rule.priority}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Select Target Status *</Label>
              <RadioGroup value={selectedStatusId} onValueChange={setSelectedStatusId}>
                {selectedConflict?.possible_statuses?.map((status) => (
                  <div key={status.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={status.id} id={status.id} />
                    <Label htmlFor={status.id} className="flex items-center gap-2 cursor-pointer">
                      <Badge
                        style={{
                          backgroundColor: status.color,
                          color: '#fff',
                        }}
                      >
                        {status.name}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResolveDialogOpen(false)}
              disabled={resolveConflict.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResolve}
              disabled={!selectedStatusId || resolveConflict.isPending}
            >
              {resolveConflict.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Resolve Conflict'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
