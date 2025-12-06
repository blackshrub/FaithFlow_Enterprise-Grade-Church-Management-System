import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { useMemberStatuses } from '../hooks/useSettings';
import { FileText, Upload, X, Loader2, ScanFace, CheckCircle, AlertCircle, QrCode, Copy } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognitionService';

export default function MemberForm({ formData, setFormData, member = null }) {
  const { t } = useTranslation();
  const { data: memberStatuses = [], isLoading: statusesLoading } = useMemberStatuses();
  // Prefer SeaweedFS URL over base64
  const [photoPreview, setPhotoPreview] = useState(member?.photo_url || member?.photo_base64 || null);
  const [documentPreview, setDocumentPreview] = useState(member?.personal_document_base64 || null);
  const [documentName, setDocumentName] = useState(member?.personal_document || '');

  // Update previews when member prop changes (fixes issue when editing different members)
  useEffect(() => {
    if (member) {
      setPhotoPreview(member.photo_url || member.photo_base64 || null);
      setDocumentPreview(member.personal_document_base64 || null);
      setDocumentName(member.personal_document || '');
    } else {
      // Reset when member is cleared (e.g., when closing dialog)
      setPhotoPreview(null);
      setDocumentPreview(null);
      setDocumentName('');
    }
  }, [member?.id, member?.photo_url, member?.photo_base64, member?.personal_document_base64, member?.personal_document]);

  // Face detection state - check if member already has face descriptors
  // Use has_face_descriptors boolean (from list projection) OR check face_descriptors array length
  const hasFaceDescriptors = member?.face_descriptors?.length > 0 ||
                              formData?.face_descriptors?.length > 0 ||
                              member?.has_face_descriptors ||
                              formData?.has_face_descriptors;
  const [faceDetectionStatus, setFaceDetectionStatus] = useState(hasFaceDescriptors ? 'success' : 'idle'); // idle, detecting, success, no_face, error
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  // Initialize face recognition service
  useEffect(() => {
    faceRecognitionService.initialize().catch(console.error);
  }, []);

  // Update face detection status when formData changes (for existing members)
  useEffect(() => {
    const hasData = formData?.face_descriptors?.length > 0 || formData?.has_face_descriptors;
    if (hasData && faceDetectionStatus === 'idle') {
      setFaceDetectionStatus('success');
    }
  }, [formData?.face_descriptors, formData?.has_face_descriptors]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        setPhotoPreview(base64);
        handleChange('photo_base64', base64);

        // Generate face descriptor from the uploaded photo
        setFaceDetectionStatus('detecting');
        setFaceDescriptor(null);

        try {
          // Create object URL for the file
          const objectUrl = URL.createObjectURL(file);
          const descriptor = await faceRecognitionService.generateDescriptorFromUrl(objectUrl);
          URL.revokeObjectURL(objectUrl);

          if (descriptor) {
            setFaceDescriptor(descriptor);
            setFaceDetectionStatus('success');
            // Store the descriptor as a new face entry
            const newFaceEntry = {
              descriptor: descriptor,
              captured_at: new Date().toISOString(),
              source: 'admin_upload'
            };
            // Update form data with the face descriptor
            handleChange('face_descriptors', [newFaceEntry]);
            console.log('[MemberForm] Face descriptor generated successfully');
          } else {
            setFaceDetectionStatus('no_face');
            // Clear any existing face descriptors if no face found
            handleChange('face_descriptors', []);
            console.log('[MemberForm] No face detected in uploaded photo');
          }
        } catch (error) {
          console.error('[MemberForm] Face detection error:', error);
          setFaceDetectionStatus('error');
          handleChange('face_descriptors', []);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    handleChange('photo_base64', '');
    // Also clear face data
    setFaceDetectionStatus('idle');
    setFaceDescriptor(null);
    handleChange('face_descriptors', []);
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setDocumentPreview(base64);
        handleChange('personal_document_base64', base64);
        handleChange('personal_document', file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocument = () => {
    setDocumentPreview(null);
    setDocumentName('');
    handleChange('personal_document_base64', '');
    handleChange('personal_document', '');
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
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover border-2 border-gray-200"
                />
                {/* Face detection status overlay */}
                {faceDetectionStatus === 'detecting' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-600">
                  {member ? t('members.photoUploaded') : t('members.photoSelected')}
                </span>
                {/* Face detection status message */}
                {faceDetectionStatus === 'detecting' && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('members.detectingFace') || 'Detecting face...'}
                  </span>
                )}
                {faceDetectionStatus === 'success' && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {t('members.faceDetected') || 'Face detected for check-in'}
                  </span>
                )}
                {faceDetectionStatus === 'no_face' && (
                  <span className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t('members.noFaceDetected') || 'No face detected'}
                  </span>
                )}
                {faceDetectionStatus === 'error' && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t('members.faceDetectionError') || 'Face detection failed'}
                  </span>
                )}
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

      {/* Document Upload Section */}
      <div className="border-b pb-4">
        <Label>{t('members.personalDocument')}</Label>
        <div className="flex items-center gap-4 mt-2">
          {documentPreview || documentName ? (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-gray-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-mono">{documentName}</span>
                  {documentPreview && (
                    <div className="flex gap-2 mt-1">
                      <a 
                        href={documentPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('members.viewDocument')}
                      </a>
                      <span className="text-gray-300">|</span>
                      <a 
                        href={documentPreview}
                        download={documentName}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('members.downloadDocument')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeDocument}
              >
                <X className="h-4 w-4 mr-1" />
                {t('common.remove')}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <input
                  type="file"
                  id="document-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <label htmlFor="document-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('document-upload').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('members.uploadDocument')}
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-1">{t('members.documentHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personal ID/QR Code Section - Read-only, only for existing members */}
      {member && formData.personal_id_code && (
        <div className="border-b pb-4">
          <Label>{t('members.personalIdCode') || 'Personal ID / QR Code'}</Label>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
              <QrCode className="h-5 w-5 text-blue-600" />
              <span className="font-mono text-lg font-semibold text-gray-900">
                {formData.personal_id_code}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(formData.personal_id_code);
              }}
              title={t('common.copy') || 'Copy'}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('members.personalIdHint') || 'Unique identifier for kiosk check-in and member lookup'}
          </p>
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
          <Select value={formData.gender || undefined} onValueChange={(value) => handleChange('gender', value)}>
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
          <Select value={formData.marital_status || undefined} onValueChange={(value) => handleChange('marital_status', value)}>
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
              value={formData.member_status || undefined}
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
                  memberStatuses
                    .filter((status) => status.name && status.name.trim() !== '')
                    .map((status) => (
                      <SelectItem key={status.id} value={status.name}>
                        {status.name}
                      </SelectItem>
                    ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">{t('common.loading')}</div>
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
