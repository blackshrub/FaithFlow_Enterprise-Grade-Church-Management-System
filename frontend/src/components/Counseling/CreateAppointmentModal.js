/**
 * Create Appointment Modal for Counseling
 * 
 * Staff creates appointments on behalf of members
 * Flow: Select Member → Select Date → Select Slot → Fill Details → Confirm
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Calendar, Clock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import { useSearchMembers } from '../../hooks/useCounseling';
import { useCreateAppointment } from '../../hooks/useCounseling';
import MemberAvatar from '../MemberAvatar';
import api from '../../services/api';
import { format, addDays, startOfDay } from 'date-fns';

const CreateAppointmentModal = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1); // 1: Member, 2: Date/Slot, 3: Details
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'counseling',
    urgency: 'normal',
    topic: '',
    description: '',
    preferred_channel: 'in_person',
    preferred_location: '',
    contact_phone: ''
  });
  
  const createMutation = useCreateAppointment();
  
  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => 
    addDays(startOfDay(new Date()), i + 1)
  );
  
  useEffect(() => {
    if (selectedDate) {
      loadSlotsForDate(selectedDate);
    }
  }, [selectedDate]);
  
  const loadSlotsForDate = async (date) => {
    setLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await api.get('/v1/counseling/slots', {
        params: {
          date_from: dateStr,
          date_to: dateStr,
          status: 'open'
        }
      });
      setAvailableSlots(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };
  
  const handleSearchMembers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const response = await api.get('/members/', {
        params: { search: searchTerm, limit: 10 }
      });
      setSearchResults(response.data?.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };
  
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setFormData(prev => ({
      ...prev,
      contact_phone: member.phone_whatsapp || member.phone || ''
    }));
    setStep(2);
  };
  
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };
  
  const handleSubmit = async () => {
    if (!selectedMember || !selectedSlot) return;
    
    try {
      await createMutation.mutateAsync({
        member_id: selectedMember.id,
        slot_id: selectedSlot.id,
        ...formData
      });
      
      toast({
        title: t('counseling.success_appointment_created')
      });
      
      handleClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create appointment',
        variant: 'destructive'
      });
    }
  };
  
  const handleClose = () => {
    setStep(1);
    setSearchTerm('');
    setSearchResults([]);
    setSelectedMember(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setFormData({
      type: 'counseling',
      urgency: 'normal',
      topic: '',
      description: '',
      preferred_channel: 'in_person',
      preferred_location: '',
      contact_phone: ''
    });
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('counseling.create_appointment')}</span>
            <span className="text-sm text-gray-500">Step {step} of 3</span>
          </DialogTitle>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {/* Step 1: Select Member */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-lg font-semibold">{t('counseling.select_member')}</Label>
                <p className="text-sm text-gray-600">Search and select the member who needs counseling</p>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder={t('counseling.search_member')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchMembers()}
                  className="flex-1"
                />
                <Button onClick={handleSearchMembers}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <MemberAvatar
                        member={member}
                        size="md"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-gray-500">
                          {member.phone_whatsapp || member.email}
                        </div>
                      </div>
                      <User className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {/* Step 2: Select Date & Slot */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <MemberAvatar
                  member={selectedMember}
                  size="sm"
                />
                <div>
                  <div className="font-medium">{selectedMember?.full_name}</div>
                  <div className="text-sm text-gray-600">Selected Member</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="ml-auto"
                >
                  Change
                </Button>
              </div>
              
              <div>
                <Label className="text-lg font-semibold">{t('counseling.select_date')}</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {availableDates.map((date, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                      }}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs font-medium">{format(date, 'EEE')}</div>
                      <div className="text-lg font-bold">{format(date, 'dd')}</div>
                      <div className="text-xs">{format(date, 'MMM')}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedDate && (
                <div>
                  <Label className="text-lg font-semibold">{t('counseling.select_time_slot')}</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                  </p>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8 text-gray-500">Loading slots...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {t('counseling.no_slots_available')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => handleSelectSlot(slot)}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            selectedSlot?.id === slot.id
                              ? 'bg-green-500 text-white border-green-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Clock className="h-4 w-4 mx-auto mb-1" />
                          <div className="font-medium">{slot.start_time}</div>
                          <div className="text-xs opacity-75">{slot.counselor_name || 'Available'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedSlot && (
                <Button onClick={() => setStep(3)} className="w-full">
                  Continue to Details
                </Button>
              )}
            </motion.div>
          )}
          
          {/* Step 3: Appointment Details */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Member</div>
                  <div className="font-medium">{selectedMember?.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Time</div>
                  <div className="font-medium">
                    {selectedDate && format(selectedDate, 'MMM dd')}, {selectedSlot?.start_time}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>{t('counseling.type')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counseling">{t('counseling.type_counseling')}</SelectItem>
                      <SelectItem value="prayer">{t('counseling.type_prayer')}</SelectItem>
                      <SelectItem value="pastoral_visit">{t('counseling.type_pastoral_visit')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('counseling.urgency')}</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('counseling.urgency_low')}</SelectItem>
                      <SelectItem value="normal">{t('counseling.urgency_normal')}</SelectItem>
                      <SelectItem value="high">{t('counseling.urgency_high')}</SelectItem>
                      <SelectItem value="crisis">{t('counseling.urgency_crisis')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('counseling.topic')} *</Label>
                  <Input
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Marriage difficulties"
                  />
                </div>
                
                <div>
                  <Label>{t('counseling.description')} *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the situation..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label>{t('counseling.preferred_channel')}</Label>
                  <Select
                    value={formData.preferred_channel}
                    onValueChange={(value) => setFormData({ ...formData, preferred_channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">{t('counseling.channel_in_person')}</SelectItem>
                      <SelectItem value="online">{t('counseling.channel_online')}</SelectItem>
                      <SelectItem value="phone">{t('counseling.channel_phone')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('counseling.preferred_location')}</Label>
                  <Input
                    value={formData.preferred_location}
                    onChange={(e) => setFormData({ ...formData, preferred_location: e.target.value })}
                    placeholder="e.g., Church office, room 201"
                  />
                </div>
                
                <div>
                  <Label>{t('counseling.contact_phone')}</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="Contact number"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.topic || !formData.description || createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Appointment'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentModal;
