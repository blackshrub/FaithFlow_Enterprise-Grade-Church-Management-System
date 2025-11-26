import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Slider } from '../../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import {
  ArrowLeft, Save, Loader2, BookOpen, MessageSquare, User, HelpCircle,
  GraduationCap, FolderTree, Tag, Calendar, Image, RotateCcw, Settings2,
  Info
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';

const contentTypeConfig = {
  daily_devotion: { label: 'Daily Devotion', icon: BookOpen, color: 'text-blue-600' },
  verse_of_the_day: { label: 'Verse of the Day', icon: MessageSquare, color: 'text-green-600' },
  bible_figure: { label: 'Bible Figure', icon: User, color: 'text-purple-600' },
  daily_quiz: { label: 'Daily Quiz', icon: HelpCircle, color: 'text-orange-600' },
  bible_study: { label: 'Bible Study', icon: GraduationCap, color: 'text-indigo-600' },
  topical_category: { label: 'Topical Category', icon: FolderTree, color: 'text-teal-600' },
  topical_verse: { label: 'Topical Verse', icon: Tag, color: 'text-cyan-600' },
  devotion_plan: { label: 'Devotion Plan', icon: Calendar, color: 'text-rose-600' },
  shareable_image: { label: 'Shareable Image', icon: Image, color: 'text-pink-600' },
};

