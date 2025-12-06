/**
 * AddCompanionModal - Modal for adding companions to group registration
 *
 * Two tabs:
 * 1. Search Existing Member - by phone or name
 * 2. New Guest - create a new pre-visitor
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  User,
  Phone,
  UserPlus,
  X,
  AlertCircle,
  Check,
  Loader2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import kioskApi from '../../services/kioskApi';

const AddCompanionModal = ({
  open,
  onClose,
  onAdd,
  churchId,
  existingAttendees = [], // To check for duplicates
  eventRsvpIds = [] // Members already registered for event
}) => {
  const { t } = useTranslation('kiosk');
  const [activeTab, setActiveTab] = useState('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // New guest state
  const [newGuest, setNewGuest] = useState({
    full_name: '',
    phone: '',
    gender: '',
    date_of_birth: ''
  });
  const [phoneCheckResult, setPhoneCheckResult] = useState(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [newGuestError, setNewGuestError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      setNewGuest({ full_name: '', phone: '', gender: '', date_of_birth: '' });
      setPhoneCheckResult(null);
      setNewGuestError('');
      setActiveTab('search');
    }
  }, [open]);

  // Check if member is already in attendee list
  const isInAttendeeList = (memberId) => {
    return existingAttendees.some(a => a.member_id === memberId);
  };

  // Check if member is already registered for event
  const isAlreadyRegistered = (memberId) => {
    return eventRsvpIds.includes(memberId);
  };

  // Debounce timer ref
  const searchTimerRef = useRef(null);

  // Search for existing members with debounce
  const performSearch = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      if (query && query.length > 0 && query.length < 3) {
        setSearchError(t('group_registration.search_min_chars', 'Enter at least 3 characters'));
      } else {
        setSearchError('');
      }
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const results = await kioskApi.searchMembers(query, churchId);
      console.log('Search results:', results); // Debug: see what fields are returned
      setSearchResults(results || []);
      if (!results || results.length === 0) {
        setSearchError(t('group_registration.no_results', 'No members found'));
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(t('group_registration.search_error', 'Search failed'));
    } finally {
      setSearching(false);
    }
  }, [churchId, t]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 400); // 400ms debounce

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Add existing member
  const handleAddExisting = (member) => {
    onAdd({
      type: 'existing',
      member_id: member.id,
      member_name: member.full_name,
      phone: member.phone_whatsapp,
      photo: member.photo_url || member.photo_thumbnail_url || member.photo,
      isNew: false
    });
    onClose();
  };

  // Check phone number when entered for new guest
  const handlePhoneBlur = async () => {
    const phone = newGuest.phone.trim();
    if (!phone || phone.length < 10) {
      setPhoneCheckResult(null);
      return;
    }

    setCheckingPhone(true);
    setPhoneCheckResult(null);

    try {
      const member = await kioskApi.lookupMemberByPhone(phone, churchId);
      if (member) {
        setPhoneCheckResult({
          type: 'existing',
          member: member
        });
      } else {
        setPhoneCheckResult({
          type: 'new',
          message: t('group_registration.phone_available', 'Phone number available')
        });
      }
    } catch (err) {
      console.error('Phone check error:', err);
    } finally {
      setCheckingPhone(false);
    }
  };

  // Add as existing member (when phone found existing)
  const handleAddAsExisting = () => {
    if (phoneCheckResult?.member) {
      handleAddExisting(phoneCheckResult.member);
    }
  };

  // Add new guest
  const handleAddNewGuest = () => {
    // Validation - name, phone, and gender are required
    if (!newGuest.full_name.trim()) {
      setNewGuestError(t('group_registration.name_required', 'Full name is required'));
      return;
    }

    if (!newGuest.phone.trim()) {
      setNewGuestError(t('group_registration.phone_required', 'Phone number is required'));
      return;
    }

    if (!newGuest.gender) {
      setNewGuestError(t('group_registration.gender_required', 'Please select a gender'));
      return;
    }

    // If phone exists and matches existing member, warn
    if (phoneCheckResult?.type === 'existing') {
      setNewGuestError(t('group_registration.use_existing_member', 'This phone belongs to an existing member. Click "Add" next to their name.'));
      return;
    }

    setNewGuestError('');

    // Generate temp ID for new guest
    const tempId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    onAdd({
      type: 'new',
      tempId: tempId,
      full_name: newGuest.full_name.trim(),
      member_name: newGuest.full_name.trim(),
      phone: newGuest.phone.trim(),
      gender: newGuest.gender,
      date_of_birth: newGuest.date_of_birth || null,
      isNew: true
    });
    onClose();
  };

  // Check if form is valid for enabling button
  const isNewGuestFormValid = newGuest.full_name.trim() &&
                               newGuest.phone.trim() &&
                               newGuest.gender &&
                               phoneCheckResult?.type !== 'existing';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} />
            {t('group_registration.add_companion', 'Add Companion')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search size={16} className="mr-2" />
              {t('group_registration.search_existing', 'Search Existing')}
            </TabsTrigger>
            <TabsTrigger value="new">
              <User size={16} className="mr-2" />
              {t('group_registration.new_guest', 'New Guest')}
            </TabsTrigger>
          </TabsList>

          {/* Search Existing Tab */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('group_registration.search_placeholder', 'Search by name or phone')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {searchError && (
              <p className="text-sm text-gray-500 text-center">{searchError}</p>
            )}

            {/* Search Results */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <AnimatePresence>
                {searchResults.map((member) => {
                  const inList = isInAttendeeList(member.id);
                  const registered = isAlreadyRegistered(member.id);

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border
                        ${inList || registered ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-blue-300'}
                      `}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {(member.photo_url || member.photo_thumbnail_url || member.photo) ? (
                          <img src={member.photo_url || member.photo_thumbnail_url || member.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
                        {member.phone_whatsapp && (
                          <p className="text-sm text-gray-500 truncate">{member.phone_whatsapp}</p>
                        )}
                      </div>
                      {inList ? (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          {t('group_registration.already_in_list', 'In list')}
                        </span>
                      ) : registered ? (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          {t('group_registration.already_registered', 'Registered')}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAddExisting(member)}
                        >
                          {t('group_registration.add_to_list', 'Add')}
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* New Guest Tab */}
          <TabsContent value="new" className="space-y-4 mt-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="guest-name">
                {t('group_registration.guest_name', 'Full Name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="guest-name"
                value={newGuest.full_name}
                onChange={(e) => setNewGuest(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="guest-phone">
                {t('group_registration.guest_phone', 'Phone Number')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="guest-phone"
                type="tel"
                value={newGuest.phone}
                onChange={(e) => {
                  setNewGuest(prev => ({ ...prev, phone: e.target.value }));
                  setPhoneCheckResult(null);
                }}
                onBlur={handlePhoneBlur}
                placeholder="+628123456789"
                required
              />
              <p className="text-xs text-gray-500">
                {t('group_registration.phone_hint', 'Required for sending event ticket via WhatsApp')}
              </p>
              {checkingPhone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking...
                </p>
              )}
              {phoneCheckResult?.type === 'existing' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">
                      {t('group_registration.phone_exists', 'This phone is registered to {{name}}', {
                        name: phoneCheckResult.member.full_name
                      })}
                    </span>
                    <Button size="sm" variant="outline" onClick={handleAddAsExisting}>
                      {t('group_registration.add_instead', 'Add {{name}}', {
                        name: phoneCheckResult.member.full_name.split(' ')[0]
                      })}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {phoneCheckResult?.type === 'new' && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {phoneCheckResult.message}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="guest-gender">
                {t('group_registration.guest_gender', 'Gender')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newGuest.gender}
                onValueChange={(value) => setNewGuest(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select', 'Select...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('common.male', 'Male')}</SelectItem>
                  <SelectItem value="female">{t('common.female', 'Female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="guest-dob">
                {t('group_registration.guest_dob', 'Date of Birth')}
              </Label>
              <Input
                id="guest-dob"
                type="date"
                value={newGuest.date_of_birth}
                onChange={(e) => setNewGuest(prev => ({ ...prev, date_of_birth: e.target.value }))}
              />
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t('group_registration.dob_hint', 'It would be very helpful if you fill this in')}
              </p>
            </div>

            {/* Error */}
            {newGuestError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{newGuestError}</AlertDescription>
              </Alert>
            )}

            {/* Add Button */}
            <Button
              className="w-full"
              onClick={handleAddNewGuest}
              disabled={!isNewGuestFormValid}
            >
              <UserPlus size={18} className="mr-2" />
              {t('group_registration.add_to_list', 'Add to List')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanionModal;
