import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useTestWebhook } from '../../hooks/useWebhooks';
import { useAPIKeys, useCreateAPIKey, useDeleteAPIKey, useRegenerateAPIKey } from '../../hooks/useAPIKeys';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, Zap, CheckCircle, XCircle, Eye, Key, RefreshCw, Copy } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

const initialFormData = {
  name: '',
  webhook_url: '',
  secret_key: '',
  events: ['member.created', 'member.updated', 'member.deleted'],
  is_active: true,
  retry_count: 3,
  timeout_seconds: 30,
  custom_headers: {}
};

export default function WebhooksTab() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [testResult, setTestResult] = useState(null);
  const [newAPIKeyData, setNewAPIKeyData] = useState(null);
  const [isAPIKeyDialogOpen, setIsAPIKeyDialogOpen] = useState(false);

  const { data: webhooks = [], isLoading, error } = useWebhooks();
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useAPIKeys();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();
  const createAPIKey = useCreateAPIKey();
  const deleteAPIKey = useDeleteAPIKey();
  const regenerateAPIKey = useRegenerateAPIKey();

  const handleCreateAPIKey = async () => {
    const result = await createAPIKey.mutateAsync({
      name: 'External App Integration',
      church_id: church.id
    });
    
    // Show the generated key (only shown once!)
    setNewAPIKeyData(result);
    setIsAPIKeyDialogOpen(true);
  };

  const handleRegenerateAPIKey = async (keyId) => {
    if (!window.confirm(t('settings.apiKeys.confirmRegenerate'))) {
      return;
    }
    
    const result = await regenerateAPIKey.mutateAsync(keyId);
    setNewAPIKeyData(result);
    setIsAPIKeyDialogOpen(true);
  };

  const handleDeleteAPIKey = async (keyId) => {
    if (!window.confirm(t('settings.apiKeys.confirmDelete'))) {
      return;
    }
    deleteAPIKey.mutate(keyId);
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    createWebhook.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateWebhook = async (e) => {
    e.preventDefault();
    updateWebhook.mutate(
      { id: selectedWebhook.id, data: formData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!window.confirm(t('settings.webhooks.confirmDelete'))) {
      return;
    }
    deleteWebhook.mutate(webhookId);
  };

  const handleTestWebhook = async (webhookId) => {
    setTestResult(null);
    const result = await testWebhook.mutateAsync(webhookId);
    setTestResult(result);
    setTimeout(() => setTestResult(null), 5000);
  };

  const openEditDialog = (webhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name || '',
      webhook_url: webhook.webhook_url || '',
      secret_key: webhook.secret_key || '',
      events: webhook.events || [],
      is_active: webhook.is_active ?? true,
      retry_count: webhook.retry_count || 3,
      timeout_seconds: webhook.timeout_seconds || 30,
      custom_headers: webhook.custom_headers || {}
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedWebhook(null);
  };

  const toggleEvent = (event) => {
    const events = formData.events.includes(event)
      ? formData.events.filter(e => e !== event)
      : [...formData.events, event];
    setFormData({ ...formData, events });
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, secret_key: key });
  };

  // Get API base URL for external apps
  const getAPIBaseURL = () => {
    return process.env.REACT_APP_BACKEND_URL || window.location.origin;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* API Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.webhooks.apiInfo')}</CardTitle>
          <CardDescription>{t('settings.webhooks.apiInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-gray-600">{t('settings.webhooks.apiBaseUrl')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-sm">
                {getAPIBaseURL()}/api
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${getAPIBaseURL()}/api`)}
              >
                {t('common.copy')}
              </Button>
            </div>
          </div>
          
          {/* API Credentials Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-xs text-gray-600 font-semibold">
                  {t('settings.apiKeys.title')}
                </Label>
                <p className="text-xs text-gray-500">
                  {t('settings.apiKeys.description')}
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCreateAPIKey}
                disabled={createAPIKey.isPending}
              >
                <Key className="h-4 w-4 mr-2" />
                {createAPIKey.isPending ? t('common.loading') : t('settings.apiKeys.generate')}
              </Button>
            </div>
            
            {apiKeysLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded border border-dashed">
                <Key className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">{t('settings.apiKeys.noKeys')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('settings.apiKeys.noKeysHint')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="bg-white border rounded p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{apiKey.name}</span>
                          {apiKey.is_active ? (
                            <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-500">Username</Label>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                              {apiKey.api_username}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                copyToClipboard(apiKey.api_username);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-500">API Key</Label>
                          <code className="text-xs text-gray-400">••••••••••••••••••••</code>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('settings.apiKeys.keyHidden')}
                          </p>
                        </div>
                        
                        {apiKey.last_used_at && (
                          <p className="text-xs text-gray-500">
                            Last used: {new Date(apiKey.last_used_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1 ml-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateAPIKey(apiKey.id)}
                          disabled={regenerateAPIKey.isPending}
                          title={t('settings.apiKeys.regenerate')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAPIKey(apiKey.id)}
                          disabled={deleteAPIKey.isPending}
                          title={t('settings.apiKeys.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Alert className="mt-3">
              <AlertDescription className="text-xs">
                ⚠️ {t('settings.apiKeys.securityWarning')}
              </AlertDescription>
            </Alert>
          </div>
          
          <div>
            <Label className="text-xs text-gray-600">{t('settings.webhooks.authEndpoint')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-sm">
                POST {getAPIBaseURL()}/api/auth/login
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${getAPIBaseURL()}/api/auth/login`)}
              >
                {t('common.copy')}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">{t('settings.webhooks.membersEndpoint')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-sm">
                GET {getAPIBaseURL()}/api/members/
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${getAPIBaseURL()}/api/members/`)}
              >
                {t('common.copy')}
              </Button>
            </div>
          </div>
          
          {/* Example Usage */}
          <Alert>
            <AlertDescription className="text-xs space-y-2">
              <strong>{t('settings.webhooks.exampleUsage')}</strong>
              <pre className="mt-2 p-2 bg-gray-800 text-gray-100 rounded overflow-x-auto text-xs">
{`// Step 1: Authenticate
POST ${getAPIBaseURL()}/api/auth/login
Body: {
  "email": "api_user@${church?.name?.toLowerCase().replace(/\s+/g, '') || 'church'}.local",
  "password": "your-admin-password"
}
Response: { "access_token": "eyJ..." }

// Step 2: Fetch Members
GET ${getAPIBaseURL()}/api/members/?limit=100
Header: Authorization: Bearer YOUR_TOKEN`}
              </pre>
              <p className="mt-2">
                📖 {t('settings.webhooks.fullDocumentation')}: <code className="bg-gray-100 px-1 py-0.5 rounded">/app/docs/EXTERNAL_API.md</code>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('settings.webhooks.configurationsTitle')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('settings.webhooks.configurationsDesc')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.webhooks.addWebhook')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('settings.webhooks.createWebhook')}</DialogTitle>
              <DialogDescription>{t('settings.webhooks.createDescription')}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name">{t('settings.webhooks.name')} *</Label>
                <Input
                  id="webhook-name"
                  placeholder="External App Production"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">{t('settings.webhooks.url')} *</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://external-app.com/api/webhooks/members"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-secret">{t('settings.webhooks.secretKey')} *</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook-secret"
                    value={formData.secret_key}
                    onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                    required
                    minLength={16}
                  />
                  <Button type="button" variant="outline" onClick={generateSecretKey}>
                    {t('settings.webhooks.generate')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">{t('settings.webhooks.secretKeyHint')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.webhooks.events')} *</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="event-created"
                      checked={formData.events.includes('member.created')}
                      onChange={() => toggleEvent('member.created')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="event-created" className="cursor-pointer">
                      {t('settings.webhooks.eventCreated')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="event-updated"
                      checked={formData.events.includes('member.updated')}
                      onChange={() => toggleEvent('member.updated')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="event-updated" className="cursor-pointer">
                      {t('settings.webhooks.eventUpdated')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="event-deleted"
                      checked={formData.events.includes('member.deleted')}
                      onChange={() => toggleEvent('member.deleted')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="event-deleted" className="cursor-pointer">
                      {t('settings.webhooks.eventDeleted')}
                    </Label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retry-count">{t('settings.webhooks.retryCount')}</Label>
                  <Input
                    id="retry-count"
                    type="number"
                    min={0}
                    max={10}
                    value={formData.retry_count}
                    onChange={(e) => setFormData({ ...formData, retry_count: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout">{t('settings.webhooks.timeout')}</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={5}
                    max={120}
                    value={formData.timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="webhook-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="webhook-active">{t('settings.webhooks.active')}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createWebhook.isPending}>
                  {createWebhook.isPending ? t('common.loading') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          <AlertDescription>
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{testResult.message}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>{testResult.message}</span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.webhooks.list')}</CardTitle>
          <CardDescription>
            {t('settings.webhooks.total', { count: webhooks.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{t('settings.webhooks.loadError')}</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('settings.webhooks.noWebhooks')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.webhooks.name')}</TableHead>
                  <TableHead>{t('settings.webhooks.url')}</TableHead>
                  <TableHead>{t('settings.webhooks.events')}</TableHead>
                  <TableHead>{t('settings.webhooks.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="text-sm font-mono truncate max-w-xs">
                      {webhook.webhook_url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event.replace('member.', '')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {webhook.is_active ? (
                        <Badge variant="default" className="bg-green-600">
                          {t('settings.webhooks.active')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t('settings.webhooks.inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestWebhook(webhook.id)}
                          disabled={testWebhook.isPending}
                          title={t('settings.webhooks.testWebhook')}
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWebhook(webhook);
                            setIsLogsDialogOpen(true);
                          }}
                          title={t('settings.webhooks.viewLogs')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(webhook)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          disabled={deleteWebhook.isPending}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('settings.webhooks.editWebhook')}</DialogTitle>
            <DialogDescription>{t('settings.webhooks.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateWebhook} className="space-y-4">
            {/* Same form fields as create */}
            <div className="space-y-2">
              <Label>{t('settings.webhooks.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.webhooks.url')} *</Label>
              <Input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.webhooks.secretKey')} *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.secret_key}
                  onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                  required
                  minLength={16}
                />
                <Button type="button" variant="outline" onClick={generateSecretKey}>
                  {t('settings.webhooks.generate')}
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>{t('settings.webhooks.active')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateWebhook.isPending}>
                {updateWebhook.isPending ? t('common.loading') : t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      {selectedWebhook && (
        <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('settings.webhooks.deliveryLogs')}</DialogTitle>
              <DialogDescription>
                {selectedWebhook.name}
              </DialogDescription>
            </DialogHeader>
            <WebhookLogs webhookId={selectedWebhook.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Webhook Logs Component
function WebhookLogs({ webhookId }) {
  const { t } = useTranslation();
  const { data: logsData, isLoading } = useWebhookLogs(webhookId);
  const logs = logsData?.logs || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t('settings.webhooks.noLogs')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className={`border rounded-lg p-3 ${
            log.response_status && log.response_status >= 200 && log.response_status < 300
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{log.event_type}</Badge>
              {log.response_status && (
                <Badge
                  variant={log.response_status >= 200 && log.response_status < 300 ? 'default' : 'destructive'}
                >
                  {log.response_status}
                </Badge>
              )}
              {log.delivery_time_ms && (
                <span className="text-xs text-gray-600">{log.delivery_time_ms}ms</span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>
          {log.error_message && (
            <div className="text-sm text-red-600 mt-1">
              {log.error_message}
            </div>
          )}
          {log.retry_count > 0 && (
            <div className="text-xs text-gray-600 mt-1">
              {t('settings.webhooks.retries')}: {log.retry_count}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Hook imports needed
import { useWebhookLogs } from '../../hooks/useWebhooks';
