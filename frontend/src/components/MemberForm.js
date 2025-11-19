import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

export default function MemberForm({ formData, setFormData, member = null }) {
  const { t } = useTranslation();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Show photo and document if editing existing member */}
      {member && (member.photo_base64 || member.personal_document) && (
        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
          {member.photo_base64 && (
            <div className="space-y-2">
              <Label>{t('members.photo')}</Label>
              <div className="flex items-center gap-3">
                <img 
                  src={member.photo_base64} 
                  alt={member.full_name || 'Member photo'}
                  className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                />
                <span className="text-sm text-gray-600">{t('members.photoUploaded')}</span>
              </div>
            </div>
          )}
          {member.personal_document && (
            <div className="space-y-2">
              <Label>{t('members.personalDocument')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {member.personal_document}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">{t('members.firstName')} *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">{t('members.lastName')} *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone_whatsapp">{t('members.phone')} *</Label>
          <Input
            id="phone_whatsapp"
            placeholder={t('members.phonePlaceholder')}
            value={formData.phone_whatsapp}
            onChange={(e) => handleChange('phone_whatsapp', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">{t('members.dateOfBirth')}</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">{t('members.gender')}</Label>
          <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('members.selectGender')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t('members.male')}</SelectItem>
              <SelectItem value="female">{t('members.female')}</SelectItem>
              <SelectItem value="other">{t('members.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="marital_status">{t('members.maritalStatus')}</Label>
          <Select value={formData.marital_status} onValueChange={(value) => handleChange('marital_status', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('members.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t('members.single')}</SelectItem>
              <SelectItem value="married">{t('members.married')}</SelectItem>
              <SelectItem value="divorced">{t('members.divorced')}</SelectItem>
              <SelectItem value="widowed">{t('members.widowed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="address">{t('members.address')}</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baptism_date">{t('members.baptismDate')}</Label>
          <Input
            id="baptism_date"
            type="date"
            value={formData.baptism_date}
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
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
