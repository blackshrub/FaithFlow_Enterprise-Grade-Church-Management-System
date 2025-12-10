import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Save, Eye, Smartphone, Variable, Plus, X, Info
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  usePreviewTemplate,
  useSystemVariables,
  useTemplateCategories,
} from '../../hooks/useNotificationTemplates';

// Phone preview component
const PhonePreview = ({ title, body, imageUrl }) => (
  <div className="mx-auto w-[280px] rounded-[40px] border-8 border-gray-800 bg-gray-800 p-2">
    <div className="rounded-[32px] bg-white overflow-hidden h-[500px] flex flex-col">
      {/* Status bar */}
      <div className="bg-gray-100 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
        <span>9:41</span>
        <span>FaithFlow</span>
        <span>100%</span>
      </div>

      {/* Notification */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-xl shadow-lg border overflow-hidden">
          {imageUrl && (
            <div className="w-full h-32 bg-gray-100">
              <img
                src={imageUrl}
                alt="Notification"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg font-bold">F</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                  {title || 'Notification Title'}
                </p>
                <p className="text-gray-600 text-sm mt-1 line-clamp-3">
                  {body || 'Notification body text will appear here...'}
                </p>
                <p className="text-gray-400 text-xs mt-2">now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Home indicator */}
      <div className="bg-gray-100 py-2 flex justify-center">
        <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  </div>
);

// Variable badge component
const VariableBadge = ({ variable, onClick }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={onClick}
        >
          <Variable className="h-3 w-3 mr-1" />
          {variable.key}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{variable.description}</p>
        <p className="text-xs text-muted-foreground">Example: {variable.example}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function TemplateEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    title: '',
    body: '',
    image_url: '',
    action_type: 'none',
    action_data: null,
    priority: 'normal',
    tags: [],
    is_active: true,
    custom_variables: [],
  });
  const [newTag, setNewTag] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewVariables, setPreviewVariables] = useState({});

  // Queries
  const { data: template, isLoading: templateLoading } = useTemplate(isEditing ? id : null);
  const { data: systemVarsData } = useSystemVariables();
  const { data: categoriesData } = useTemplateCategories();

  const systemVariables = systemVarsData?.variables || [];
  const categories = categoriesData?.categories || [];

  // Mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const previewMutation = usePreviewTemplate();

  // Load template data when editing
  // CRITICAL: Use ?? (nullish coalescing) to preserve falsy values like empty strings
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name ?? '',
        description: template.description ?? '',
        category: template.category ?? 'general',
        title: template.title ?? '',
        body: template.body ?? '',
        image_url: template.image_url ?? '',
        action_type: template.action_type ?? 'none',
        action_data: template.action_data ?? null,
        priority: template.priority ?? 'normal',
        tags: template.tags ?? [],
        is_active: template.is_active ?? true,
        custom_variables: template.custom_variables ?? [],
      });
    }
  }, [template?.id]);

  // Handle form field change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Insert variable at cursor position
  const insertVariable = (variable, field) => {
    const input = document.querySelector(`[name="${field}"]`);
    const value = formData[field];
    const cursorPos = input?.selectionStart || value.length;

    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const newValue = `${before}{{${variable.key}}}${after}`;

    handleChange(field, newValue);
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tag) => {
    handleChange('tags', formData.tags.filter(t => t !== tag));
  };

  // Handle preview
  const handlePreview = async () => {
    if (isEditing) {
      try {
        const result = await previewMutation.mutateAsync({
          id,
          variables: previewVariables
        });
        setPreviewData(result.data);
        setPreviewOpen(true);
      } catch (error) {
        // Error handled by mutation
      }
    } else {
      // For new templates, just show the raw content
      setPreviewData({
        title: formData.title,
        body: formData.body,
        image_url: formData.image_url,
      });
      setPreviewOpen(true);
    }
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: formData });
        navigate('/notification-templates');
      } else {
        await createMutation.mutateAsync(formData);
        navigate('/notification-templates');
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (templateLoading && isEditing) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/notification-templates')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing
              ? t('notificationTemplates.edit', 'Edit Template')
              : t('notificationTemplates.create', 'Create Template')}
          </h1>
          <p className="text-muted-foreground">
            {t('notificationTemplates.editorDesc', 'Define reusable notification content with variables')}
          </p>
        </div>
        <Button variant="outline" onClick={handlePreview}>
          <Eye className="mr-2 h-4 w-4" />
          {t('notificationTemplates.preview', 'Preview')}
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEditing
            ? t('common.save', 'Save')
            : t('common.create', 'Create')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationTemplates.basicInfo', 'Basic Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('notificationTemplates.form.name', 'Template Name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('notificationTemplates.form.namePlaceholder', 'e.g., Weekly Reminder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('notificationTemplates.form.description', 'Description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder={t('notificationTemplates.form.descriptionPlaceholder', 'Describe when to use this template')}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('notificationTemplates.form.category', 'Category')}</Label>
                  <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                      <SelectItem value="reminders">Reminders</SelectItem>
                      <SelectItem value="announcements">Announcements</SelectItem>
                      <SelectItem value="devotional">Devotional</SelectItem>
                      <SelectItem value="prayer">Prayer</SelectItem>
                      {categories.filter(c => !['general', 'events', 'reminders', 'announcements', 'devotional', 'prayer'].includes(c)).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('notificationTemplates.form.priority', 'Priority')}</Label>
                  <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => handleChange('is_active', v)}
                />
                <Label htmlFor="is_active">{t('notificationTemplates.form.active', 'Template is active')}</Label>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationTemplates.content', 'Notification Content')}</CardTitle>
              <CardDescription>
                {t('notificationTemplates.contentDesc', 'Use {{variable_name}} to insert dynamic content')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">{t('notificationTemplates.form.title', 'Title')} *</Label>
                  <span className="text-xs text-muted-foreground">{formData.title.length}/100</span>
                </div>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder={t('notificationTemplates.form.titlePlaceholder', 'e.g., {{church_name}} Reminder')}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">{t('notificationTemplates.form.body', 'Body')} *</Label>
                  <span className="text-xs text-muted-foreground">{formData.body.length}/500</span>
                </div>
                <Textarea
                  id="body"
                  name="body"
                  value={formData.body}
                  onChange={(e) => handleChange('body', e.target.value)}
                  placeholder={t('notificationTemplates.form.bodyPlaceholder', 'e.g., Hi {{first_name}}, don\'t forget...')}
                  maxLength={500}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">{t('notificationTemplates.form.imageUrl', 'Image URL (optional)')}</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationTemplates.tags', 'Tags')}</CardTitle>
              <CardDescription>
                {t('notificationTemplates.tagsDesc', 'Add tags to organize and find templates easily')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t('notificationTemplates.form.tagPlaceholder', 'Enter tag name')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Variables & Preview */}
        <div className="space-y-6">
          {/* Available Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Variable className="h-4 w-4" />
                {t('notificationTemplates.variables', 'Variables')}
              </CardTitle>
              <CardDescription>
                {t('notificationTemplates.variablesDesc', 'Click to insert into title or body')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase font-medium">System Variables</p>
                <div className="flex flex-wrap gap-2">
                  {systemVariables.map((v) => (
                    <VariableBadge
                      key={v.key}
                      variable={v}
                      onClick={() => insertVariable(v, 'body')}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                {t('notificationTemplates.livePreview', 'Live Preview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhonePreview
                title={formData.title}
                body={formData.body}
                imageUrl={formData.image_url}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('notificationTemplates.previewTitle', 'Notification Preview')}</DialogTitle>
            <DialogDescription>
              {t('notificationTemplates.previewDesc', 'This is how the notification will appear on devices')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PhonePreview
              title={previewData?.title || formData.title}
              body={previewData?.body || formData.body}
              imageUrl={previewData?.image_url || formData.image_url}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
