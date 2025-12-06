import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMembers, useMember, useMemberStats, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers';
import { useDeferredSearch } from '../hooks/useDeferredSearch';
import { useMemberStatuses, useDemographics } from '../hooks/useSettings';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Edit, Trash2, UserX, Phone, Mail, Loader2, QrCode, ChevronLeft, ChevronRight, Filter, X, AlertCircle, ScanFace, CheckCircle } from 'lucide-react';
import MemberForm from '../components/MemberForm';
import MemberAvatar from '../components/MemberAvatar';
import MemberQRModal from '../components/Members/MemberQRModal';

const initialFormData = {
  first_name: '',
  last_name: '',
  phone_whatsapp: '',
  date_of_birth: '',
  gender: '',
  address: '',
  marital_status: '',
  member_status: '',
  baptism_date: '',
  photo_base64: '',
  personal_document: '',
  personal_document_base64: '',
  notes: '',
  face_descriptors: []  // Face recognition data for kiosk check-in
};

export default function Members() {
  const { t } = useTranslation();
  const { church, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // React 19 deferred search - smooth UX without manual debounce
  const { searchValue: searchQuery, setSearchValue: setSearchQuery, deferredValue: deferredSearch, isSearchPending } = useDeferredSearch();

  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    marital_status: '',
    member_status: '',
    demographic_category: '',
    has_face: ''
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [qrMemberId, setQrMemberId] = useState(null);
  const [qrMember, setQrMember] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 50;

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, showIncompleteOnly]);

  // React Query hooks - with pagination, server-side search, and filters
  const { data: membersRaw = [], isLoading, error } = useMembers({
    is_active: true,
    incomplete_data: showIncompleteOnly || undefined,
    skip: (currentPage - 1) * membersPerPage,
    limit: membersPerPage,
    search: deferredSearch || undefined,
    gender: filters.gender || undefined,
    marital_status: filters.marital_status || undefined,
    member_status: filters.member_status || undefined,
    demographic_category: filters.demographic_category || undefined,
    has_face: filters.has_face === 'true' ? true : filters.has_face === 'false' ? false : undefined
  });
  // Filter out any null/undefined items or items without id
  const members = (membersRaw || []).filter(m => m && m.id);
  const { data: stats } = useMemberStats();
  const { data: statusesRaw = [] } = useMemberStatuses();
  const { data: demographicsRaw = [] } = useDemographics();

  // Fetch full member data when editing (includes personal_document, notes, etc.)
  const { data: fullMemberData, isLoading: isLoadingMember } = useMember(editingMemberId, {
    enabled: !!editingMemberId,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache between different members
  });

  // Fetch full member data for QR modal (includes personal_qr_code)
  const { data: qrMemberData, isLoading: isLoadingQrMember } = useMember(qrMemberId, {
    enabled: !!qrMemberId,
    staleTime: 0,
    cacheTime: 0,
  });

  // Populate form when full member data loads
  useEffect(() => {
    if (fullMemberData && editingMemberId) {
      const member = fullMemberData;
      const formValues = {
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        phone_whatsapp: member.phone_whatsapp || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender ? member.gender.toLowerCase() : '',
        address: member.address || '',
        marital_status: member.marital_status ? member.marital_status.toLowerCase().replace(/\s+/g, '') : '',
        member_status: member.member_status || '',
        baptism_date: member.baptism_date || '',
        photo_base64: member.photo_base64 || '',
        personal_document: member.personal_document || '',
        personal_document_base64: member.personal_document_base64 || '',
        notes: member.notes || '',
        face_descriptors: member.face_descriptors || [],
        has_face_descriptors: member.has_face_descriptors || (member.face_descriptors?.length > 0) || false,
        personal_id_code: member.personal_id_code || ''
      };
      setFormData(formValues);
      setSelectedMember(member);
    }
  }, [fullMemberData, editingMemberId]);

  // Populate QR member when full data loads
  useEffect(() => {
    if (qrMemberData && qrMemberId) {
      setQrMember(qrMemberData);
    }
  }, [qrMemberData, qrMemberId]);

  // Filter out any null/undefined items AND items without id to prevent render errors
  const statuses = (statusesRaw || []).filter(s => s && s.id);
  const demographics = (demographicsRaw || []).filter(d => d && d.id);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  // Get unique values for filters (memoized to prevent recalculation on every render)
  const uniqueStatuses = useMemo(
    () => [...new Set(members.map(m => m.member_status).filter(Boolean))],
    [members]
  );

  const hasActiveFilters = useMemo(
    () => filters.gender || filters.marital_status || filters.member_status || filters.demographic_category || filters.has_face,
    [filters]
  );

  // Early return while auth is loading or church context not ready
  // Note: church can be {id: null} when session_church_id is missing, so check church?.id
  if (authLoading || !church?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setFilters({
      gender: '',
      marital_status: '',
      member_status: '',
      demographic_category: '',
      has_face: ''
    });
  };

  // Calculate total pages (memoized)
  const totalMembers = stats?.total_members || 0;
  const totalPages = useMemo(
    () => Math.ceil(totalMembers / membersPerPage),
    [totalMembers, membersPerPage]
  );

  const handleCreateMember = async (e) => {
    e.preventDefault();
    // Clean up empty fields
    const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== '') acc[key] = value;
      return acc;
    }, {});

    // Ensure full_name is set (required field)
    if (!cleanData.full_name && (cleanData.first_name || cleanData.last_name)) {
      cleanData.full_name = `${cleanData.first_name || ''} ${cleanData.last_name || ''}`.trim();
    }

    // Convert lowercase form values back to database format
    if (cleanData.gender) {
      cleanData.gender = cleanData.gender.charAt(0).toUpperCase() + cleanData.gender.slice(1);
    }
    
    if (cleanData.marital_status) {
      const maritalMap = {
        'married': 'Married',
        'notmarried': 'Not Married',
        'widow': 'Widow',
        'widower': 'Widower',
        'single': 'Single'
      };
      cleanData.marital_status = maritalMap[cleanData.marital_status] || cleanData.marital_status;
    }

    if (!church?.id) {
      console.error('[ERROR] No church context available');
      return;
    }

    createMember.mutate(
      { ...cleanData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
        onError: (error) => {
          // Error already handled by hook's onError (shows toast)
          // Just log for debugging
          console.error('[ERROR] Create member failed:', error.response?.data);
        }
      }
    );
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== '') acc[key] = value;
      return acc;
    }, {});

    // Convert lowercase form values back to database format
    if (cleanData.gender) {
      cleanData.gender = cleanData.gender.charAt(0).toUpperCase() + cleanData.gender.slice(1); // male -> Male
    }
    
    if (cleanData.marital_status) {
      // Convert: married -> Married, notmarried -> Not Married, widow -> Widow, widower -> Widower
      const maritalMap = {
        'married': 'Married',
        'notmarried': 'Not Married',
        'widow': 'Widow',
        'widower': 'Widower',
        'single': 'Single'
      };
      cleanData.marital_status = maritalMap[cleanData.marital_status] || cleanData.marital_status;
    }

    updateMember.mutate(
      { id: selectedMember.id, data: cleanData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
        onError: (error) => {
          // Error already handled by hook's onError (shows toast)
          console.error('[ERROR] Update member failed:', error.response?.data);
        }
      }
    );
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm(t('members.confirmDelete'))) {
      return;
    }
    deleteMember.mutate(memberId);
  };

  const openEditDialog = (member) => {
    // Reset form to initial state to prevent showing stale data from previous member
    setFormData(initialFormData);
    setSelectedMember(null);
    // Set member ID to trigger fetch of full member data via useMember hook
    setEditingMemberId(member.id);
    // Open dialog (form will be populated by useEffect when fullMemberData loads)
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedMember(null);
    setEditingMemberId(null);
  };

  const openQRModal = (member) => {
    // Set member ID to trigger fetch of full member data (includes personal_qr_code)
    setQrMemberId(member.id);
  };

  const closeQRModal = () => {
    setQrMember(null);
    setQrMemberId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('members.title')}</h1>
          <p className="text-gray-600 mt-1">
            {totalMembers > 0 ? (
              t('members.total', { count: totalMembers })
            ) : (
              t('members.subtitle')
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate('/trash')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Trash Bin
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('members.addMember')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('members.addNewMember')}</DialogTitle>
                <DialogDescription>
                  {t('members.registerMember')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateMember}>
              <MemberForm formData={formData} setFormData={setFormData} />
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createMember.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMember.isPending}>
                  {createMember.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('common.create')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('members.membersList')}</CardTitle>
              <CardDescription>
                {t('members.total', { count: totalMembers })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                {isSearchPending ? (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                )}
                <Input
                  id="member-search"
                  name="member-search"
                  placeholder={t('members.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
          
          {/* Filters Row */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={filters.gender || "all"} onValueChange={(value) => setFilters({...filters, gender: value === "all" ? "" : value})}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.marital_status || "all"} onValueChange={(value) => setFilters({...filters, marital_status: value === "all" ? "" : value})}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Marital Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Marital Status</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Not Married">Not Married</SelectItem>
                <SelectItem value="Widow">Widow</SelectItem>
                <SelectItem value="Widower">Widower</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.member_status || "all"} onValueChange={(value) => setFilters({...filters, member_status: value === "all" ? "" : value})}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Member Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses
                  .filter(status => status.name && status.name.trim() !== '')
                  .map(status => (
                    <SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={filters.demographic_category || "all"} onValueChange={(value) => setFilters({...filters, demographic_category: value === "all" ? "" : value})}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Demographics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Demographics</SelectItem>
                {demographics
                  .filter(demo => demo.name && demo.name.trim() !== '')
                  .map(demo => (
                    <SelectItem key={demo.id} value={demo.name}>{demo.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={filters.has_face || "all"} onValueChange={(value) => setFilters({...filters, has_face: value === "all" ? "" : value})}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('members.faceCheckin') || 'Face Check-in'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('members.allFaceStatus') || 'All Face Status'}</SelectItem>
                <SelectItem value="true">{t('members.hasFaceData') || 'Has Face Data'}</SelectItem>
                <SelectItem value="false">{t('members.noFaceData') || 'No Face Data'}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={showIncompleteOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                className={showIncompleteOnly ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {showIncompleteOnly ? "Showing Incomplete Only" : "Show Incomplete Data"}
              </Button>
              {showIncompleteOnly && (
                <span className="text-xs text-amber-600 font-medium">
                  (Missing: gender, DOB, address, or phone)
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">{t('members.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>{t('members.loadError')}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserX className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('members.noMembers')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{t('members.name')}</TableHead>
                      <TableHead>{t('members.contact')}</TableHead>
                      <TableHead>{t('members.address')}</TableHead>
                      <TableHead>{t('members.gender')}</TableHead>
                      <TableHead>{t('members.maritalStatus')}</TableHead>
                      <TableHead>Demographic</TableHead>
                      <TableHead>{t('members.status')}</TableHead>
                      <TableHead className="text-center">{t('members.faceCheckin') || 'Face'}</TableHead>
                      <TableHead className="text-right">{t('members.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <MemberAvatar
                            member={member}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            {member.personal_id_code && (
                              <p className="text-xs text-gray-500">ID: {member.personal_id_code}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {member.phone_whatsapp && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                {member.phone_whatsapp}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.address ? (
                            <span className="text-sm text-gray-700 truncate max-w-[200px] block" title={member.address}>
                              {member.address}
                            </span>
                          ) : (
                            <span className="text-gray-400">{t('common.na')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.gender ? (
                            <Badge variant="outline">
                              {t(`members.${member.gender.toLowerCase()}`)}
                            </Badge>
                          ) : t('common.na')}
                        </TableCell>
                        <TableCell>
                          {member.marital_status ? (
                            <Badge variant="secondary">
                              {t(`members.${member.marital_status.toLowerCase().replace(/\s+/g, '')}`)}
                            </Badge>
                          ) : t('common.na')}
                        </TableCell>
                        <TableCell>
                          {member.demographic_category ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {member.demographic_category}
                            </Badge>
                          ) : t('common.na')}
                        </TableCell>
                        <TableCell>
                          {member.member_status ? (
                            <Badge>{member.member_status}</Badge>
                          ) : (
                            <span className="text-gray-400">{t('common.na')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.has_face_descriptors ? (
                            <span title={t('members.faceCheckinEnabled') || 'Face check-in enabled'}>
                              <ScanFace className="h-5 w-5 text-green-600 mx-auto" />
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openQRModal(member)}
                              title={t('members.viewQR')}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id)}
                              disabled={deleteMember.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    {t('common.showingResults', {
                      from: (currentPage - 1) * membersPerPage + 1,
                      to: Math.min(currentPage * membersPerPage, totalMembers),
                      total: totalMembers
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('common.previous')}
                    </Button>
                    <div className="text-sm">
                      {t('common.pageOfPages', { page: currentPage, total: totalPages })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('common.next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('members.editMember')}</DialogTitle>
            <DialogDescription>
              {t('members.updateMember')}
            </DialogDescription>
          </DialogHeader>
          {isLoadingMember || !selectedMember ? (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : (
            <form onSubmit={handleUpdateMember}>
              <MemberForm formData={formData} setFormData={setFormData} member={selectedMember} />
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateMember.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updateMember.isPending}>
                  {updateMember.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('common.update')
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {(qrMember || qrMemberId) && (
        <MemberQRModal
          member={qrMember || { full_name: t('common.loading') }}
          isOpen={!!qrMemberId}
          onClose={closeQRModal}
          isLoading={isLoadingQrMember || !qrMember}
        />
      )}
    </div>
  );
}
