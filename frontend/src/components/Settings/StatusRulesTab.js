import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatuses } from '../../hooks/useSettings';
import {
  useStatusRules,
  useCreateStatusRule,
  useUpdateStatusRule,
  useDeleteStatusRule,
  useEvaluateAllRules,
  useSimulateRule,
} from '../../hooks/useStatusAutomation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, PlayCircle, AlertCircle, X } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
                    <SelectItem value="<=">At most (&le;)</SelectItem>
                    <SelectItem value=">">Older than (&gt;)</SelectItem>
                    <SelectItem value=">=">At least (&ge;)</SelectItem>
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
                    <SelectItem value="<=">At most (&le;)</SelectItem>
                    <SelectItem value=">">More than (&gt;)</SelectItem>
                    <SelectItem value=">=">At least (&ge;)</SelectItem>
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

export default function StatusRulesTab() {
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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

  const { data: statuses = [] } = useMemberStatuses();
  const { data: rules = [], isLoading, error } = useStatusRules();
  const createRule = useCreateStatusRule();
  const updateRule = useUpdateStatusRule();
  const deleteRule = useDeleteStatusRule();
  const evaluateAll = useEvaluateAllRules();
  const simulateRule = useSimulateRule();

  // Fetch event categories (you might need to add this API)
  const eventCategories = [
    { id: 'sunday-service', name: 'Sunday Service' },
  ]; // Simplified for now

  const handleCreateRule = async (e) => {
    e.preventDefault();
    createRule.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateRule = async (e) => {
    e.preventDefault();
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
  };

  const handleRunAutomation = () => {
    if (window.confirm('Run status automation now for all members?')) {
      evaluateAll.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Status Rules</h2>
          <p className="text-sm text-gray-500">Automate member status changes based on conditions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunAutomation} disabled={evaluateAll.isPending}>
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
              <form onSubmit={handleCreateRule} className="space-y-4">
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={createRule.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRule.isPending}>
                    {createRule.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules List</CardTitle>
          <CardDescription>{rules.length} rule(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : error ? (
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

      {/* Edit Dialog - Similar to Create */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRule} className="space-y-4">
            {/* Same fields as create form */}
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateRule.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateRule.isPending}>
                {updateRule.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
