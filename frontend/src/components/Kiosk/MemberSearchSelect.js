/**
 * MemberSearchSelect - Kiosk component for selecting a member
 *
 * Options:
 * 1. "This is me" (if showThisIsMe=true)
 * 2. "Search existing member"
 * 3. "Enter manually" (for new people not in database)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, User, UserPlus, Check, X, Loader2, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSearchMembers } from '../../hooks/useKiosk';

// Helper to render member photo or fallback icon
const MemberPhoto = ({ photoUrl, size = 'md', bgColor = 'bg-gray-100', iconColor = 'text-gray-500' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClasses[size]} rounded-full object-cover`}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center`}>
      <User className={`${iconSizes[size]} ${iconColor}`} />
    </div>
  );
};

const MemberSearchSelect = ({
  churchId,
  currentMember, // The logged-in member (for "This is me" option)
  value, // { name, phone, member_id, is_baptized, mode, gender, birth_date, photo_url, photo_preview }
  onChange,
  showThisIsMe = false,
  showBaptized = true,
  showGender = false, // Show gender field in manual entry
  showBirthDate = false, // Show birth date field in manual entry
  showPhotoUpload = false, // Show photo capture/upload in manual entry
  label = '',
  placeholder = '',
  excludeMemberIds = [], // Array of member IDs to exclude from search
  onPhotoUpload, // Optional: async function to upload photo to server
}) => {
  const { t } = useTranslation('kiosk');
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(value?.mode || null); // null, 'self', 'search', 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Sync internal mode state with external value.mode
  useEffect(() => {
    if (value?.mode !== mode) {
      setMode(value?.mode || null);
    }
  }, [value?.mode]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search members
  const { data: searchResults, isLoading: isSearching } = useSearchMembers(
    debouncedQuery,
    churchId,
    { enabled: mode === 'search' && debouncedQuery.length >= 3 }
  );

  // Filter out excluded members
  const filteredResults = searchResults?.filter(
    (m) => !excludeMemberIds.includes(m.id)
  ) || [];

  const handleSelectSelf = () => {
    if (!currentMember) return;
    setMode('self');
    onChange({
      name: currentMember.full_name,
      phone: currentMember.phone_whatsapp || currentMember.phone || '',
      member_id: currentMember.id,
      is_baptized: value?.is_baptized || false,
      mode: 'self',
    });
  };

  const handleStartSearch = () => {
    setMode('search');
    setSearchQuery('');
  };

  const handleStartManual = () => {
    setMode('manual');
    onChange({
      name: '',
      phone: '',
      member_id: null,
      is_baptized: value?.is_baptized || false,
      mode: 'manual',
    });
  };

  const handleSelectMember = (member) => {
    // Include photo_url and set mode to 'selected' (not 'search')
    // This ensures the selected state is shown and photo is preserved
    onChange({
      name: member.full_name,
      phone: member.phone_whatsapp || member.phone || '',
      member_id: member.id,
      photo_url: member.photo_url || '', // Save the member's photo
      is_baptized: value?.is_baptized || false,
      mode: 'selected', // Must match setMode below to avoid useEffect conflict
    });
    setMode('selected');
  };

  const handleClear = () => {
    setMode(null);
    setSearchQuery('');
    onChange({
      name: '',
      phone: '',
      member_id: null,
      is_baptized: false,
      mode: null,
    });
  };

  const handleBaptizedChange = (checked) => {
    onChange({
      ...value,
      is_baptized: checked,
    });
  };

  const handleManualChange = (field, fieldValue) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  // Handle photo capture/upload
  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;

      // Update with preview immediately
      onChange({
        ...value,
        photo_preview: base64,
      });

      // If onPhotoUpload provided, upload to server
      if (onPhotoUpload) {
        setIsUploading(true);
        try {
          const result = await onPhotoUpload(base64.split(',')[1]);
          onChange({
            ...value,
            photo_preview: base64,
            photo_url: result.photo_url,
          });
        } catch (error) {
          console.error('Photo upload error:', error);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onChange({
      ...value,
      photo_preview: null,
      photo_url: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show selected member (for self, search-selected)
  if (mode === 'self' || mode === 'selected') {
    // Get photo URL - for 'self' use currentMember's photo, for 'selected' use the selected member's photo
    const photoUrl = value?.photo_url || (mode === 'self' ? currentMember?.photo_url : null);

    return (
      <div className="space-y-3">
        {label && <Label className="text-lg font-semibold block">{label}</Label>}

        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MemberPhoto
                photoUrl={photoUrl}
                size="md"
                bgColor="bg-green-100"
                iconColor="text-green-600"
              />
              <div>
                <p className="font-semibold text-lg text-gray-900">{value?.name}</p>
                <p className="text-gray-600">{value?.phone}</p>
                {mode === 'self' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {t('common.thisIsMe', 'This is me')}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {showBaptized && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Checkbox
              id={`baptized-${label}`}
              checked={value?.is_baptized || false}
              onCheckedChange={handleBaptizedChange}
              className="w-5 h-5"
            />
            <Label htmlFor={`baptized-${label}`} className="text-base cursor-pointer">
              {t('common.isBaptized', 'Has been baptized')}
            </Label>
          </div>
        )}
      </div>
    );
  }

  // Manual entry mode
  if (mode === 'manual') {
    return (
      <div className="space-y-3">
        {label && (
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">{label}</Label>
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-gray-500">
              <X className="w-4 h-4 mr-1" /> {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
            <UserPlus className="w-4 h-4" />
            {t('common.enterManually', 'Enter details manually')}
          </div>

          {/* Photo Upload Section */}
          {showPhotoUpload && (
            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('common.profilePhoto', 'Profile Photo')}
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  value?.photo_preview
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {value?.photo_preview ? (
                  <div className="relative">
                    <img
                      src={value.photo_preview}
                      alt=""
                      className="w-20 h-20 object-cover rounded-full"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto();
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-1" />
                    <span className="text-sm text-gray-500">
                      {t('common.tapToCapture', 'Tap to take/upload photo')}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-base font-medium mb-2 block">
              {t('common.fullName', 'Full Name')} *
            </Label>
            <Input
              value={value?.name || ''}
              onChange={(e) => handleManualChange('name', e.target.value)}
              placeholder={placeholder || t('common.namePlaceholder', 'Enter full name')}
              className="h-12 text-lg rounded-xl"
            />
          </div>

          <div>
            <Label className="text-base font-medium mb-2 block">
              {t('common.phone', 'Phone Number')} *
            </Label>
            <Input
              value={value?.phone || ''}
              onChange={(e) => handleManualChange('phone', e.target.value)}
              placeholder="+62812..."
              className="h-12 text-lg rounded-xl"
            />
          </div>

          {/* Gender Select */}
          {showGender && (
            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('common.gender', 'Gender')}
              </Label>
              <Select
                value={value?.gender || ''}
                onValueChange={(v) => handleManualChange('gender', v)}
              >
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder={t('common.selectGender', 'Select gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('common.male', 'Male')}</SelectItem>
                  <SelectItem value="female">{t('common.female', 'Female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Birth Date */}
          {showBirthDate && (
            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('common.birthDate', 'Date of Birth')}
              </Label>
              <Input
                type="date"
                value={value?.birth_date || ''}
                onChange={(e) => handleManualChange('birth_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="h-12 text-base rounded-xl"
              />
            </div>
          )}

          {showBaptized && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
              <Checkbox
                id={`baptized-manual-${label}`}
                checked={value?.is_baptized || false}
                onCheckedChange={handleBaptizedChange}
                className="w-5 h-5"
              />
              <Label htmlFor={`baptized-manual-${label}`} className="text-base cursor-pointer">
                {t('common.isBaptized', 'Has been baptized')}
              </Label>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Search mode
  if (mode === 'search') {
    return (
      <div className="space-y-3">
        {label && (
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">{label}</Label>
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-gray-500">
              <X className="w-4 h-4 mr-1" /> {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.searchPlaceholder', 'Search by name or phone...')}
            className="h-14 text-lg pl-12 rounded-xl"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          <AnimatePresence>
            {debouncedQuery.length >= 3 && filteredResults.length === 0 && !isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-6 text-gray-500"
              >
                <p>{t('common.noResults', 'No members found')}</p>
                <Button
                  variant="link"
                  onClick={handleStartManual}
                  className="mt-2 text-blue-600"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('common.enterManually', 'Enter manually instead')}
                </Button>
              </motion.div>
            )}

            {filteredResults.map((member) => (
              <motion.button
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleSelectMember(member)}
                className="w-full flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <MemberPhoto
                  photoUrl={member.photo_url}
                  size="md"
                  bgColor="bg-gray-100"
                  iconColor="text-gray-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{member.full_name}</p>
                  <p className="text-sm text-gray-600">{member.phone_whatsapp || member.phone}</p>
                </div>
                <Check className="w-5 h-5 text-gray-300" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {debouncedQuery.length < 3 && (
          <p className="text-center text-gray-500 text-sm py-4">
            {t('common.searchHint', 'Type at least 3 characters to search')}
          </p>
        )}

        <div className="border-t pt-3">
          <Button
            variant="outline"
            onClick={handleStartManual}
            className="w-full h-12 text-base rounded-xl"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {t('common.notInList', "Person not in list? Enter manually")}
          </Button>
        </div>
      </div>
    );
  }

  // Initial state - show options
  return (
    <div className="space-y-3">
      {label && <Label className="text-lg font-semibold block">{label}</Label>}

      <div className="grid gap-3">
        {/* This is me option */}
        {showThisIsMe && currentMember && (
          <button
            onClick={handleSelectSelf}
            className="flex items-center gap-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl hover:border-amber-400 transition-colors text-left"
          >
            {currentMember.photo_url ? (
              <img
                src={currentMember.photo_url}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-amber-600" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-lg text-gray-900">{currentMember.full_name}</p>
              <p className="text-sm text-amber-700">{t('common.thisIsMe', 'This is me')}</p>
            </div>
            <Check className="w-6 h-6 text-amber-500" />
          </button>
        )}

        {/* Search member option */}
        <button
          onClick={handleStartSearch}
          className="flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-colors text-left"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-gray-900">
              {t('common.searchMember', 'Search church member')}
            </p>
            <p className="text-sm text-blue-700">
              {t('common.searchMemberHint', 'Find by name or phone')}
            </p>
          </div>
        </button>

        {/* Manual entry option */}
        <button
          onClick={handleStartManual}
          className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-400 transition-colors text-left"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-gray-900">
              {t('common.enterManually', 'Enter manually')}
            </p>
            <p className="text-sm text-gray-600">
              {t('common.enterManuallyHint', 'For new people not in our database')}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default MemberSearchSelect;
