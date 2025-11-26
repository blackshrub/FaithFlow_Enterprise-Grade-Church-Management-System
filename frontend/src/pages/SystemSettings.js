import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

function SystemSettings() {
  const [showKeys, setShowKeys] = useState({});
  const queryClient = useQueryClient();

  // Fetch system settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const { data } = await api.get('/system/settings');
      return data;
    },
  });

  // Update system settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const { data } = await api.put('/system/settings', updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systemSettings']);
      toast.success('Settings saved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    },
  });

  // Test AI connection
  const testAIMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/system/settings/test-ai-connection');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'AI connection test failed');
    },
  });

  // Test Stability AI connection
  const testStabilityMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/system/settings/test-stability-connection');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Stability AI connection test failed');
    },
  });

  const handleSaveAI = (formData) => {
    updateMutation.mutate({
      ai_integration: {
        anthropic_api_key: formData.anthropic_api_key || undefined,
        anthropic_model: formData.anthropic_model,
        stability_api_key: formData.stability_api_key || undefined,
        stability_model: formData.stability_model,
        ai_generation_enabled: formData.ai_generation_enabled,
        monthly_budget_usd: parseFloat(formData.monthly_budget_usd),
      },
    });
  };

  const handleSaveWhatsApp = (formData) => {
    updateMutation.mutate({
      whatsapp_integration: {
        whatsapp_api_url: formData.whatsapp_api_url || undefined,
        whatsapp_api_key: formData.whatsapp_api_key || undefined,
        whatsapp_from_number: formData.whatsapp_from_number || undefined,
        whatsapp_enabled: formData.whatsapp_enabled,
      },
    });
  };

  const handleSavePayment = (formData) => {
    updateMutation.mutate({
      payment_integration: {
        ipaymu_va: formData.ipaymu_va || undefined,
        ipaymu_api_key: formData.ipaymu_api_key || undefined,
        ipaymu_env: formData.ipaymu_env,
        ipaymu_enabled: formData.ipaymu_enabled,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage application-wide configuration, API keys, and integrations
        </p>
      </div>

      <Card>
        <Tabs defaultValue="ai">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai">AI Integration</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="payment">Payment Gateway</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="ai" className="mt-0">
              <AIIntegrationTab
                settings={settings?.ai_integration || {}}
                onSave={handleSaveAI}
                onTestAI={() => testAIMutation.mutate()}
                onTestStability={() => testStabilityMutation.mutate()}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
                isTesting={testAIMutation.isPending || testStabilityMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-0">
              <WhatsAppIntegrationTab
                settings={settings?.whatsapp_integration || {}}
                onSave={handleSaveWhatsApp}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="payment" className="mt-0">
              <PaymentIntegrationTab
                settings={settings?.payment_integration || {}}
                onSave={handleSavePayment}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function AIIntegrationTab({ settings, onSave, onTestAI, onTestStability, showKeys, setShowKeys, isSaving, isTesting }) {
  const [formData, setFormData] = useState({
    anthropic_api_key: settings.anthropic_api_key || '',
    anthropic_model: settings.anthropic_model || 'claude-sonnet-4-5-20250929',
    stability_api_key: settings.stability_api_key || '',
    stability_model: settings.stability_model || 'ultra',
    ai_generation_enabled: settings.ai_generation_enabled ?? false,
    monthly_budget_usd: settings.monthly_budget_usd || 50.0,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>AI Integration for Explore Feature</AlertTitle>
        <AlertDescription>
          Configure Anthropic Claude for AI-generated devotions, verses, and quizzes (~$0.01 per devotion).
          Configure Stability AI for AI-generated cover images (~$0.08 per image).
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-3">
        <Switch
          id="ai-enabled"
          checked={formData.ai_generation_enabled}
          onCheckedChange={(checked) => handleChange('ai_generation_enabled', checked)}
        />
        <div>
          <Label htmlFor="ai-enabled">Enable AI Content Generation</Label>
          <p className="text-sm text-muted-foreground">Master switch for AI features (disable to save costs)</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Anthropic Claude API</h3>

        <div className="space-y-2">
          <Label htmlFor="anthropic-key">API Key</Label>
          <div className="relative">
            <Input
              id="anthropic-key"
              value={formData.anthropic_api_key}
              onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
              type={showKeys.anthropic ? 'text' : 'password'}
              placeholder="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
            >
              {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Get from <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://console.anthropic.com/</a>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="claude-model">Claude Model</Label>
            <Select
              value={formData.anthropic_model}
              onValueChange={(value) => handleChange('anthropic_model', value)}
            >
              <SelectTrigger id="claude-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Recommended - Best balance)</SelectItem>
                <SelectItem value="claude-opus-4-5-20251101">Claude Opus 4.5 (Highest quality, most expensive)</SelectItem>
                <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Great quality/cost)</SelectItem>
                <SelectItem value="claude-opus-4-20250514">Claude Opus 4 (High quality)</SelectItem>
                <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Legacy)</SelectItem>
                <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast, cheapest)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Sonnet 4.5 recommended for best quality/cost balance</p>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={onTestAI} disabled={isTesting || !formData.anthropic_api_key}>
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Connection
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Stability AI (Image Generation)</h3>

        <div className="space-y-2">
          <Label htmlFor="stability-key">API Key</Label>
          <div className="relative">
            <Input
              id="stability-key"
              value={formData.stability_api_key}
              onChange={(e) => handleChange('stability_api_key', e.target.value)}
              type={showKeys.stability ? 'text' : 'password'}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKeys({ ...showKeys, stability: !showKeys.stability })}
            >
              {showKeys.stability ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Get from <a href="https://platform.stability.ai/" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://platform.stability.ai/</a>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stability-model">Image Model</Label>
            <Select
              value={formData.stability_model}
              onValueChange={(value) => handleChange('stability_model', value)}
            >
              <SelectTrigger id="stability-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultra">Stable Image Ultra (Best quality, ~$0.08/image)</SelectItem>
                <SelectItem value="core">Stable Image Core (Balanced, ~$0.03/image)</SelectItem>
                <SelectItem value="sd3-large">SD3 Large (High quality, ~$0.065/image)</SelectItem>
                <SelectItem value="sd3-medium">SD3 Medium (Fast, ~$0.035/image)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Ultra recommended for best devotional images</p>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={onTestStability} disabled={isTesting || !formData.stability_api_key}>
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Connection
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="monthly-budget">Monthly Budget (USD)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="monthly-budget"
              type="number"
              value={formData.monthly_budget_usd}
              onChange={(e) => handleChange('monthly_budget_usd', e.target.value)}
              className="pl-7"
            />
          </div>
          <p className="text-sm text-muted-foreground">AI generation stops when budget is reached</p>
        </div>
      </div>

      <Button onClick={() => onSave(formData)} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save AI Settings
      </Button>
    </div>
  );
}

function WhatsAppIntegrationTab({ settings, onSave, showKeys, setShowKeys, isSaving }) {
  const [formData, setFormData] = useState({
    whatsapp_api_url: settings.whatsapp_api_url || '',
    whatsapp_api_key: settings.whatsapp_api_key || '',
    whatsapp_from_number: settings.whatsapp_from_number || '',
    whatsapp_enabled: settings.whatsapp_enabled ?? true,
  });

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Configure WhatsApp API for OTP login and notifications
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-3">
        <Switch
          id="whatsapp-enabled"
          checked={formData.whatsapp_enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_enabled: checked })}
        />
        <Label htmlFor="whatsapp-enabled">Enable WhatsApp Integration</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-url">WhatsApp API URL</Label>
        <Input
          id="whatsapp-url"
          value={formData.whatsapp_api_url}
          onChange={(e) => setFormData({ ...formData, whatsapp_api_url: e.target.value })}
          placeholder="https://your-whatsapp-api.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-key">API Key</Label>
        <div className="relative">
          <Input
            id="whatsapp-key"
            value={formData.whatsapp_api_key}
            onChange={(e) => setFormData({ ...formData, whatsapp_api_key: e.target.value })}
            type={showKeys.whatsapp ? 'text' : 'password'}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowKeys({ ...showKeys, whatsapp: !showKeys.whatsapp })}
          >
            {showKeys.whatsapp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="whatsapp-from">From Number</Label>
        <Input
          id="whatsapp-from"
          value={formData.whatsapp_from_number}
          onChange={(e) => setFormData({ ...formData, whatsapp_from_number: e.target.value })}
          placeholder="+6281234567890"
        />
        <p className="text-sm text-muted-foreground">WhatsApp sender number (include country code)</p>
      </div>

      <Button onClick={() => onSave(formData)} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save WhatsApp Settings
      </Button>
    </div>
  );
}

function PaymentIntegrationTab({ settings, onSave, showKeys, setShowKeys, isSaving }) {
  const [formData, setFormData] = useState({
    ipaymu_va: settings.ipaymu_va || '',
    ipaymu_api_key: settings.ipaymu_api_key || '',
    ipaymu_env: settings.ipaymu_env || 'sandbox',
    ipaymu_enabled: settings.ipaymu_enabled ?? true,
  });

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Configure iPaymu payment gateway for online giving and donations
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-3">
        <Switch
          id="ipaymu-enabled"
          checked={formData.ipaymu_enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, ipaymu_enabled: checked })}
        />
        <Label htmlFor="ipaymu-enabled">Enable iPaymu Integration</Label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ipaymu-va">Virtual Account Number</Label>
          <Input
            id="ipaymu-va"
            value={formData.ipaymu_va}
            onChange={(e) => setFormData({ ...formData, ipaymu_va: e.target.value })}
            placeholder="1179000899"
          />
          <p className="text-sm text-muted-foreground">
            Get from <a href="https://my.ipaymu.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://my.ipaymu.com</a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ipaymu-env">Environment</Label>
          <Select
            value={formData.ipaymu_env}
            onValueChange={(value) => setFormData({ ...formData, ipaymu_env: value })}
          >
            <SelectTrigger id="ipaymu-env">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
              <SelectItem value="production">Production (Live)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ipaymu-key">API Key</Label>
        <div className="relative">
          <Input
            id="ipaymu-key"
            value={formData.ipaymu_api_key}
            onChange={(e) => setFormData({ ...formData, ipaymu_api_key: e.target.value })}
            type={showKeys.ipaymu ? 'text' : 'password'}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowKeys({ ...showKeys, ipaymu: !showKeys.ipaymu })}
          >
            {showKeys.ipaymu ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Button onClick={() => onSave(formData)} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Payment Settings
      </Button>
    </div>
  );
}

export default SystemSettings;
