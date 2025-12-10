import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, Bell, Image as ImageIcon, Calendar,
  Users, Target, X, Upload, Loader2, Smartphone, AlertCircle,
  Link as LinkIcon, FileText, CalendarDays, Layout
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import {
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useSendCampaign,
  useTestSendCampaign,
  useUploadCampaignImage,
  useDeleteCampaignImage,
  useEstimateAudience,
} from '../../hooks/useBroadcasts';
import { useGroups } from '../../hooks/useGroups';
import { useMemberStatuses } from '../../hooks/useSettings';
import { useToast } from '../../hooks/use-toast';
import { DevicePreview } from './components';

export default function BroadcastEditor() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    image_url: null,
    action_type: 'none',
    action_data: {},
    audience: {
      target_type: 'all',
      group_ids: [],
      member_status_ids: [],
      gender: null,
      age_min: null,
      age_max: null,
      member_ids: [],
      exclude_member_ids: [],
    },
    send_type: 'immediate',
    scheduled_at: null,
    priority: 'normal',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [audienceEstimate, setAudienceEstimate] = useState(null);

  // Fetch existing campaign if editing
  const { data: campaign, isLoading: isLoadingCampaign } = useCampaign(id);

  // Fetch groups and member statuses for targeting
  const { data: groupsData } = useGroups({ limit: 100 });
  const { data: memberStatusesData } = useMemberStatuses();

  const groups = groupsData?.data || [];
  const memberStatuses = memberStatusesData || [];

  // Mutations
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const sendMutation = useSendCampaign();
  const testSendMutation = useTestSendCampaign();
  const uploadImageMutation = useUploadCampaignImage();
  const deleteImageMutation = useDeleteCampaignImage();
  const estimateAudienceMutation = useEstimateAudience();

  // Load campaign data when editing
  // CRITICAL: Use ?? (nullish coalescing) to preserve falsy values like empty strings
  useEffect(() => {
    if (campaign) {
      setFormData({
        title: campaign.title ?? '',
        body: campaign.body ?? '',
        image_url: campaign.image_url ?? null,
        action_type: campaign.action_type ?? 'none',
        action_data: campaign.action_data ?? {},
        audience: campaign.audience ?? { target_type: 'all' },
        send_type: campaign.send_type ?? 'immediate',
        scheduled_at: campaign.scheduled_at ?? null,
        priority: campaign.priority ?? 'normal',
      });
      if (campaign.image_url) {
        setImagePreview(campaign.image_url);
      }
    }
  }, [campaign?.id]);

  // Estimate audience when targeting changes
  const estimateAudience = useCallback(async () => {
    try {
      const result = await estimateAudienceMutation.mutateAsync(formData.audience);
      setAudienceEstimate(result.data);
    } catch (error) {
      console.error('Failed to estimate audience:', error);
      setAudienceEstimate(null);
      toast({
        title: t('broadcasts.form.audienceEstimateFailed', 'Failed to estimate audience'),
        description: error.response?.data?.detail || error.message,
        variant: 'destructive',
      });
    }
  }, [formData.audience, estimateAudienceMutation, toast, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      estimateAudience();
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.audience]);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: null }));
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('broadcasts.validation.required') });
      return;
    }

    try {
      let campaignId = id;

      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: formData });
      } else {
        const result = await createMutation.mutateAsync(formData);
        campaignId = result.data.id;
      }

      // Upload image if selected
      if (imageFile && campaignId) {
        await uploadImageMutation.mutateAsync({ id: campaignId, file: imageFile });
      }

      navigate('/broadcasts');
    } catch (error) {
      // Error handled by hooks
    }
  };

  // Send campaign
  const handleSend = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('broadcasts.validation.required') });
      return;
    }

    if (formData.send_type === 'scheduled' && !formData.scheduled_at) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('broadcasts.validation.scheduledRequired') });
      return;
    }

    const confirmMessage = formData.send_type === 'scheduled'
      ? t('broadcasts.messages.confirmSchedule')
      : t('broadcasts.messages.confirmSendNow', { count: audienceEstimate?.with_active_devices || 0 });

    if (!window.confirm(confirmMessage)) return;

    try {
      let campaignId = id;

      // Save first if new
      if (!isEditing) {
        const result = await createMutation.mutateAsync(formData);
        campaignId = result.data.id;

        // Upload image if selected
        if (imageFile && campaignId) {
          await uploadImageMutation.mutateAsync({ id: campaignId, file: imageFile });
        }
      } else {
        await updateMutation.mutateAsync({ id, data: formData });
        if (imageFile) {
          await uploadImageMutation.mutateAsync({ id, file: imageFile });
        }
      }

      // Send/schedule
      await sendMutation.mutateAsync(campaignId);
      navigate('/broadcasts');
    } catch (error) {
      // Error handled by hooks
    }
  };

  // Test send
  const handleTestSend = async () => {
    if (!id) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('broadcasts.messages.saveFirst') });
      return;
    }

    try {
      await testSendMutation.mutateAsync(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || sendMutation.isPending;
  const canEdit = !isEditing || campaign?.status === 'draft' || campaign?.status === 'scheduled';

  if (isLoadingCampaign && isEditing) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/broadcasts')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? t('broadcasts.editCampaign') : t('broadcasts.newCampaign')}
            </h1>
            {campaign?.status && (
              <Badge variant="secondary" className="mt-1">{campaign.status}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing && canEdit && (
            <Button variant="outline" onClick={handleTestSend} disabled={testSendMutation.isPending}>
              {testSendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
              {t('broadcasts.actions.testSend')}
            </Button>
          )}
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting || !canEdit}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('broadcasts.actions.saveDraft')}
          </Button>
          <Button onClick={handleSend} disabled={isSubmitting || !canEdit}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {formData.send_type === 'scheduled' ? t('broadcasts.actions.schedule') : t('broadcasts.actions.send')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t('broadcasts.form.content')}
              </CardTitle>
              <CardDescription>{t('broadcasts.form.contentDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">{t('broadcasts.form.title')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('broadcasts.form.titlePlaceholder')}
                  maxLength={100}
                  disabled={!canEdit}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100</p>
              </div>

              <div>
                <Label htmlFor="body">{t('broadcasts.form.body')} *</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder={t('broadcasts.form.bodyPlaceholder')}
                  maxLength={500}
                  rows={4}
                  disabled={!canEdit}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.body.length}/500</p>
              </div>

              {/* Image Upload */}
              <div>
                <Label>{t('broadcasts.form.image')}</Label>
                {imagePreview ? (
                  <div className="mt-2 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg border" />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                      disabled={!canEdit}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="mt-2 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">{t('broadcasts.form.uploadImage')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={!canEdit}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audience Targeting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {t('broadcasts.form.targetAudience')}
              </CardTitle>
              <CardDescription>{t('broadcasts.form.targetDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={formData.audience.target_type}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  audience: { ...prev.audience, target_type: value }
                }))}
                disabled={!canEdit}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">{t('broadcasts.audience.allMembers')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groups" id="groups" />
                  <Label htmlFor="groups">{t('broadcasts.audience.byGroup')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="status" id="status" />
                  <Label htmlFor="status">{t('broadcasts.audience.byStatus')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="demographics" id="demographics" />
                  <Label htmlFor="demographics">{t('broadcasts.audience.byDemographics')}</Label>
                </div>
              </RadioGroup>

              {/* Groups selector */}
              {formData.audience.target_type === 'groups' && groups.length > 0 && (
                <div className="pl-6 space-y-2">
                  <Label>{t('broadcasts.audience.selectGroups')}</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {groups.map(group => (
                      <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.audience.group_ids?.includes(group.id)}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...(formData.audience.group_ids || []), group.id]
                              : formData.audience.group_ids?.filter(id => id !== group.id) || [];
                            setFormData(prev => ({
                              ...prev,
                              audience: { ...prev.audience, group_ids: newIds }
                            }));
                          }}
                          disabled={!canEdit}
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Member status selector */}
              {formData.audience.target_type === 'status' && memberStatuses.length > 0 && (
                <div className="pl-6 space-y-2">
                  <Label>{t('broadcasts.audience.selectStatus')}</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {memberStatuses.map(status => (
                      <label key={status.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.audience.member_status_ids?.includes(status.id)}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...(formData.audience.member_status_ids || []), status.id]
                              : formData.audience.member_status_ids?.filter(id => id !== status.id) || [];
                            setFormData(prev => ({
                              ...prev,
                              audience: { ...prev.audience, member_status_ids: newIds }
                            }));
                          }}
                          disabled={!canEdit}
                        />
                        <span className="text-sm">{status.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Demographics */}
              {formData.audience.target_type === 'demographics' && (
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('broadcasts.audience.gender')}</Label>
                      <Select
                        value={formData.audience.gender || 'any'}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          audience: { ...prev.audience, gender: value === 'any' ? null : value }
                        }))}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('broadcasts.audience.anyGender')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t('broadcasts.audience.anyGender')}</SelectItem>
                          <SelectItem value="Male">{t('common.male')}</SelectItem>
                          <SelectItem value="Female">{t('common.female')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('broadcasts.audience.ageMin')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="150"
                        value={formData.audience.age_min || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audience: { ...prev.audience, age_min: e.target.value ? parseInt(e.target.value) : null }
                        }))}
                        placeholder="0"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label>{t('broadcasts.audience.ageMax')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="150"
                        value={formData.audience.age_max || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audience: { ...prev.audience, age_max: e.target.value ? parseInt(e.target.value) : null }
                        }))}
                        placeholder="150"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Audience Estimate */}
              {audienceEstimate && (
                <Alert>
                  <Users className="w-4 h-4" />
                  <AlertDescription>
                    <strong>{t('broadcasts.audience.estimatedReach')}: </strong>
                    {audienceEstimate.with_active_devices} {t('broadcasts.audience.membersWithDevices')}
                    <span className="text-gray-500 ml-2">
                      ({audienceEstimate.total_members} {t('broadcasts.audience.totalMatching')})
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Deep Link Action */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                {t('broadcasts.form.action')}
              </CardTitle>
              <CardDescription>{t('broadcasts.form.actionDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={formData.action_type}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  action_type: value,
                  action_data: {}
                }))}
                disabled={!canEdit}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="action-none" />
                  <Label htmlFor="action-none">{t('broadcasts.action.none')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="article" id="action-article" />
                  <Label htmlFor="action-article">{t('broadcasts.action.article')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="event" id="action-event" />
                  <Label htmlFor="action-event">{t('broadcasts.action.event')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="action-url" />
                  <Label htmlFor="action-url">{t('broadcasts.action.url')}</Label>
                </div>
              </RadioGroup>

              {formData.action_type === 'url' && (
                <div className="pl-6">
                  <Label>{t('broadcasts.action.urlInput')}</Label>
                  <Input
                    value={formData.action_data.url || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      action_data: { url: e.target.value }
                    }))}
                    placeholder="https://..."
                    disabled={!canEdit}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('broadcasts.form.schedule')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={formData.send_type}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  send_type: value,
                  scheduled_at: value === 'immediate' ? null : prev.scheduled_at
                }))}
                disabled={!canEdit}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="send-now" />
                  <Label htmlFor="send-now">{t('broadcasts.schedule.sendNow')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scheduled" id="send-later" />
                  <Label htmlFor="send-later">{t('broadcasts.schedule.scheduleLater')}</Label>
                </div>
              </RadioGroup>

              {formData.send_type === 'scheduled' && (
                <div className="pl-6">
                  <Label>{t('broadcasts.schedule.scheduledTime')}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null
                    }))}
                    min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('broadcasts.schedule.minTime')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {t('broadcasts.preview.title')}
              </CardTitle>
              <CardDescription>{t('broadcasts.preview.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DevicePreview
                title={formData.title}
                body={formData.body}
                imageUrl={imagePreview || formData.image_url}
              />
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('broadcasts.tips.title')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>• {t('broadcasts.tips.titleLength')}</p>
              <p>• {t('broadcasts.tips.bodyLength')}</p>
              <p>• {t('broadcasts.tips.personalize')}</p>
              <p>• {t('broadcasts.tips.testFirst')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
