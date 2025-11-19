import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { useMemberStatuses } from '../hooks/useSettings';
import { FileText, Upload, X } from 'lucide-react';

export default function MemberForm({ formData, setFormData, member = null }) {
  const { t } = useTranslation();
  const { data: memberStatuses = [], isLoading: statusesLoading } = useMemberStatuses();
  const [photoPreview, setPhotoPreview] = useState(member?.photo_base64 || null);
  const [documentPreview, setDocumentPreview] = useState(member?.personal_document_base64 || null);
  const [documentName, setDocumentName] = useState(member?.personal_document || '');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setPhotoPreview(base64);
        handleChange('photo_base64', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    handleChange('photo_base64', '');
  };

  // Debug logging
  React.useEffect(() => {
    console.log('[DEBUG] MemberForm - formData.member_status:', formData.member_status);
    console.log('[DEBUG] MemberForm - available statuses:', memberStatuses.map(s => s.name));
    console.log('[DEBUG] MemberForm - statusesLoading:', statusesLoading);
  }, [formData.member_status, memberStatuses, statusesLoading]);

  return (
    <div className="space-y-4">
      {/* Photo Upload Section */}
      <div className="border-b pb-4">
        <Label>{t('members.photo')}</Label>
        <div className="flex items-center gap-4 mt-2">
          {photoPreview ? (
            <>
              <img 
                src={photoPreview} 
                alt="Preview"
                className="h-20 w-20 rounded-lg object-cover border-2 border-gray-200"
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-600">
                  {member ? t('members.photoUploaded') : t('members.photoSelected')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removePhoto}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('common.remove')}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('photo-upload').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('members.uploadPhoto')}
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-1">{t('members.photoHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Display (Read-only for imports) */}
      {member && member.personal_document && (
        <div className="border-b pb-4">
          <Label>{t('members.personalDocument')}</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-mono text-gray-700">{member.personal_document}</span>
            </div>
            {member.personal_document_base64 ? (
              <div className="flex gap-3">
                <a 
                  href={member.personal_document_base64}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t('members.viewDocument')}
                </a>
                <span className="text-gray-300">|</span>
                <a 
                  href={member.personal_document_base64}
                  download={member.personal_document}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t('members.downloadDocument')}
                </a>
              </div>
            ) : (
              <span className="text-xs text-gray-500">{t('members.documentNotAvailable')}</span>
            )}
          </div>
        </div>
      )}
      
      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">{t('members.firstName')} *</Label>
          <Input
            id="first_name"
            value={formData.first_name || ''}
            onChange={(e) => handleChange('first_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">{t('members.lastName')} *</Label>
          <Input
            id="last_name"
            value={formData.last_name || ''}
            onChange={(e) => handleChange('last_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone_whatsapp">{t('members.phone')} *</Label>
          <Input
            id="phone_whatsapp"
            placeholder={t('members.phonePlaceholder')}
            value={formData.phone_whatsapp || ''}
            onChange={(e) => handleChange('phone_whatsapp', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">{t('members.dateOfBirth')}</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth || ''}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">{t('members.gender')}</Label>
          <Select value={formData.gender || ''} onValueChange={(value) => handleChange('gender', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('members.selectGender')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t('members.male')}</SelectItem>
              <SelectItem value="female">{t('members.female')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="marital_status">{t('members.maritalStatus')}</Label>
          <Select value={formData.marital_status || ''} onValueChange={(value) => handleChange('marital_status', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('members.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notmarried">{t('members.notmarried')}</SelectItem>
              <SelectItem value="married">{t('members.married')}</SelectItem>
              <SelectItem value="widow">{t('members.widow')}</SelectItem>
              <SelectItem value="widower">{t('members.widower')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="member_status">{t('members.memberStatus')}</Label>
          {statusesLoading ? (
            <Input value={formData.member_status || ''} disabled className="bg-gray-50" />
          ) : (
            <Select 
              value={formData.member_status || ''} 
              onValueChange={(value) => {
                console.log('[DEBUG] Member status selected:', value);
                handleChange('member_status', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('members.selectMemberStatus')}>
                  {formData.member_status || t('members.selectMemberStatus')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {memberStatuses.length > 0 ? (
                  memberStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      {status.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>{t('common.loading')}</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="address">{t('members.address')}</Label>
          <Input
            id="address"
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baptism_date">{t('members.baptismDate')}</Label>
          <Input
            id="baptism_date"
            type="date"
            value={formData.baptism_date || ''}
            onChange={(e) => handleChange('baptism_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          {/* Empty space for grid alignment */}
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="notes">{t('members.notes')}</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
