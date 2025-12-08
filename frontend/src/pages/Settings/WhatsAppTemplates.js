/**
 * WhatsApp Templates Settings Page
 *
 * Admin page for customizing WhatsApp confirmation messages
 * sent to requesters after submitting member care forms.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Upload,
  Trash2,
  RotateCcw,
  Eye,
  Save,
  Loader2,
  Image,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { toast } from 'sonner';
import whatsappTemplatesApi from '../../services/whatsappTemplatesApi';

// Template type metadata
const TEMPLATE_TYPES = [
  {
    id: 'accept_jesus_confirmation',
    label: 'Accept Jesus',
    labelId: 'Terima Yesus',
    icon: '🙏',
    description: 'Sent after someone commits to follow Jesus',
    placeholders: ['name', 'phone', 'church_name', 'commitment_type'],
  },
  {
    id: 'baptism_confirmation',
    label: 'Baptism',
    labelId: 'Baptisan',
    icon: '💧',
    description: 'Sent after baptism registration',
    placeholders: ['name', 'phone', 'church_name', 'preferred_date'],
  },
  {
    id: 'child_dedication_confirmation',
    label: 'Child Dedication',
    labelId: 'Penyerahan Anak',
    icon: '👶',
    description: 'Sent to both parents after child dedication registration',
    placeholders: ['name', 'child_name', 'child_gender', 'father_name', 'mother_name', 'church_name'],
  },
  {
    id: 'holy_matrimony_confirmation',
    label: 'Holy Matrimony',
    labelId: 'Pernikahan',
    icon: '💒',
    description: 'Sent to both partners after wedding registration',
    placeholders: ['name', 'partner_name', 'both_baptized', 'planned_date', 'church_name'],
  },
];

// Placeholder chip component
const PlaceholderChip = ({ name, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(`{{${name}}}`)}
    className="inline-flex items-center px-2 py-1 text-xs font-mono bg-blue-100 text-blue-700
               rounded hover:bg-blue-200 transition-colors cursor-pointer"
  >
    {`{{${name}}}`}
  </button>
);

// Template editor component
const TemplateEditor = ({ template, onSave, onUploadAttachment, onRemoveAttachment, onReset, onTest, saving }) => {
  const { t } = useTranslation(['settings', 'common']);
  const [editedTemplate, setEditedTemplate] = useState({
    message_template_en: '',
    message_template_id: '',
    is_active: true,
  });
  const [previewLanguage, setPreviewLanguage] = useState('id');
  const [showPreview, setShowPreview] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const templateMeta = TEMPLATE_TYPES.find((t) => t.id === template?.template_type);

  useEffect(() => {
    if (template) {
      setEditedTemplate({
        message_template_en: template.message_template_en || '',
        message_template_id: template.message_template_id || '',
        is_active: template.is_active ?? true,
      });
    }
  }, [template]);

  const hasChanges =
    editedTemplate.message_template_en !== template?.message_template_en ||
    editedTemplate.message_template_id !== template?.message_template_id ||
    editedTemplate.is_active !== template?.is_active;

  const insertPlaceholder = (placeholder, field) => {
    const textarea = document.getElementById(field);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = editedTemplate[field];
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);

    setEditedTemplate((prev) => ({
      ...prev,
      [field]: newValue,
    }));

    // Reset cursor position after React re-render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const handleSave = () => {
    onSave(editedTemplate);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('settings:whatsapp.invalidFileType', 'Invalid file type. Allowed: JPG, PNG, WebP, PDF'));
      return;
    }

    // Validate file size (5MB for images, 10MB for PDF)
    const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(
        t('settings:whatsapp.fileTooLarge', 'File too large. Max size: {{size}}MB', {
          size: file.type === 'application/pdf' ? 10 : 5,
        })
      );
      return;
    }

    setUploadingAttachment(true);
    try {
      await onUploadAttachment(file);
      toast.success(t('settings:whatsapp.attachmentUploaded', 'Attachment uploaded successfully'));
    } catch (error) {
      toast.error(error.message || t('settings:whatsapp.uploadFailed', 'Failed to upload attachment'));
    } finally {
      setUploadingAttachment(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleRemoveAttachment = async () => {
    try {
      await onRemoveAttachment();
      toast.success(t('settings:whatsapp.attachmentRemoved', 'Attachment removed'));
    } catch (error) {
      toast.error(error.message || t('settings:whatsapp.removeFailed', 'Failed to remove attachment'));
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      toast.error(t('settings:whatsapp.enterPhone', 'Please enter a phone number'));
      return;
    }

    try {
      await onTest(testPhone, previewLanguage);
      setShowTestDialog(false);
      setTestPhone('');
      toast.success(t('settings:whatsapp.testSent', 'Test message sent!'));
    } catch (error) {
      toast.error(error.message || t('settings:whatsapp.testFailed', 'Failed to send test message'));
    }
  };

  // Render preview with sample data
  const renderPreview = () => {
    const messageTemplate =
      previewLanguage === 'en' ? editedTemplate.message_template_en : editedTemplate.message_template_id;

    // Replace placeholders with sample values
    let preview = messageTemplate;
    const sampleValues = {
      name: 'John Doe',
      phone: '+62812345678',
      church_name: 'Your Church Name',
      commitment_type: 'First-time decision',
      preferred_date: 'January 15, 2025',
      child_name: 'Baby Smith',
      child_gender: 'Male',
      father_name: 'John Smith',
      mother_name: 'Jane Smith',
      partner_name: 'Jane Doe',
      both_baptized: 'Yes',
      planned_date: 'March 20, 2025',
    };

    Object.entries(sampleValues).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return preview;
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {t('common:loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{templateMeta?.icon}</span>
          <div>
            <h3 className="text-lg font-semibold">{templateMeta?.label}</h3>
            <p className="text-sm text-gray-500">{templateMeta?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="is_active" className="text-sm">
              {t('settings:whatsapp.active', 'Active')}
            </Label>
            <Switch
              id="is_active"
              checked={editedTemplate.is_active}
              onCheckedChange={(checked) => setEditedTemplate((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>
      </div>

      {/* Available placeholders */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {t('settings:whatsapp.availablePlaceholders', 'Available Placeholders')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {templateMeta?.placeholders.map((placeholder) => (
            <PlaceholderChip
              key={placeholder}
              name={placeholder}
              onClick={(p) => {
                // Insert into currently focused textarea or default to Indonesian
                const activeField =
                  document.activeElement?.id === 'message_template_en'
                    ? 'message_template_en'
                    : 'message_template_id';
                insertPlaceholder(p, activeField);
              }}
            />
          ))}
        </div>
      </div>

      {/* Message editors */}
      <Tabs defaultValue="id" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="id">🇮🇩 Indonesian</TabsTrigger>
          <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
        </TabsList>

        <TabsContent value="id" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="message_template_id">
              {t('settings:whatsapp.messageContent', 'Message Content')} (Indonesian)
            </Label>
            <Textarea
              id="message_template_id"
              value={editedTemplate.message_template_id}
              onChange={(e) => setEditedTemplate((prev) => ({ ...prev, message_template_id: e.target.value }))}
              placeholder={t('settings:whatsapp.enterMessage', 'Enter message template...')}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>

        <TabsContent value="en" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="message_template_en">
              {t('settings:whatsapp.messageContent', 'Message Content')} (English)
            </Label>
            <Textarea
              id="message_template_en"
              value={editedTemplate.message_template_en}
              onChange={(e) => setEditedTemplate((prev) => ({ ...prev, message_template_en: e.target.value }))}
              placeholder={t('settings:whatsapp.enterMessage', 'Enter message template...')}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Attachment section */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              {template.attachment_type === 'image' ? (
                <Image className="w-4 h-4" />
              ) : template.attachment_type === 'pdf' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {t('settings:whatsapp.attachment', 'Attachment')}
              {template.attachment_url && (
                <Badge variant="secondary" className="ml-2">
                  {template.attachment_type?.toUpperCase()}
                </Badge>
              )}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="p-4 border rounded-lg bg-gray-50">
            {template.attachment_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {template.attachment_type === 'image' ? (
                    <img
                      src={template.attachment_url}
                      alt="Attachment preview"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center bg-red-100 rounded-lg">
                      <FileText className="w-8 h-8 text-red-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{template.attachment_filename || 'attachment'}</p>
                    <p className="text-sm text-gray-500">{template.attachment_type?.toUpperCase()}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleRemoveAttachment}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    {t('settings:whatsapp.remove', 'Remove')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <input
                  type="file"
                  id="attachment-upload"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="attachment-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                    {uploadingAttachment ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                    <span className="text-sm font-medium">
                      {uploadingAttachment
                        ? t('settings:whatsapp.uploading', 'Uploading...')
                        : t('settings:whatsapp.clickToUpload', 'Click to upload image or PDF')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t('settings:whatsapp.maxSize', 'Max: 5MB (images) / 10MB (PDF)')}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Preview section */}
      <Collapsible open={showPreview} onOpenChange={setShowPreview}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {t('settings:whatsapp.preview', 'Preview Message')}
            </span>
            {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="p-4 border rounded-lg bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <Tabs value={previewLanguage} onValueChange={setPreviewLanguage} className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="id" className="text-xs px-2 h-6">
                    🇮🇩 ID
                  </TabsTrigger>
                  <TabsTrigger value="en" className="text-xs px-2 h-6">
                    🇺🇸 EN
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-xs text-gray-500">(sample data)</span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <pre className="whitespace-pre-wrap text-sm font-sans">{renderPreview()}</pre>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('settings:whatsapp.resetDefault', 'Reset to Default')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
            <Send className="w-4 h-4 mr-1" />
            {t('settings:whatsapp.sendTest', 'Send Test')}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {t('common:save', 'Save Changes')}
          </Button>
        </div>
      </div>

      {/* Test message dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings:whatsapp.sendTestTitle', 'Send Test Message')}</DialogTitle>
            <DialogDescription>
              {t(
                'settings:whatsapp.sendTestDesc',
                'Enter a phone number to receive a test message with sample data.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">{t('settings:whatsapp.phoneNumber', 'Phone Number')}</Label>
              <Input
                id="test-phone"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+62812345678"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings:whatsapp.language', 'Language')}</Label>
              <Tabs value={previewLanguage} onValueChange={setPreviewLanguage}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="id">🇮🇩 Indonesian</TabsTrigger>
                  <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSendTest}>
              <Send className="w-4 h-4 mr-1" />
              {t('settings:whatsapp.send', 'Send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main component
const WhatsAppTemplatesPage = () => {
  const { t } = useTranslation(['settings', 'common']);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('accept_jesus_confirmation');

  // Fetch all templates
  const {
    data: templates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: whatsappTemplatesApi.listTemplates,
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ templateType, data }) => whatsappTemplatesApi.updateTemplate(templateType, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-templates']);
      toast.success(t('settings:whatsapp.templateSaved', 'Template saved successfully'));
    },
    onError: (error) => {
      toast.error(error.message || t('settings:whatsapp.saveFailed', 'Failed to save template'));
    },
  });

  // Upload attachment mutation
  const uploadMutation = useMutation({
    mutationFn: ({ templateType, file }) => whatsappTemplatesApi.uploadAttachment(templateType, file),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-templates']);
    },
  });

  // Remove attachment mutation
  const removeMutation = useMutation({
    mutationFn: (templateType) => whatsappTemplatesApi.removeAttachment(templateType),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-templates']);
    },
  });

  // Reset template mutation
  const resetMutation = useMutation({
    mutationFn: (templateType) => whatsappTemplatesApi.resetToDefault(templateType),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-templates']);
      toast.success(t('settings:whatsapp.templateReset', 'Template reset to default'));
    },
    onError: (error) => {
      toast.error(error.message || t('settings:whatsapp.resetFailed', 'Failed to reset template'));
    },
  });

  // Test message mutation
  const testMutation = useMutation({
    mutationFn: ({ templateType, phone, language }) =>
      whatsappTemplatesApi.sendTest(templateType, phone, language),
  });

  const activeTemplate = templates?.find((t) => t.template_type === activeTab);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <X className="w-12 h-12 mb-2" />
        <p>{t('settings:whatsapp.loadError', 'Failed to load templates')}</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries(['whatsapp-templates'])}>
          {t('common:retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-500" />
            {t('settings:whatsapp.title', 'WhatsApp Templates')}
          </h2>
          <p className="text-gray-500 mt-1">
            {t(
              'settings:whatsapp.description',
              'Customize confirmation messages sent to requesters via WhatsApp'
            )}
          </p>
        </div>
      </div>

      {/* Template tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              {TEMPLATE_TYPES.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {TEMPLATE_TYPES.map((type) => (
              <TabsContent key={type.id} value={type.id}>
                <TemplateEditor
                  template={activeTemplate}
                  onSave={(data) => updateMutation.mutate({ templateType: type.id, data })}
                  onUploadAttachment={(file) => uploadMutation.mutateAsync({ templateType: type.id, file })}
                  onRemoveAttachment={() => removeMutation.mutateAsync(type.id)}
                  onReset={() => resetMutation.mutate(type.id)}
                  onTest={(phone, language) =>
                    testMutation.mutateAsync({ templateType: type.id, phone, language })
                  }
                  saving={updateMutation.isPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Info box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">{t('settings:whatsapp.howItWorks', 'How it works')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  {t(
                    'settings:whatsapp.info1',
                    'Messages are sent automatically when someone submits a form via kiosk'
                  )}
                </li>
                <li>
                  {t(
                    'settings:whatsapp.info2',
                    'For Child Dedication and Holy Matrimony, messages are sent to all participants'
                  )}
                </li>
                <li>
                  {t(
                    'settings:whatsapp.info3',
                    'Use placeholders like {{name}} to personalize messages'
                  )}
                </li>
                <li>
                  {t(
                    'settings:whatsapp.info4',
                    'Attachments (image or PDF) are sent along with the message'
                  )}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppTemplatesPage;
