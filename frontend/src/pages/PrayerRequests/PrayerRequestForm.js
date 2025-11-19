import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { usePrayerRequest, useCreatePrayerRequest, useUpdatePrayerRequest } from '../../hooks/usePrayerRequests';
import { useToast } from '../../hooks/use-toast';
import MemberSelector from '../../components/MemberSelector';

export default function PrayerRequestForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    member_id: '',
    title: '',
    description: '',
    category: 'other',
    status: 'new',
    internal_notes: '',
    needs_follow_up: false,
    follow_up_notes: ''
  });
  const [selectedMemberData, setSelectedMemberData] = useState(null);

  const { data: existingRequest } = usePrayerRequest(id);
  const createMutation = useCreatePrayerRequest();
  const updateMutation = useUpdatePrayerRequest();

  useEffect(() => {
    if (existingRequest) {
      setFormData({
        member_id: existingRequest.member_id || '',
        title: existingRequest.title || '',
        description: existingRequest.description || '',
        category: existingRequest.category || 'other',
        status: existingRequest.status || 'new',
        internal_notes: existingRequest.internal_notes || '',
        needs_follow_up: existingRequest.needs_follow_up || false,
        follow_up_notes: existingRequest.follow_up_notes || ''
      });
    }
  }, [existingRequest]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.member_id) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('prayerRequests.validation.memberRequired')
      });
      return;
    }

    if (!formData.title || !formData.description) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('prayerRequests.validation.titleRequired')
      });
      return;
    }

    const payload = {
      member_id: formData.member_id,
      requester_name: selectedMemberData?.full_name || '',
      requester_contact: selectedMemberData?.phone_whatsapp || selectedMemberData?.email || '',
      title: formData.title,
      description: formData.description,
      category: formData.category,
      status: formData.status,
      internal_notes: formData.internal_notes,
      needs_follow_up: formData.needs_follow_up,
      follow_up_notes: formData.follow_up_notes
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast({
          title: t('common.success'),
          description: t('prayerRequests.messages.updateSuccess')
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast({
          title: t('common.success'),
          description: t('prayerRequests.messages.createSuccess')
        });
      }

      navigate('/prayer-requests');
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEdit ? t('prayerRequests.editRequest') : t('prayerRequests.createRequest')}
        </h1>
        <Button variant="outline" onClick={() => navigate('/prayer-requests')}>
          {t('common.back')}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('prayerRequests.requestTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('prayerRequests.requestTitle')} *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('prayerRequests.requestTitle')}
                    required
                  />
                </div>

                <div>
                  <Label>{t('prayerRequests.description')} *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('prayerRequests.description')}
                    rows={6}
                    required
                  />
                </div>

                {isEdit && (
                  <div>
                    <Label>{t('prayerRequests.internalNotes')}</Label>
                    <Textarea
                      value={formData.internal_notes}
                      onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                      placeholder={t('prayerRequests.internalNotes')}
                      rows={3}
                    />
                  </div>
                )}

                <div className="space-y-4 border-t pt-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="needs_follow_up"
                      checked={formData.needs_follow_up}
                      onChange={(e) => setFormData({ ...formData, needs_follow_up: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="needs_follow_up" className="cursor-pointer">
                      {t('prayerRequests.needsFollowUp')}
                    </Label>
                  </div>

                  {formData.needs_follow_up && (
                    <div>
                      <Label>{t('prayerRequests.followUpNotes')}</Label>
                      <Textarea
                        value={formData.follow_up_notes}
                        onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                        placeholder={t('prayerRequests.followUpNotesPlaceholder')}
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {isEdit && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="needs_follow_up"
                        checked={formData.needs_follow_up}
                        onChange={(e) => setFormData({ ...formData, needs_follow_up: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="needs_follow_up" className="cursor-pointer">
                        {t('prayerRequests.needsFollowUp')}
                      </Label>
                    </div>

                    {formData.needs_follow_up && (
                      <div>
                        <Label>{t('prayerRequests.followUpNotes')}</Label>
                        <Textarea
                          value={formData.follow_up_notes}
                          onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                          placeholder={t('prayerRequests.followUpNotesPlaceholder')}
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('prayerRequests.requesterName')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Label>{t('prayerRequests.selectMember')} *</Label>
                  <Input
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (e.target.value.length >= 2) {
                        setShowMemberDropdown(true);
                      }
                    }}
                    onFocus={() => {
                      if (memberSearch.length >= 2) {
                        setShowMemberDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow click on dropdown
                      setTimeout(() => setShowMemberDropdown(false), 200);
                    }}
                    placeholder={t('common.search') + '...'}
                    required
                  />
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => handleMemberSelect(member)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          {member.profile_photo ? (
                            <img
                              src={member.profile_photo}
                              alt={member.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {member.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-sm text-gray-600">{member.whatsapp || member.phone || '-'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedMember && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                      {selectedMember.profile_photo ? (
                        <img
                          src={selectedMember.profile_photo}
                          alt={selectedMember.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-medium text-lg">
                          {selectedMember.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{selectedMember.full_name}</p>
                        <p className="text-xs text-gray-600">{selectedMember.whatsapp || selectedMember.phone || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>{t('prayerRequests.category')} *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healing">{t('prayerRequests.categories.healing')}</SelectItem>
                      <SelectItem value="family">{t('prayerRequests.categories.family')}</SelectItem>
                      <SelectItem value="work">{t('prayerRequests.categories.work')}</SelectItem>
                      <SelectItem value="financial">{t('prayerRequests.categories.financial')}</SelectItem>
                      <SelectItem value="spiritual">{t('prayerRequests.categories.spiritual')}</SelectItem>
                      <SelectItem value="guidance">{t('prayerRequests.categories.guidance')}</SelectItem>
                      <SelectItem value="thanksgiving">{t('prayerRequests.categories.thanksgiving')}</SelectItem>
                      <SelectItem value="other">{t('prayerRequests.categories.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isEdit && (
                  <div>
                    <Label>{t('prayerRequests.status')}</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">{t('prayerRequests.statuses.new')}</SelectItem>
                        <SelectItem value="prayed">{t('prayerRequests.statuses.prayed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => navigate('/prayer-requests')}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? t('common.update') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
