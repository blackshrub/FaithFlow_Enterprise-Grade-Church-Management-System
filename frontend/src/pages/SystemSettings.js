import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Check, Error } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function SystemSettings() {
  const [activeTab, setActiveTab] = useState(0);
  const [showKeys, setShowKeys] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  // Fetch system settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/system/settings`);
      return data;
    },
  });

  // Update system settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const { data } = await axios.put(`${API_URL}/api/system/settings`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systemSettings']);
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to save settings',
        severity: 'error',
      });
    },
  });

  // Test AI connection
  const testAIMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`${API_URL}/api/system/settings/test-ai-connection`);
      return data;
    },
    onSuccess: (data) => {
      setSnackbar({ open: true, message: data.message, severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'AI connection test failed',
        severity: 'error',
      });
    },
  });

  // Test Stability AI connection
  const testStabilityMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`${API_URL}/api/system/settings/test-stability-connection`);
      return data;
    },
    onSuccess: (data) => {
      setSnackbar({ open: true, message: data.message, severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Stability AI connection test failed',
        severity: 'error',
      });
    },
  });

  const handleSaveAI = (formData) => {
    updateMutation.mutate({
      ai_integration: {
        anthropic_api_key: formData.anthropic_api_key || undefined,
        anthropic_model: formData.anthropic_model,
        stability_api_key: formData.stability_api_key || undefined,
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Manage application-wide configuration, API keys, and integrations
      </Typography>

      <Card sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="AI Integration" />
          <Tab label="WhatsApp" />
          <Tab label="Payment Gateway" />
        </Tabs>

        <Divider />

        <CardContent>
          {activeTab === 0 && (
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
          )}

          {activeTab === 1 && (
            <WhatsAppIntegrationTab
              settings={settings?.whatsapp_integration || {}}
              onSave={handleSaveWhatsApp}
              showKeys={showKeys}
              setShowKeys={setShowKeys}
              isSaving={updateMutation.isPending}
            />
          )}

          {activeTab === 2 && (
            <PaymentIntegrationTab
              settings={settings?.payment_integration || {}}
              onSave={handleSavePayment}
              showKeys={showKeys}
              setShowKeys={setShowKeys}
              isSaving={updateMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function AIIntegrationTab({ settings, onSave, onTestAI, onTestStability, showKeys, setShowKeys, isSaving, isTesting }) {
  const [formData, setFormData] = useState({
    anthropic_api_key: settings.anthropic_api_key || '',
    anthropic_model: settings.anthropic_model || 'claude-3-5-sonnet-20241022',
    stability_api_key: settings.stability_api_key || '',
    ai_generation_enabled: settings.ai_generation_enabled ?? false,
    monthly_budget_usd: settings.monthly_budget_usd || 50.0,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          AI Integration for Explore Feature
        </Typography>
        <Typography variant="body2">
          Configure Anthropic Claude for AI-generated devotions, verses, and quizzes (~$0.01 per devotion).
          Configure Stability AI for AI-generated cover images (~$0.08 per image).
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.ai_generation_enabled}
                onChange={(e) => handleChange('ai_generation_enabled', e.target.checked)}
              />
            }
            label="Enable AI Content Generation"
          />
          <Typography variant="caption" display="block" color="textSecondary">
            Master switch for AI features (disable to save costs)
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Anthropic Claude API
          </Typography>
          <TextField
            fullWidth
            label="API Key"
            value={formData.anthropic_api_key}
            onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
            type={showKeys.anthropic ? 'text' : 'password'}
            placeholder="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            helperText="Get from https://console.anthropic.com/"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                    edge="end"
                  >
                    {showKeys.anthropic ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Claude Model"
            select
            SelectProps={{ native: true }}
            value={formData.anthropic_model}
            onChange={(e) => handleChange('anthropic_model', e.target.value)}
            helperText="Sonnet is recommended (balance of quality and cost)"
          >
            <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
            <option value="claude-3-opus-20240229">Claude 3 Opus (Highest quality, expensive)</option>
            <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest, cheapest)</option>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <Button variant="outlined" onClick={onTestAI} disabled={isTesting || !formData.anthropic_api_key}>
            {isTesting ? <CircularProgress size={20} /> : 'Test Connection'}
          </Button>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Stability AI (Image Generation)
          </Typography>
          <TextField
            fullWidth
            label="API Key"
            value={formData.stability_api_key}
            onChange={(e) => handleChange('stability_api_key', e.target.value)}
            type={showKeys.stability ? 'text' : 'password'}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            helperText="Get from https://platform.stability.ai/"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowKeys({ ...showKeys, stability: !showKeys.stability })}
                    edge="end"
                  >
                    {showKeys.stability ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Button variant="outlined" onClick={onTestStability} disabled={isTesting || !formData.stability_api_key}>
            {isTesting ? <CircularProgress size={20} /> : 'Test Connection'}
          </Button>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Monthly Budget (USD)"
            type="number"
            value={formData.monthly_budget_usd}
            onChange={(e) => handleChange('monthly_budget_usd', e.target.value)}
            helperText="AI generation stops when budget is reached"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} /> : 'Save AI Settings'}
          </Button>
        </Grid>
      </Grid>
    </Box>
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
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure WhatsApp API for OTP login and notifications
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.whatsapp_enabled}
                onChange={(e) => setFormData({ ...formData, whatsapp_enabled: e.target.checked })}
              />
            }
            label="Enable WhatsApp Integration"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="WhatsApp API URL"
            value={formData.whatsapp_api_url}
            onChange={(e) => setFormData({ ...formData, whatsapp_api_url: e.target.value })}
            placeholder="https://your-whatsapp-api.com"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="API Key"
            value={formData.whatsapp_api_key}
            onChange={(e) => setFormData({ ...formData, whatsapp_api_key: e.target.value })}
            type={showKeys.whatsapp ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowKeys({ ...showKeys, whatsapp: !showKeys.whatsapp })}
                    edge="end"
                  >
                    {showKeys.whatsapp ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="From Number"
            value={formData.whatsapp_from_number}
            onChange={(e) => setFormData({ ...formData, whatsapp_from_number: e.target.value })}
            placeholder="+6281234567890"
            helperText="WhatsApp sender number (include country code)"
          />
        </Grid>

        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} /> : 'Save WhatsApp Settings'}
          </Button>
        </Grid>
      </Grid>
    </Box>
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
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure iPaymu payment gateway for online giving and donations
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.ipaymu_enabled}
                onChange={(e) => setFormData({ ...formData, ipaymu_enabled: e.target.checked })}
              />
            }
            label="Enable iPaymu Integration"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Virtual Account Number"
            value={formData.ipaymu_va}
            onChange={(e) => setFormData({ ...formData, ipaymu_va: e.target.value })}
            placeholder="1179000899"
            helperText="Get from https://my.ipaymu.com"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Environment"
            select
            SelectProps={{ native: true }}
            value={formData.ipaymu_env}
            onChange={(e) => setFormData({ ...formData, ipaymu_env: e.target.value })}
          >
            <option value="sandbox">Sandbox (Testing)</option>
            <option value="production">Production (Live)</option>
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="API Key"
            value={formData.ipaymu_api_key}
            onChange={(e) => setFormData({ ...formData, ipaymu_api_key: e.target.value })}
            type={showKeys.ipaymu ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowKeys({ ...showKeys, ipaymu: !showKeys.ipaymu })}
                    edge="end"
                  >
                    {showKeys.ipaymu ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} /> : 'Save Payment Settings'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SystemSettings;
