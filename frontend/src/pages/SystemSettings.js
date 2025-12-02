import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
import WebhooksTab from '../components/Settings/WebhooksTab';

// Helper to detect masked API keys (e.g., "...xxxx")
const isMaskedValue = (value) => {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('...');
};

// Helper to get display value for API key fields
// Returns empty string for masked values so user can type a new key
const getApiKeyDisplayValue = (value) => {
  if (isMaskedValue(value)) return '';
  return value || '';
};

// Helper to determine if API key should be sent in update
// Only send if user entered a new value (not masked, not empty)
const shouldSendApiKey = (formValue, originalValue) => {
  // If form is empty and original was masked, user wants to keep existing key
  if (!formValue && isMaskedValue(originalValue)) return false;
  // If form has a value that's not the masked value, send it
  if (formValue && !isMaskedValue(formValue)) return true;
  // If form is empty and original wasn't set, send undefined
  return false;
};

function SystemSettings() {
  const { t } = useTranslation();
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

  // Test AI connection (accepts api_key for testing before save)
  const testAIMutation = useMutation({
    mutationFn: async ({ api_key, model } = {}) => {
      const { data } = await api.post('/system/settings/test-ai-connection', { api_key, model });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'AI connection test failed');
    },
  });

  // Test Stability AI connection (accepts api_key for testing before save)
  const testStabilityMutation = useMutation({
    mutationFn: async ({ api_key } = {}) => {
      const { data } = await api.post('/system/settings/test-stability-connection', { api_key });
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

  const handleSaveFaithAssistant = (formData) => {
    updateMutation.mutate({
      faith_assistant: {
        api_key: formData.api_key || undefined,
        model: formData.model,
        enabled: formData.enabled,
        max_tokens: parseInt(formData.max_tokens, 10),
      },
    });
  };

  // Test Faith Assistant connection (uses form values directly, no save required)
  const testFaithAssistantMutation = useMutation({
    mutationFn: async ({ api_key, model }) => {
      const { data } = await api.post('/system/settings/test-faith-assistant', {
        api_key,
        model,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Faith Assistant connection test failed');
    },
  });

  // Test Voice connections (individual tests)
  const testGoogleTtsMutation = useMutation({
    mutationFn: async ({ api_key } = {}) => {
      const { data } = await api.post('/system/settings/test-google-tts', { api_key });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Google TTS connection test failed');
    },
  });

  const testGroqMutation = useMutation({
    mutationFn: async ({ api_key } = {}) => {
      const { data } = await api.post('/system/settings/test-groq', { api_key });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Groq API connection test failed');
    },
  });

  const testVoiceMutation = useMutation({
    mutationFn: async ({ api_key } = {}) => {
      const { data } = await api.post('/system/settings/test-voice-connection', { api_key });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'OpenAI Voice API connection test failed');
    },
  });

  // Test iPaymu payment connection
  const testPaymentMutation = useMutation({
    mutationFn: async ({ va, api_key, env } = {}) => {
      const { data } = await api.post('/system/settings/test-ipaymu', { va, api_key, env });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'iPaymu connection test failed');
    },
  });

  const handleSaveVoice = (formData) => {
    updateMutation.mutate({
      voice_integration: {
        openai_api_key: formData.openai_api_key || undefined,
        groq_api_key: formData.groq_api_key || undefined,
        stt_provider: formData.stt_provider,
        tts_voice: formData.tts_voice,
        tts_model: formData.tts_model,
        tts_speed: parseFloat(formData.tts_speed),
        stt_model: formData.stt_model,
        voice_enabled: formData.voice_enabled,
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
        <h1 className="text-3xl font-bold tracking-tight">{t('integrations.title') || 'Integrations'}</h1>
        <p className="text-muted-foreground mt-1">
          {t('integrations.subtitle') || 'Manage third-party integrations, API keys, and webhooks'}
        </p>
      </div>

      <Card>
        <Tabs defaultValue="faith-assistant">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="faith-assistant">{t('integrations.faithAssistant') || 'Faith Assistant'}</TabsTrigger>
              <TabsTrigger value="voice">{t('integrations.voice') || 'Voice (TTS/STT)'}</TabsTrigger>
              <TabsTrigger value="ai">{t('integrations.exploreAI') || 'Explore AI'}</TabsTrigger>
              <TabsTrigger value="whatsapp">{t('integrations.whatsapp') || 'WhatsApp'}</TabsTrigger>
              <TabsTrigger value="payment">{t('integrations.payment') || 'Payment'}</TabsTrigger>
              <TabsTrigger value="webhooks">{t('integrations.webhooks') || 'Webhooks'}</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="faith-assistant" className="mt-0">
              <FaithAssistantTab
                settings={settings?.faith_assistant || {}}
                onSave={handleSaveFaithAssistant}
                onTest={(formData) => testFaithAssistantMutation.mutate(formData)}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
                isTesting={testFaithAssistantMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="voice" className="mt-0">
              <VoiceIntegrationTab
                settings={settings?.voice_integration || {}}
                onSave={handleSaveVoice}
                onTestGoogleTts={(params) => testGoogleTtsMutation.mutate(params)}
                onTestGroq={(params) => testGroqMutation.mutate(params)}
                onTestOpenAI={(params) => testVoiceMutation.mutate(params)}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
                isTestingGoogleTts={testGoogleTtsMutation.isPending}
                isTestingGroq={testGroqMutation.isPending}
                isTestingOpenAI={testVoiceMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <AIIntegrationTab
                settings={settings?.ai_integration || {}}
                onSave={handleSaveAI}
                onTestAI={(params) => testAIMutation.mutate(params)}
                onTestStability={(params) => testStabilityMutation.mutate(params)}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
                isTestingAI={testAIMutation.isPending}
                isTestingStability={testStabilityMutation.isPending}
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
                onTest={(params) => testPaymentMutation.mutate(params)}
                showKeys={showKeys}
                setShowKeys={setShowKeys}
                isSaving={updateMutation.isPending}
                isTesting={testPaymentMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="webhooks" className="mt-0">
              <WebhooksTab />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function FaithAssistantTab({ settings, onSave, onTest, showKeys, setShowKeys, isSaving, isTesting }) {
  // Track if API key was already set (masked from backend)
  const hasExistingKey = isMaskedValue(settings.api_key);

  const [formData, setFormData] = useState({
    api_key: getApiKeyDisplayValue(settings.api_key),
    model: settings.model || 'claude-sonnet-4-20250514',
    enabled: settings.enabled ?? true,
    max_tokens: settings.max_tokens || 2048,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Custom save handler that only sends API key if changed
  const handleSave = () => {
    const updates = {
      model: formData.model,
      enabled: formData.enabled,
      max_tokens: parseInt(formData.max_tokens, 10),
    };
    // Only include api_key if user entered a new value
    if (shouldSendApiKey(formData.api_key, settings.api_key)) {
      updates.api_key = formData.api_key;
    }
    onSave(updates);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>Faith Assistant (Pendamping Iman)</AlertTitle>
        <AlertDescription>
          Powers the mobile app's spiritual companion chat feature. Members can ask questions about faith,
          get biblical guidance, request prayers, and have theological conversations.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-3">
        <Switch
          id="faith-assistant-enabled"
          checked={formData.enabled}
          onCheckedChange={(checked) => handleChange('enabled', checked)}
        />
        <div>
          <Label htmlFor="faith-assistant-enabled">Enable Faith Assistant</Label>
          <p className="text-sm text-muted-foreground">Toggle to enable/disable the chat feature in mobile app</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Anthropic Claude API</h3>

        <div className="space-y-2">
          <Label htmlFor="faith-assistant-key">API Key</Label>
          <div className="relative">
            <Input
              id="faith-assistant-key"
              value={formData.api_key}
              onChange={(e) => handleChange('api_key', e.target.value)}
              type={showKeys.faithAssistant ? 'text' : 'password'}
              placeholder={hasExistingKey ? "API key is set (leave empty to keep)" : "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKeys({ ...showKeys, faithAssistant: !showKeys.faithAssistant })}
            >
              {showKeys.faithAssistant ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasExistingKey && !formData.api_key && (
            <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key, or enter new key to update.</p>
          )}
          <p className="text-sm text-muted-foreground">
            Get from <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://console.anthropic.com/</a>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="faith-assistant-model">Claude Model</Label>
            <Select
              value={formData.model}
              onValueChange={(value) => handleChange('model', value)}
            >
              <SelectTrigger id="faith-assistant-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended - Best for chat)</SelectItem>
                <SelectItem value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Newest, higher quality)</SelectItem>
                <SelectItem value="claude-opus-4-20250514">Claude Opus 4 (Highest quality, expensive)</SelectItem>
                <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast, cheapest)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Sonnet 4 recommended for conversational quality/cost balance</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="faith-assistant-tokens">Max Response Tokens</Label>
            <Select
              value={String(formData.max_tokens)}
              onValueChange={(value) => handleChange('max_tokens', value)}
            >
              <SelectTrigger id="faith-assistant-tokens">
                <SelectValue placeholder="Select max tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024">1024 (Short responses)</SelectItem>
                <SelectItem value="2048">2048 (Balanced - Recommended)</SelectItem>
                <SelectItem value="4096">4096 (Detailed responses)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Longer responses cost more</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => onTest({
              // If user entered new key, use it; otherwise test with saved key (send undefined to use saved)
              api_key: formData.api_key || undefined,
              model: formData.model
            })}
            disabled={isTesting || (!formData.api_key && !hasExistingKey)}
          >
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Connection
          </Button>
          {hasExistingKey && !formData.api_key && (
            <span className="text-sm text-muted-foreground">Testing with saved API key</span>
          )}
        </div>
      </div>

      <Separator />

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Cost Estimate</h4>
        <p className="text-sm text-muted-foreground">
          Using Claude Sonnet 4, approximately <strong>$0.003 per message</strong> exchange.
          For a church with 100 active users sending 10 messages/day = ~$0.90/day or ~$27/month.
        </p>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Faith Assistant Settings
      </Button>
    </div>
  );
}

function VoiceIntegrationTab({ settings, onSave, onTestGoogleTts, onTestGroq, onTestOpenAI, showKeys, setShowKeys, isSaving, isTestingGoogleTts, isTestingGroq, isTestingOpenAI }) {
  // Track which API keys are already set
  const hasGoogleTtsKey = isMaskedValue(settings.google_tts_api_key);
  const hasOpenAIKey = isMaskedValue(settings.openai_api_key);
  const hasGroqKey = isMaskedValue(settings.groq_api_key);

  const [formData, setFormData] = useState({
    google_tts_api_key: getApiKeyDisplayValue(settings.google_tts_api_key),
    openai_api_key: getApiKeyDisplayValue(settings.openai_api_key),
    groq_api_key: getApiKeyDisplayValue(settings.groq_api_key),
    stt_provider: settings.stt_provider || 'groq',
    tts_voice: settings.tts_voice || 'id-ID-Chirp3-HD-Sulafat',
    tts_voice_en: settings.tts_voice_en || 'en-US-Chirp-HD-F',
    tts_speed: settings.tts_speed || 1.0,
    tts_pitch: settings.tts_pitch || 0.0,
    stt_model: settings.stt_model || 'whisper-1',
    voice_enabled: settings.voice_enabled ?? true,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Custom save handler that only sends API keys if changed
  const handleSave = () => {
    const updates = {
      stt_provider: formData.stt_provider,
      tts_voice: formData.tts_voice,
      tts_voice_en: formData.tts_voice_en,
      tts_speed: parseFloat(formData.tts_speed),
      tts_pitch: parseFloat(formData.tts_pitch),
      stt_model: formData.stt_model,
      voice_enabled: formData.voice_enabled,
    };
    // Only include API keys if user entered new values
    if (shouldSendApiKey(formData.google_tts_api_key, settings.google_tts_api_key)) {
      updates.google_tts_api_key = formData.google_tts_api_key;
    }
    if (shouldSendApiKey(formData.openai_api_key, settings.openai_api_key)) {
      updates.openai_api_key = formData.openai_api_key;
    }
    if (shouldSendApiKey(formData.groq_api_key, settings.groq_api_key)) {
      updates.groq_api_key = formData.groq_api_key;
    }
    onSave(updates);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>Voice Features (Text-to-Speech & Speech-to-Text)</AlertTitle>
        <AlertDescription>
          Configure Google Cloud TTS for text-to-speech, and Groq/OpenAI for speech-to-text in the mobile app. This powers:
          listen-to-devotion buttons, voice input for Faith Assistant chat, and voice chat mode.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-3">
        <Switch
          id="voice-enabled"
          checked={formData.voice_enabled}
          onCheckedChange={(checked) => handleChange('voice_enabled', checked)}
        />
        <div>
          <Label htmlFor="voice-enabled">Enable Voice Features</Label>
          <p className="text-sm text-muted-foreground">Toggle to enable/disable all voice features in mobile app</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Google Cloud TTS (Text-to-Speech)</h3>
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            <strong>Google Cloud TTS</strong> provides high-quality WaveNet voices for natural-sounding speech in Indonesian and English.
            Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Cloud Console</a>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="google-tts-key">Google TTS API Key</Label>
          <div className="relative">
            <Input
              id="google-tts-key"
              value={formData.google_tts_api_key}
              onChange={(e) => handleChange('google_tts_api_key', e.target.value)}
              type={showKeys.googleTts ? 'text' : 'password'}
              placeholder={hasGoogleTtsKey ? "API key is set (leave empty to keep)" : "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKeys({ ...showKeys, googleTts: !showKeys.googleTts })}
            >
              {showKeys.googleTts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasGoogleTtsKey && !formData.google_tts_api_key && (
            <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTestGoogleTts({ api_key: formData.google_tts_api_key || undefined })}
              disabled={isTestingGoogleTts || (!formData.google_tts_api_key && !hasGoogleTtsKey)}
            >
              {isTestingGoogleTts ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Test TTS
            </Button>
            <p className="text-sm text-muted-foreground">
              Get from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Cloud Console</a>
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Speech-to-Text (STT)</h3>

        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            <strong>Recommended:</strong> Groq Whisper is ~10x faster than OpenAI (0.3s vs 2-4s latency) with the same accuracy.
            Free tier available at <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">console.groq.com</a>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="groq-key">Groq API Key</Label>
          <div className="relative">
            <Input
              id="groq-key"
              value={formData.groq_api_key}
              onChange={(e) => handleChange('groq_api_key', e.target.value)}
              type={showKeys.groq ? 'text' : 'password'}
              placeholder={hasGroqKey ? "API key is set (leave empty to keep)" : "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKeys({ ...showKeys, groq: !showKeys.groq })}
            >
              {showKeys.groq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasGroqKey && !formData.groq_api_key && (
            <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTestGroq({ api_key: formData.groq_api_key || undefined })}
              disabled={isTestingGroq || (!formData.groq_api_key && !hasGroqKey)}
            >
              {isTestingGroq ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Test Groq
            </Button>
            <p className="text-sm text-muted-foreground">
              Get free key from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://console.groq.com/keys</a>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-key">OpenAI API Key (STT Fallback)</Label>
          <div className="relative">
            <Input
              id="openai-key"
              value={formData.openai_api_key}
              onChange={(e) => handleChange('openai_api_key', e.target.value)}
              type={showKeys.openai ? 'text' : 'password'}
              placeholder={hasOpenAIKey ? "API key is set (leave empty to keep)" : "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
            >
              {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasOpenAIKey && !formData.openai_api_key && (
            <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTestOpenAI({ api_key: formData.openai_api_key || undefined })}
              disabled={isTestingOpenAI || (!formData.openai_api_key && !hasOpenAIKey)}
            >
              {isTestingOpenAI ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Test OpenAI
            </Button>
            <p className="text-sm text-muted-foreground">
              Optional fallback. Get from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://platform.openai.com/api-keys</a>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stt-provider">STT Provider</Label>
          <Select
            value={formData.stt_provider}
            onValueChange={(value) => handleChange('stt_provider', value)}
          >
            <SelectTrigger id="stt-provider">
              <SelectValue placeholder="Select STT provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groq">Groq Whisper (Faster, ~0.3s latency)</SelectItem>
              <SelectItem value="openai">OpenAI Whisper (Fallback, ~2-4s latency)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Groq recommended for better user experience. Falls back to OpenAI if Groq key not set.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Google TTS Voice Settings</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tts-voice">Indonesian Voice</Label>
            <Select
              value={formData.tts_voice}
              onValueChange={(value) => handleChange('tts_voice', value)}
            >
              <SelectTrigger id="tts-voice">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id-ID-Chirp3-HD-Sulafat">✨ Sulafat (Male) - Recommended</SelectItem>
                <SelectItem value="id-ID-Chirp3-HD-Aoede">✨ Aoede (Female)</SelectItem>
                <SelectItem value="id-ID-Chirp3-HD-Puck">✨ Puck (Male)</SelectItem>
                <SelectItem value="id-ID-Chirp3-HD-Kore">✨ Kore (Female)</SelectItem>
                <SelectItem value="id-ID-Chirp3-HD-Charon">✨ Charon (Male)</SelectItem>
                <SelectItem value="id-ID-Chirp3-HD-Fenrir">✨ Fenrir (Male)</SelectItem>
                <SelectItem value="id-ID-Wavenet-A">Sari (Female) - Legacy</SelectItem>
                <SelectItem value="id-ID-Wavenet-B">Dewi (Female) - Legacy</SelectItem>
                <SelectItem value="id-ID-Wavenet-C">Budi (Male) - Legacy</SelectItem>
                <SelectItem value="id-ID-Wavenet-D">Putri (Female) - Legacy</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">✨ = Chirp3-HD (latest, most natural)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tts-voice-en">English Voice</Label>
            <Select
              value={formData.tts_voice_en}
              onValueChange={(value) => handleChange('tts_voice_en', value)}
            >
              <SelectTrigger id="tts-voice-en">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US-Chirp-HD-F">✨ Chirp F (Female) - Recommended</SelectItem>
                <SelectItem value="en-US-Chirp-HD-D">✨ Chirp D (Male)</SelectItem>
                <SelectItem value="en-US-Chirp-HD-O">✨ Chirp O (Female)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Despina">Despina (Female)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Aoede">Aoede (Female)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Puck">Puck (Male)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Charon">Charon (Male)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Kore">Kore (Female)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Fenrir">Fenrir (Male)</SelectItem>
                <SelectItem value="en-US-Chirp3-HD-Leda">Leda (Female)</SelectItem>
                <SelectItem value="en-US-Wavenet-C">Clara (Female) - Legacy</SelectItem>
                <SelectItem value="en-US-Wavenet-F">Faith (Female) - Legacy</SelectItem>
                <SelectItem value="en-US-Wavenet-D">David (Male) - Legacy</SelectItem>
                <SelectItem value="en-US-Wavenet-J">James (Male) - Legacy</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">✨ = Chirp-HD (recommended, most natural)</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="tts-speed">Speech Speed: {formData.tts_speed}x</Label>
            <input
              id="tts-speed"
              type="range"
              min="0.25"
              max="4.0"
              step="0.1"
              value={formData.tts_speed}
              onChange={(e) => handleChange('tts_speed', parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">0.25x (slow) to 4.0x (fast), 1.0x is normal</p>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="tts-pitch">Pitch: {formData.tts_pitch > 0 ? '+' : ''}{formData.tts_pitch} semitones</Label>
            <input
              id="tts-pitch"
              type="range"
              min="-20"
              max="20"
              step="1"
              value={formData.tts_pitch}
              onChange={(e) => handleChange('tts_pitch', parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">-20 (lower) to +20 (higher), 0 is normal</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Cost Estimate</h4>
        <p className="text-sm text-muted-foreground">
          <strong>TTS (Google WaveNet):</strong> ~$0.016 per 1 million characters. A typical devotion (~1,500 chars) costs ~$0.00002.<br/>
          <strong>STT (Groq):</strong> Free tier with generous limits, or $0.111/hr for audio. <span className="text-green-600 font-medium">10x faster than OpenAI!</span><br/>
          <strong>STT (OpenAI):</strong> ~$0.006 per minute (fallback option).<br/>
          Google TTS is significantly cheaper than OpenAI TTS while providing excellent quality WaveNet voices.
        </p>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Voice Settings
      </Button>
    </div>
  );
}

function AIIntegrationTab({ settings, onSave, onTestAI, onTestStability, showKeys, setShowKeys, isSaving, isTestingAI, isTestingStability }) {
  // Track which API keys are already set
  const hasAnthropicKey = isMaskedValue(settings.anthropic_api_key);
  const hasStabilityKey = isMaskedValue(settings.stability_api_key);

  const [formData, setFormData] = useState({
    anthropic_api_key: getApiKeyDisplayValue(settings.anthropic_api_key),
    anthropic_model: settings.anthropic_model || 'claude-sonnet-4-5-20250929',
    stability_api_key: getApiKeyDisplayValue(settings.stability_api_key),
    stability_model: settings.stability_model || 'ultra',
    ai_generation_enabled: settings.ai_generation_enabled ?? false,
    monthly_budget_usd: settings.monthly_budget_usd || 50.0,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Custom save handler that only sends API keys if changed
  const handleSave = () => {
    const updates = {
      anthropic_model: formData.anthropic_model,
      stability_model: formData.stability_model,
      ai_generation_enabled: formData.ai_generation_enabled,
      monthly_budget_usd: parseFloat(formData.monthly_budget_usd),
    };
    // Only include API keys if user entered new values
    if (shouldSendApiKey(formData.anthropic_api_key, settings.anthropic_api_key)) {
      updates.anthropic_api_key = formData.anthropic_api_key;
    }
    if (shouldSendApiKey(formData.stability_api_key, settings.stability_api_key)) {
      updates.stability_api_key = formData.stability_api_key;
    }
    onSave(updates);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>Explore Content AI Generation</AlertTitle>
        <AlertDescription>
          Configure AI for auto-generating devotions, verses, Bible figures, and quizzes.
          Uses Anthropic Claude for text (~$0.01 per item) and Stability AI for cover images (~$0.08 per image).
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
              placeholder={hasAnthropicKey ? "API key is set (leave empty to keep)" : "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
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
          {hasAnthropicKey && !formData.anthropic_api_key && (
            <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
          )}
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

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => onTestAI({ api_key: formData.anthropic_api_key || undefined, model: formData.anthropic_model })}
              disabled={isTestingAI || (!formData.anthropic_api_key && !hasAnthropicKey)}
            >
              {isTestingAI ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Claude
            </Button>
            {hasAnthropicKey && !formData.anthropic_api_key && (
              <span className="text-xs text-muted-foreground">Using saved key</span>
            )}
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
              placeholder={hasStabilityKey ? "API key is set (leave empty to keep)" : "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
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
          {hasStabilityKey && !formData.stability_api_key && (
            <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
          )}
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

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => onTestStability({ api_key: formData.stability_api_key || undefined })}
              disabled={isTestingStability || (!formData.stability_api_key && !hasStabilityKey)}
            >
              {isTestingStability ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Stability
            </Button>
            {hasStabilityKey && !formData.stability_api_key && (
              <span className="text-xs text-muted-foreground">Using saved key</span>
            )}
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

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save AI Settings
      </Button>
    </div>
  );
}

function WhatsAppIntegrationTab({ settings, onSave, showKeys, setShowKeys, isSaving }) {
  // Track if API key is already set
  const hasApiKey = isMaskedValue(settings.whatsapp_api_key);

  const [formData, setFormData] = useState({
    whatsapp_api_url: settings.whatsapp_api_url || '',
    whatsapp_api_key: getApiKeyDisplayValue(settings.whatsapp_api_key),
    whatsapp_from_number: settings.whatsapp_from_number || '',
    whatsapp_enabled: settings.whatsapp_enabled ?? true,
  });

  // Custom save handler that only sends API key if changed
  const handleSave = () => {
    const updates = {
      whatsapp_api_url: formData.whatsapp_api_url || undefined,
      whatsapp_from_number: formData.whatsapp_from_number || undefined,
      whatsapp_enabled: formData.whatsapp_enabled,
    };
    if (shouldSendApiKey(formData.whatsapp_api_key, settings.whatsapp_api_key)) {
      updates.whatsapp_api_key = formData.whatsapp_api_key;
    }
    onSave(updates);
  };

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
            placeholder={hasApiKey ? "API key is set (leave empty to keep)" : "Enter your WhatsApp API key"}
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
        {hasApiKey && !formData.whatsapp_api_key && (
          <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
        )}
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

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save WhatsApp Settings
      </Button>
    </div>
  );
}

function PaymentIntegrationTab({ settings, onSave, onTest, showKeys, setShowKeys, isSaving, isTesting }) {
  // Track if API key is already set
  const hasApiKey = isMaskedValue(settings.ipaymu_api_key);

  const [formData, setFormData] = useState({
    ipaymu_va: settings.ipaymu_va || '',
    ipaymu_api_key: getApiKeyDisplayValue(settings.ipaymu_api_key),
    ipaymu_env: settings.ipaymu_env || 'sandbox',
    ipaymu_enabled: settings.ipaymu_enabled ?? true,
  });

  // Custom save handler that only sends API key if changed
  const handleSave = () => {
    const updates = {
      ipaymu_va: formData.ipaymu_va || undefined,
      ipaymu_env: formData.ipaymu_env,
      ipaymu_enabled: formData.ipaymu_enabled,
    };
    if (shouldSendApiKey(formData.ipaymu_api_key, settings.ipaymu_api_key)) {
      updates.ipaymu_api_key = formData.ipaymu_api_key;
    }
    onSave(updates);
  };

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
            placeholder={hasApiKey ? "API key is set (leave empty to keep)" : "Enter your iPaymu API key"}
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
        {hasApiKey && !formData.ipaymu_api_key && (
          <p className="text-sm text-green-600">✓ API key is configured. Leave empty to keep existing key.</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => onTest({
            va: formData.ipaymu_va || undefined,
            api_key: formData.ipaymu_api_key || undefined,
            env: formData.ipaymu_env,
          })}
          disabled={isTesting || (!formData.ipaymu_va && !formData.ipaymu_api_key && !hasApiKey)}
        >
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Test Connection
        </Button>
        {hasApiKey && !formData.ipaymu_api_key && (
          <span className="text-sm text-muted-foreground">Testing with saved credentials</span>
        )}
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Payment Settings
      </Button>
    </div>
  );
}

export default SystemSettings;
