import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  useCounselors,
  useRecurringRules,
  useCreateRecurringRule,
  useUpdateRecurringRule,
  useDeleteRecurringRule,
  useOverrides,
  useCreateOverride,
  useUpdateOverride,
  useDeleteOverride,
  useTimeSlots
} from '../../hooks/useCounseling';
import { format } from 'date-fns';

const AvailabilityPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('rules');
  const [selectedCounselor, setSelectedCounselor] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Recurring Rules State
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isDeleteRuleDialogOpen, setIsDeleteRuleDialogOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    counselor_id: '',
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    slot_length_minutes: 60
  });

  // Override State
  const [isOverrideFormOpen, setIsOverrideFormOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [isDeleteOverrideDialogOpen, setIsDeleteOverrideDialogOpen] = useState(false);
  const [deletingOverride, setDeletingOverride] = useState(null);
  const [overrideFormData, setOverrideFormData] = useState({
    counselor_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '00:00',
    end_time: '23:59',
    action: 'block',
    reason: ''
  });

  const { data: counselors = [] } = useCounselors();
  const { data: recurringRules = [] } = useRecurringRules();
  const { data: overrides = [] } = useOverrides();
  const { data: slots = [] } = useTimeSlots({ 
    counselor_id: selectedCounselor || undefined,
    date_from: selectedDate,
    date_to: selectedDate 
  });

  const createRuleMutation = useCreateRecurringRule();
  const updateRuleMutation = useUpdateRecurringRule();
  const deleteRuleMutation = useDeleteRecurringRule();
  const createOverrideMutation = useCreateOverride();
  const updateOverrideMutation = useUpdateOverride();
  const deleteOverrideMutation = useDeleteOverride();

  // Recurring Rules Handlers
  const handleOpenRuleForm = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleFormData({
        counselor_id: rule.counselor_id,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
        slot_length_minutes: rule.slot_length_minutes
      });
    } else {
      setEditingRule(null);
      setRuleFormData({
        counselor_id: '',
        day_of_week: 0,
        start_time: '09:00',
        end_time: '17:00',
        slot_length_minutes: 60
      });
    }
    setIsRuleFormOpen(true);
  };

  const handleSubmitRule = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await updateRuleMutation.mutateAsync({
          id: editingRule.id,
          data: ruleFormData
        });
        toast({ title: t('counseling.success_rule_updated') });
      } else {
        await createRuleMutation.mutateAsync(ruleFormData);
        toast({ title: t('counseling.success_rule_created') });
      }
      setIsRuleFormOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRule = async () => {
    try {
      await deleteRuleMutation.mutateAsync(deletingRule.id);
      toast({ title: t('counseling.success_rule_deleted') });
      setIsDeleteRuleDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  // Override Handlers
  const handleOpenOverrideForm = (override = null) => {
    if (override) {
      setEditingOverride(override);
      setOverrideFormData({
        counselor_id: override.counselor_id,
        date: override.date,
        start_time: override.start_time,
        end_time: override.end_time,
        action: override.action,
        reason: override.reason || ''
      });
    } else {
      setEditingOverride(null);
      setOverrideFormData({
        counselor_id: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '00:00',
        end_time: '23:59',
        action: 'block',
        reason: ''
      });
    }
    setIsOverrideFormOpen(true);
  };

  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    try {
      if (editingOverride) {
        await updateOverrideMutation.mutateAsync({
          id: editingOverride.id,
          data: overrideFormData
        });
        toast({ title: t('counseling.success_override_updated') });
      } else {
        await createOverrideMutation.mutateAsync(overrideFormData);
        toast({ title: t('counseling.success_override_created') });
      }
      setIsOverrideFormOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteOverride = async () => {
    try {
      await deleteOverrideMutation.mutateAsync(deletingOverride.id);
      toast({ title: t('counseling.success_override_deleted') });
      setIsDeleteOverrideDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('counseling.availability')}</h1>
        <p className="text-gray-500 mt-1">Manage Counselor Availability and Schedules</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">{t('counseling.recurring_rules')}</TabsTrigger>
          <TabsTrigger value="overrides">{t('counseling.overrides')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('counseling.calendar_view')}</TabsTrigger>
        </TabsList>

        {/* Recurring Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Define weekly recurring availability patterns for counselors.
            </p>
            <Button onClick={() => handleOpenRuleForm()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('counseling.add_rule')}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {recurringRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No Recurring Rules Configured.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('counseling.counselor')}</TableHead>
                      <TableHead>{t('counseling.day_of_week')}</TableHead>
                      <TableHead>{t('counseling.start_time')}</TableHead>
                      <TableHead>{t('counseling.end_time')}</TableHead>
                      <TableHead>{t('counseling.slot_length')}</TableHead>
                      <TableHead>{t('counseling.status')}</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurringRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.counselor_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t(`counseling.${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][rule.day_of_week]}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.start_time}</TableCell>
                        <TableCell>{rule.end_time}</TableCell>
                        <TableCell>{rule.slot_length_minutes} min</TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? t('counseling.active') : t('counseling.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRuleForm(rule)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingRule(rule);
                                setIsDeleteRuleDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Create date-specific exceptions to block or add extra availability.
            </p>
            <Button onClick={() => handleOpenOverrideForm()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('counseling.add_override')}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {overrides.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No Overrides Configured.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('counseling.counselor')}</TableHead>
                      <TableHead>{t('counseling.date')}</TableHead>
                      <TableHead>{t('counseling.start_time')}</TableHead>
                      <TableHead>{t('counseling.end_time')}</TableHead>
                      <TableHead>{t('counseling.action')}</TableHead>
                      <TableHead>{t('counseling.reason')}</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map((override) => (
                      <TableRow key={override.id}>
                        <TableCell>{override.counselor_name}</TableCell>
                        <TableCell>{format(new Date(override.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{override.start_time}</TableCell>
                        <TableCell>{override.end_time}</TableCell>
                        <TableCell>
                          <Badge variant={override.action === 'block' ? 'destructive' : 'default'}>
                            {t(`counseling.action_${override.action}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{override.reason || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenOverrideForm(override)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingOverride(override);
                                setIsDeleteOverrideDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>{t('counseling.select_counselor')}</Label>
              <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                <SelectTrigger>
                  <SelectValue placeholder="All Counselors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Counselors</SelectItem>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>{t('counseling.select_date')}</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {slots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('counseling.no_slots_available')}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-3 border rounded-lg text-center ${
                        slot.status === 'open' ? 'bg-green-50 border-green-200' :
                        slot.status === 'booked' ? 'bg-gray-100 border-gray-300' :
                        'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="text-sm font-medium">{slot.start_time}</div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {t(`counseling.slot_status_${slot.status}`)}
                      </Badge>
                      {slot.appointment_info && (
                        <div className="text-xs text-gray-600 mt-1">
                          {slot.appointment_info.member_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recurring Rule Form Dialog */}
      <Dialog open={isRuleFormOpen} onOpenChange={setIsRuleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? t('counseling.edit_rule') : t('counseling.add_rule')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitRule}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('counseling.counselor')} *</Label>
                <Select
                  value={ruleFormData.counselor_id}
                  onValueChange={(value) => setRuleFormData({ ...ruleFormData, counselor_id: value })}
                  disabled={!!editingRule}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {counselors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('counseling.day_of_week')} *</Label>
                <Select
                  value={ruleFormData.day_of_week.toString()}
                  onValueChange={(value) => setRuleFormData({ ...ruleFormData, day_of_week: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{t(`counseling.${day}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('counseling.start_time')} *</Label>
                  <Input
                    type="time"
                    value={ruleFormData.start_time}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('counseling.end_time')} *</Label>
                  <Input
                    type="time"
                    value={ruleFormData.end_time}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('counseling.slot_length')}</Label>
                <Input
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={ruleFormData.slot_length_minutes}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, slot_length_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRuleFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingRule ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Override Form Dialog */}
      <Dialog open={isOverrideFormOpen} onOpenChange={setIsOverrideFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOverride ? t('counseling.edit_override') : t('counseling.add_override')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitOverride}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('counseling.counselor')} *</Label>
                <Select
                  value={overrideFormData.counselor_id}
                  onValueChange={(value) => setOverrideFormData({ ...overrideFormData, counselor_id: value })}
                  disabled={!!editingOverride}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {counselors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('counseling.date')} *</Label>
                <Input
                  type="date"
                  value={overrideFormData.date}
                  onChange={(e) => setOverrideFormData({ ...overrideFormData, date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('counseling.start_time')} *</Label>
                  <Input
                    type="time"
                    value={overrideFormData.start_time}
                    onChange={(e) => setOverrideFormData({ ...overrideFormData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('counseling.end_time')} *</Label>
                  <Input
                    type="time"
                    value={overrideFormData.end_time}
                    onChange={(e) => setOverrideFormData({ ...overrideFormData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('counseling.action')} *</Label>
                <Select
                  value={overrideFormData.action}
                  onValueChange={(value) => setOverrideFormData({ ...overrideFormData, action: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">{t('counseling.action_block')}</SelectItem>
                    <SelectItem value="add_extra">{t('counseling.action_add_extra')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('counseling.reason')}</Label>
                <Textarea
                  value={overrideFormData.reason}
                  onChange={(e) => setOverrideFormData({ ...overrideFormData, reason: e.target.value })}
                  placeholder="e.g., Christmas Holiday, Conference"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOverrideFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingOverride ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <Dialog open={isDeleteRuleDialogOpen} onOpenChange={setIsDeleteRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.confirm_delete_rule')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteRuleDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRule}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOverrideDialogOpen} onOpenChange={setIsDeleteOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.confirm_delete_override')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOverrideDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOverride}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvailabilityPage;
