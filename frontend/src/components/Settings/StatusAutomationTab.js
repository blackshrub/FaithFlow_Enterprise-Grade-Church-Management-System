import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatuses } from '../../hooks/useSettings';
import { toast } from 'sonner';
import {
  useStatusRules,
  useCreateStatusRule,
  useUpdateStatusRule,
  useDeleteStatusRule,
  useEvaluateAllRules,
  useSimulateRule,
} from '../../hooks/useStatusAutomation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationSettingsAPI } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Plus, Edit, Trash2, Loader2, PlayCircle, AlertCircle, X, Eye, Clock, CheckCircle2, Settings2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// ============= Condition Builder Component =============
function ConditionBuilder({ conditions, onConditionsChange, statuses, eventCategories }) {
  const addCondition = () => {
    onConditionsChange([
      ...conditions,
      { type: 'age', operator: '<', value: 18, logic: 'AND' },
    ]);
  };

  const removeCondition = (index) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, updates) => {
    onConditionsChange(
      conditions.map((cond, i) => (i === index ? { ...cond, ...updates } : cond))
    );
  };

  return (
    <div className="space-y-3">
      {conditions.map((condition, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <Select
              value={condition.type}
              onValueChange={(type) => {
                if (type === 'age') {
                  updateCondition(index, { type, operator: '<', value: 18 });
                } else if (type === 'attendance') {
                  updateCondition(index, {
                    type,
                    event_category_id: eventCategories[0]?.id || '',
                    window_days: 60,
                    operator: '>=',
                    count: 4,
                  });
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="age">Age</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCondition(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {condition.type === 'age' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Operator</Label>
                <Select
                  value={condition.operator}
                  onValueChange={(operator) => updateCondition(index, { operator })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">Younger than (&lt;)</SelectItem>
                    <SelectItem value="<=">At most (≤)</SelectItem>
                    <SelectItem value=">">Older than (&gt;)</SelectItem>
                    <SelectItem value=">=">At least (≥)</SelectItem>
                    <SelectItem value="==">Exactly (=)</SelectItem>
                    <SelectItem value="between">Between</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age (years)</Label>
                <Input
                  type="number"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) })}
                />
              </div>
              {condition.operator === 'between' && (
                <div className="col-span-2">
                  <Label>And (years)</Label>
                  <Input
                    type="number"
                    value={condition.value2 || condition.value + 10}
                    onChange={(e) => updateCondition(index, { value2: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </div>
          )}

          {condition.type === 'attendance' && (
            <div className="space-y-3">
              <div>
                <Label>Event Category</Label>
                <Select
                  value={condition.event_category_id}
                  onValueChange={(event_category_id) =>
                    updateCondition(index, { event_category_id })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Time Window (days)</Label>
                  <Input
                    type="number"
                    value={condition.window_days}
                    onChange={(e) =>
                      updateCondition(index, { window_days: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Count</Label>
                  <Input
                    type="number"
                    value={condition.count}
                    onChange={(e) => updateCondition(index, { count: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Operator</Label>
                <Select
                  value={condition.operator}
                  onValueChange={(operator) => updateCondition(index, { operator })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">Fewer than (&lt;)</SelectItem>
                    <SelectItem value="<=">At most (≤)</SelectItem>
                    <SelectItem value=">">More than (&gt;)</SelectItem>
                    <SelectItem value=">=">At least (≥)</SelectItem>
                    <SelectItem value="==">Exactly (=)</SelectItem>
                    <SelectItem value="!=">Not (≠)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {index < conditions.length - 1 && (
            <div className="pt-2 border-t">
              <Label>Logic with next condition</Label>
              <Select
                value={condition.logic || 'AND'}
                onValueChange={(logic) => updateCondition(index, { logic })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addCondition} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );
}

// ============= Main Component =============
export default function StatusAutomationTab() {
  const { church } = useAuth();
  const queryClient = useQueryClient();

  // ============= Rules State =============
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'global',
    current_status_id: null,
    action_status_id: '',
    conditions: [],
    enabled: true,
    priority: 0,
  });

  // ============= Automation Settings State =============
  const [automationSettings, setAutomationSettings] = useState({
    enabled: false,
    schedule: '00:00',
  });

  // ============= Data Hooks =============
  const { data: statusesRaw = [] } = useMemberStatuses();
  const { data: rulesRaw = [], isLoading: rulesLoading, error: rulesError } = useStatusRules();
  // Filter out any null/undefined items or items without id
  const statuses = (statusesRaw || []).filter(s => s && s.id);
  const rules = (rulesRaw || []).filter(r => r && r.id);
  const createRule = useCreateStatusRule();
  const updateRule = useUpdateStatusRule();
  const deleteRule = useDeleteStatusRule();
  const evaluateAll = useEvaluateAllRules();
  const simulateRule = useSimulateRule();

  // Automation settings query
  const { data: automationData, isLoading: automationLoading } = useQuery({
    queryKey: ['automation-settings', church?.id],
    queryFn: () => automationSettingsAPI.getSettings().then(res => res.data),
    enabled: !!church?.id,
  });

  const updateAutomationSettings = useMutation({
    mutationFn: (data) => automationSettingsAPI.updateSettings(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings', church?.id] });
      toast.success('Automation settings updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    },
  });

  // Simplified event categories for now
  const eventCategories = [
    { id: 'sunday-service', name: 'Sunday Service' },
  ];

  // ============= Effects =============
  useEffect(() => {
    if (automationData) {
      setAutomationSettings({
        enabled: automationData.automation_enabled || false,
        schedule: automationData.schedule || '00:00',
      });
    }
  }, [automationData]);

  // ============= Rules Handlers =============
  const handlePreviewExistingRule = (rule) => {
    if (!church?.id) return;
    const ruleData = {
      rule_type: rule.rule_type,
      current_status_id: rule.current_status_id,
      action_status_id: rule.action_status_id,
      conditions: rule.conditions,
      church_id: church.id
    };

    simulateRule.mutate(ruleData, {
      onSuccess: (data) => {
        setSimulationResults(data);
        setSelectedRule(rule);
        setIsPreviewDialogOpen(true);
      },
    });
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!church?.id) return;
    createRule.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
          setSimulationResults(null);
        },
      }
    );
  };

  const handleSimulate = () => {
    if (!formData.action_status_id || formData.conditions.length === 0) {
      toast.error('Please add conditions and select target status');
      return;
    }
    if (!church?.id) return;

    simulateRule.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: (data) => {
          setSimulationResults(data);
        },
      }
    );
  };

  const handleUpdateRule = async (e) => {
    e.preventDefault();
    if (!selectedRule?.id) return;
    updateRule.mutate(
      { id: selectedRule.id, data: formData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    deleteRule.mutate(ruleId);
  };

  const openEditDialog = (rule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      current_status_id: rule.current_status_id || null,
      action_status_id: rule.action_status_id,
      conditions: rule.conditions || [],
      enabled: rule.enabled ?? true,
      priority: rule.priority || 0,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rule_type: 'global',
      current_status_id: null,
      action_status_id: '',
      conditions: [],
      enabled: true,
      priority: 0,
    });
    setSelectedRule(null);
    setSimulationResults(null);
  };

  // ============= Automation Handlers =============
  const handleRunNow = () => {
    if (window.confirm('Run status automation now for all members?')) {
      evaluateAll.mutate();
    }
  };

  const handleSaveAutomation = () => {
    updateAutomationSettings.mutate({
      automation_enabled: automationSettings.enabled,
      schedule: automationSettings.schedule,
    });
  };

  const lastRun = automationData?.last_run_at;
  const churchTimezone = 'UTC';

  // ============= Rule Form Component =============
  const RuleForm = ({ onSubmit, isEdit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Rule Name *</Label>
        <Input
          placeholder="e.g., Auto NextGen for Under 15"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Describe this rule"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rule Type *</Label>
          <Select
            value={formData.rule_type}
            onValueChange={(rule_type) => setFormData({ ...formData, rule_type })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (All Members)</SelectItem>
              <SelectItem value="status_based">Status-Based</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      {formData.rule_type === 'status_based' && (
        <div className="space-y-2">
          <Label>Current Status (trigger) *</Label>
          <Select
            value={formData.current_status_id || ''}
            onValueChange={(current_status_id) =>
              setFormData({ ...formData, current_status_id })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Conditions *</Label>
        <ConditionBuilder
          conditions={formData.conditions}
          onConditionsChange={(conditions) => setFormData({ ...formData, conditions })}
          statuses={statuses}
          eventCategories={eventCategories}
        />
      </div>

      <div className="space-y-2">
        <Label>Target Status (action) *</Label>
        <Select
          value={formData.action_status_id}
          onValueChange={(action_status_id) =>
            setFormData({ ...formData, action_status_id })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
        />
        <Label>Enable Rule</Label>
      </div>

      {/* Simulation Preview */}
      {simulationResults && (
        <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-900">Simulation Results</h4>
            <Badge variant="default" className="bg-blue-600">
              {simulationResults.matched_count} / {simulationResults.total_members} members
            </Badge>
          </div>
          <p className="text-sm text-blue-800">
            This rule will change <strong>{simulationResults.matched_count}</strong> member(s) to{' '}
            <strong>{simulationResults.target_status_name}</strong>
          </p>
          {simulationResults.matched_members?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-900">
                Preview (showing first {Math.min(10, simulationResults.matched_members.length)}):
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(simulationResults.matched_members || []).filter(m => m && m.id).slice(0, 10).map((member) => (
                  <div key={member.id} className="text-xs bg-white rounded p-2">
                    <span className="font-medium">{member.full_name}</span>
                    {member.current_status && (
                      <span className="text-gray-600"> (Current: {member.current_status})</span>
                    )}
                    {member.age !== null && member.age !== undefined && (
                      <span className="text-gray-500"> • Age: {member.age}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => isEdit ? setIsEditDialogOpen(false) : setIsCreateDialogOpen(false)}
          disabled={isEdit ? updateRule.isPending : createRule.isPending}
        >
          Cancel
        </Button>
        {!isEdit && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleSimulate}
            disabled={simulateRule.isPending || !formData.action_status_id || formData.conditions.length === 0}
          >
            {simulateRule.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              'Preview Members'
            )}
          </Button>
        )}
        <Button type="submit" disabled={isEdit ? updateRule.isPending : createRule.isPending}>
          {(isEdit ? updateRule.isPending : createRule.isPending) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Update Rule' : 'Create Rule'
          )}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Status Automation</h2>
          <p className="text-sm text-gray-500">Configure rules and schedule for automatic member status updates</p>
        </div>
        <Button variant="outline" onClick={handleRunNow} disabled={evaluateAll.isPending}>
          {evaluateAll.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Run Now
            </>
          )}
        </Button>
      </div>

      {/* Section 1: Rules */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Define conditions that trigger automatic status changes
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Rule</DialogTitle>
                </DialogHeader>
                <RuleForm onSubmit={handleCreateRule} isEdit={false} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : rulesError ? (
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Failed to load rules</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <PlayCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No rules yet. Create your first automation rule!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Rule Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant={rule.rule_type === 'global' ? 'default' : 'secondary'}>
                        {rule.rule_type === 'global' ? 'Global' : 'Status-Based'}
                      </Badge>
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      {rule.enabled ? (
                        <Badge variant="default" className="bg-green-600">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-md truncate">
                      {rule.human_readable || 'No description'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewExistingRule(rule)}
                          disabled={simulateRule.isPending}
                          title="Preview affected members"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={deleteRule.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Separator />

      {/* Section 2: Automation Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automation Schedule
          </CardTitle>
          <CardDescription>
            Configure when automation runs automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {automationLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Loading settings...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Automation Status</p>
                    <p className="text-sm text-gray-500">Automatic status updates</p>
                  </div>
                </div>
                <Badge variant={automationSettings.enabled ? 'default' : 'secondary'}>
                  {automationSettings.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={automationSettings.enabled}
                    onCheckedChange={(enabled) => setAutomationSettings({ ...automationSettings, enabled })}
                  />
                  <div className="flex-1">
                    <Label>Enable Automatic Status Updates</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, member statuses will be automatically updated daily based on rules
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule">Daily Schedule (Your Church Time)</Label>
                  <Input
                    id="schedule"
                    type="time"
                    value={automationSettings.schedule}
                    onChange={(e) => setAutomationSettings({ ...automationSettings, schedule: e.target.value })}
                    disabled={!automationSettings.enabled}
                    className="w-40"
                  />
                  <p className="text-xs text-gray-500">
                    Automation will run once daily at this time in your church's timezone ({churchTimezone}).
                  </p>
                </div>

                {lastRun && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Last Run</p>
                        <p className="text-sm text-green-700">
                          {new Date(lastRun).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveAutomation} disabled={updateAutomationSettings.isPending}>
                    {updateAutomationSettings.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Schedule'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
          </DialogHeader>
          <RuleForm onSubmit={handleUpdateRule} isEdit={true} />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {selectedRule?.name}</DialogTitle>
            <DialogDescription>
              Members that would be affected by this rule
            </DialogDescription>
          </DialogHeader>
          {simulationResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <strong>{simulationResults.matched_count}</strong> of {simulationResults.total_members} members match
                </p>
                <Badge>{simulationResults.target_status_name}</Badge>
              </div>
              {simulationResults.matched_members?.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(simulationResults.matched_members || []).filter(m => m && m.id).map((member) => (
                    <div key={member.id} className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{member.full_name}</span>
                      {member.current_status && (
                        <span className="text-gray-600 ml-2">
                          (Current: {member.current_status})
                        </span>
                      )}
                      {member.age !== null && member.age !== undefined && (
                        <span className="text-gray-500 ml-2">• Age: {member.age}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No members match this rule</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
