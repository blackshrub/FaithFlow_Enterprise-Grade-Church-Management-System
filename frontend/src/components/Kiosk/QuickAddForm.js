import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera, SwitchCamera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { membersAPI, eventsAPI } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Webcam from 'react-webcam';

function QuickAddForm({ eventId, sessionId, onSuccess, onClose }) {
  const { t } = useTranslation();
  const { church } = useAuth();
  const webcamRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone_whatsapp: '',
    gender: '',
    date_of_birth: '',
  });

  const [photo, setPhoto] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [countdown, setCountdown] = useState(0);
  const [showCamera, setShowCamera] = useState(false);

  const addMemberMutation = useMutation({
    mutationFn: (data) => membersAPI.quickAdd(data),
    onSuccess: async (response) => {
      const member = response.data;
      
      // Auto RSVP and check-in
      await eventsAPI.registerRSVP(eventId, {
        member_id: member.id,
        session_id: sessionId
      });
      
      await eventsAPI.checkIn(eventId, {
        member_id: member.id,
        session_id: sessionId
      });
      
      onSuccess(member);
      toast.success(t('events.kiosk.onsiteRSVPSuccess'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add visitor');
    },
  });

  const handleCapturePhoto = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && photo === null && showCamera) {
      // Capture!
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        setPhoto(imageSrc);
        setShowCamera(false);
      }
    }
  }, [countdown]);

  const handleSubmit = (e) => {
    e.preventDefault();
    addMemberMutation.mutate({
      church_id: church.id,
      ...formData,
      photo_base64: photo
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('events.kiosk.quickAddForm.title')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('events.kiosk.quickAddForm.subtitle')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Photo Capture */}
          <div className="space-y-2">
            <Label>{t('events.kiosk.quickAddForm.takePhoto')}</Label>
            {!showCamera && !photo && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="w-full h-32"
              >
                <Camera className="h-8 w-8 mr-2" />
                {t('events.kiosk.quickAddForm.takePhoto')}
              </Button>
            )}

            {showCamera && (
              <div className="relative">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  mirrored={facingMode === 'user'}
                  className="w-full rounded-lg"
                  videoConstraints={{ facingMode }}
                />
                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-9xl font-bold animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="bg-white/90"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="w-full mt-2"
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? t('events.kiosk.quickAddForm.smile') : t('events.kiosk.quickAddForm.capturePhoto')}
                </Button>
              </div>
            )}

            {photo && (
              <div className="relative">
                <img src={photo} alt="Captured" className="w-full rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setPhoto(null);
                    setShowCamera(true);
                  }}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('events.kiosk.quickAddForm.retakePhoto')}
                </Button>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{t('events.kiosk.quickAddForm.fullName')} *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('events.kiosk.quickAddForm.fullNamePlaceholder')}
                required
                className="h-12 text-lg"
              />
            </div>

            <div className="col-span-2">
              <Label>{t('events.kiosk.quickAddForm.phone')}</Label>
              <Input
                value={formData.phone_whatsapp}
                onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                placeholder={t('events.kiosk.quickAddForm.phonePlaceholder')}
                className="h-12 text-lg"
              />
            </div>

            <div>
              <Label>{t('events.kiosk.quickAddForm.gender')} *</Label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md h-12 text-lg"
                required
              >
                <option value="">{t('events.kiosk.quickAddForm.gender')}</option>
                <option value="Male">{t('events.kiosk.quickAddForm.male')}</option>
                <option value="Female">{t('events.kiosk.quickAddForm.female')}</option>
              </select>
            </div>

            <div>
              <Label>{t('events.kiosk.quickAddForm.dateOfBirth')}</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="h-12 text-lg"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-14 text-lg">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={addMemberMutation.isPending} className="flex-1 h-14 text-lg">
              {addMemberMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddForm;