// Field type renderers based on schema
const renderField = (fieldName, fieldSchema, value, onChange, placeholder) => {
  const fieldType = fieldSchema.type;
  const options = fieldSchema.enum || fieldSchema.options;
  const description = fieldSchema.description;

  // Boolean field
  if (fieldType === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <Label className="font-medium">{formatFieldName(fieldName)}</Label>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <Switch
          checked={value ?? fieldSchema.default ?? false}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  // Enum/Select field
  if (options) {
    return (
      <div className="space-y-1">
        <Label className="font-medium">{formatFieldName(fieldName)}</Label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
        <Select value={value ?? fieldSchema.default} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder || `Select ${formatFieldName(fieldName)}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt}>
                {formatOptionLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Integer with range (Slider)
  if (fieldType === 'integer' && fieldSchema.minimum !== undefined && fieldSchema.maximum !== undefined) {
    const min = fieldSchema.minimum ?? 0;
    const max = fieldSchema.maximum ?? 100;
    const currentValue = value ?? fieldSchema.default ?? min;

    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <div>
            <Label className="font-medium">{formatFieldName(fieldName)}</Label>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
          <span className="text-sm font-medium text-gray-700">{currentValue}</span>
        </div>
        <Slider
          value={[currentValue]}
          onValueChange={(vals) => onChange(vals[0])}
          min={min}
          max={max}
          step={1}
          className="w-full"
        />
      </div>
    );
  }

  // Integer (simple number input)
  if (fieldType === 'integer') {
    return (
      <div className="space-y-1">
        <Label className="font-medium">{formatFieldName(fieldName)}</Label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
        <Input
          type="number"
          value={value ?? fieldSchema.default ?? 0}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          min={fieldSchema.minimum}
          max={fieldSchema.maximum}
        />
      </div>
    );
  }

  // String with placeholder (Textarea for long text hints)
  if (placeholder && placeholder.length > 50) {
    return (
      <div className="space-y-1">
        <Label className="font-medium">{formatFieldName(fieldName)}</Label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
        <Textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      </div>
    );
  }

  // Default string input
  return (
    <div className="space-y-1">
      <Label className="font-medium">{formatFieldName(fieldName)}</Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <Input
        value={value ?? fieldSchema.default ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${formatFieldName(fieldName).toLowerCase()}`}
      />
    </div>
  );
};

// Format field names for display
const formatFieldName = (name) => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format option labels
const formatOptionLabel = (value) => {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Content type configuration panel
function ContentTypePanel({ contentType, config, schema, onUpdate }) {
  const [localConfig, setLocalConfig] = useState(config || {});
  const properties = schema?.config?.properties || {};

  const handleFieldChange = (fieldName, value) => {
    const newConfig = { ...localConfig, [fieldName]: value };
    setLocalConfig(newConfig);
    onUpdate(newConfig);
  };

  // Group fields by category
  const fieldGroups = {
    theological: ['doctrinal_foundation', 'doctrinal_notes'],
    voice: ['tone', 'writing_style', 'reading_level', 'commentary_style', 'commentary_depth'],
    audience: ['target_audience', 'group_size', 'depth_level'],
    content: ['length', 'emphasis', 'application_focus', 'application_emphasis', 'learning_objective'],
    structure: [
      'include_opening_story', 'include_prayer', 'include_reflection_questions',
      'num_reflection_questions', 'include_cross_references', 'num_cross_references',
      'include_timeline', 'include_key_verses', 'num_key_lessons', 'include_related_figures',
      'include_icebreaker', 'include_leader_notes', 'include_homework', 'num_discussion_questions',
      'include_journaling_prompts', 'include_action_steps'
    ],
    visual: ['color_palette', 'icon_style', 'visual_style', 'color_preference', 'mood', 'suggest_background_style'],
    context: ['church_context', 'current_theme', 'seasonal_awareness', 'transformation_goal'],
  };

  const getFieldGroup = (fieldName) => {
    for (const [group, fields] of Object.entries(fieldGroups)) {
      if (fields.includes(fieldName)) return group;
    }
    return 'other';
  };

  // Organize fields by group
  const groupedFields = {};
  Object.entries(properties).forEach(([fieldName, fieldSchema]) => {
    const group = getFieldGroup(fieldName);
    if (!groupedFields[group]) groupedFields[group] = [];
    groupedFields[group].push({ name: fieldName, schema: fieldSchema });
  });

  const groupLabels = {
    theological: 'Theological Direction',
    voice: 'Voice & Style',
    audience: 'Target Audience',
    content: 'Content Focus',
    structure: 'Content Structure',
    visual: 'Visual Settings',
    context: 'Church Context',
    other: 'Other Settings',
  };

  return (
    <Accordion type="multiple" defaultValue={['theological', 'voice']} className="w-full">
      {Object.entries(groupedFields).map(([group, fields]) => (
        fields.length > 0 && (
          <AccordionItem key={group} value={group}>
            <AccordionTrigger className="text-sm font-semibold">
              {groupLabels[group] || formatFieldName(group)}
              <Badge variant="outline" className="ml-2 text-xs">
                {fields.length}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {fields.map(({ name, schema }) => (
                  <div key={name}>
                    {renderField(
                      name,
                      schema,
                      localConfig[name],
                      (value) => handleFieldChange(name, value),
                      schema.json_schema_extra?.placeholder
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      ))}
    </Accordion>
  );
}

export default function AIPromptConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeType, setActiveType] = useState('daily_devotion');
  const [pendingChanges, setPendingChanges] = useState({});

  // Fetch configuration
  const { data: configData, isLoading } = useQuery({
    queryKey: ['explore', 'prompt-config'],
    queryFn: () => exploreService.getPromptConfig(),
    staleTime: 60000,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (config) => exploreService.updatePromptConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries(['explore', 'prompt-config']);
      setPendingChanges({});
      toast({
        title: 'Configuration Saved',
        description: 'AI prompt configuration has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: (contentType) => exploreService.resetPromptConfig(contentType),
    onSuccess: (data, contentType) => {
      queryClient.invalidateQueries(['explore', 'prompt-config']);
      if (contentType) {
        const newPending = { ...pendingChanges };
        delete newPending[contentType];
        setPendingChanges(newPending);
      } else {
        setPendingChanges({});
      }
      toast({
        title: 'Configuration Reset',
        description: contentType
          ? `${contentTypeConfig[contentType]?.label} reset to defaults`
          : 'All configurations reset to defaults',
      });
    },
  });

  const handleConfigUpdate = (contentType, config) => {
    setPendingChanges(prev => ({
      ...prev,
      [contentType]: config,
    }));
  };

  const handleSave = () => {
    const mergedConfig = {
      ...configData?.config,
      ...pendingChanges,
    };
    saveMutation.mutate(mergedConfig);
  };

  const handleReset = (contentType) => {
    if (window.confirm(
      contentType
        ? `Reset ${contentTypeConfig[contentType]?.label} configuration to defaults?`
        : 'Reset ALL prompt configurations to defaults?'
    )) {
      resetMutation.mutate(contentType || null);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const schema = configData?.schema || {};
  const config = configData?.config || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/content-center"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Content Center
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            AI Prompt Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Customize how AI generates content for each Explore content type
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleReset(null)}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasPendingChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
            {hasPendingChanges && (
              <Badge variant="secondary" className="ml-2">
                {Object.keys(pendingChanges).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                These settings control how AI generates content for your church. Each content type
                has specific dimensions you can customize to match your church's theological
                tradition, tone, and audience.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Changes are applied to new AI-generated content only. Existing content is not affected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Tabs */}
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-5 gap-2 h-auto p-2 bg-gray-100">
          {Object.entries(contentTypeConfig).map(([type, cfg]) => {
            const Icon = cfg.icon;
            const hasChanges = !!pendingChanges[type];

            return (
              <TabsTrigger
                key={type}
                value={type}
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-white relative"
              >
                <Icon className={`h-5 w-5 ${cfg.color}`} />
                <span className="text-xs font-medium">{cfg.label}</span>
                {hasChanges && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(contentTypeConfig).map(([type, cfg]) => (
          <TabsContent key={type} value={type} className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-100 ${cfg.color}`}>
                      <cfg.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>{cfg.label} Configuration</CardTitle>
                      <CardDescription>
                        {schema[type]?.description || 'Configure AI generation settings'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(type)}
                    disabled={resetMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ContentTypePanel
                  contentType={type}
                  config={pendingChanges[type] || config[type] || {}}
                  schema={schema[type]}
                  onUpdate={(newConfig) => handleConfigUpdate(type, newConfig)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
