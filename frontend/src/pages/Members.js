import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useMembers, useMemberStats, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers';
import { useMemberStatuses, useDemographics } from '../hooks/useSettings';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Edit, Trash2, UserX, Phone, Mail, Loader2, QrCode, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
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
  notes: ''
};

export default function Members() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    marital_status: '',
    member_status: '',
    demographic_category: ''
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [qrMember, setQrMember] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 50;

  // Debounce search to avoid too many API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 when searching
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, showIncompleteOnly]);

  // React Query hooks - with pagination, server-side search, and filters
  const { data: members = [], isLoading, error } = useMembers({ 
    is_active: true,
    incomplete_data: showIncompleteOnly || undefined,
    skip: (currentPage - 1) * membersPerPage,
    limit: membersPerPage,
    search: debouncedSearch || undefined,
    gender: filters.gender || undefined,
    marital_status: filters.marital_status || undefined,
    member_status: filters.member_status || undefined,
    demographic_category: filters.demographic_category || undefined
  });
  const { data: stats } = useMemberStats();
  const { data: statuses = [] } = useMemberStatuses();
  const { data: demographics = [] } = useDemographics();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  // Get unique values for filters
  const uniqueStatuses = [...new Set(members.map(m => m.member_status).filter(Boolean))];
  const hasActiveFilters = filters.gender || filters.marital_status || filters.member_status || filters.demographic_category;

  const clearFilters = () => {
    setFilters({
      gender: '',
      marital_status: '',
      member_status: '',
      demographic_category: ''
    });
  };

  // Calculate total pages
  const totalMembers = stats?.total_members || 0;
  const totalPages = Math.ceil(totalMembers / membersPerPage);

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

    console.log('[DEBUG] Creating member with data:', cleanData);

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

    console.log('[DEBUG] Sending update with data:', cleanData);

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
    setSelectedMember(member);
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
      notes: member.notes || ''
    };
    console.log('[DEBUG] Opening edit dialog for member:', member.full_name);
    console.log('[DEBUG] Member status from DB:', member.member_status);
    console.log('[DEBUG] Form data member_status:', formValues.member_status);
    setFormData(formValues);
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedMember(null);
  };

  const openQRModal = (member) => {
    setQrMember(member);
  };

  const closeQRModal = () => {
    setQrMember(null);
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('members.addMember')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('members.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
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
                      <TableHead>{t('members.gender')}</TableHead>
                      <TableHead>{t('members.maritalStatus')}</TableHead>
                      <TableHead>{t('members.status')}</TableHead>
                      <TableHead className="text-right">{t('members.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <MemberAvatar 
                            name={member.full_name} 
                            photo={member.photo_base64}
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
                          {member.member_status ? (
                            <Badge>{member.member_status}</Badge>
                          ) : (
                            <span className="text-gray-400">{t('common.na')}</span>
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('members.editMember')}</DialogTitle>
            <DialogDescription>
              {t('members.updateMember')}
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {qrMember && (
        <MemberQRModal
          member={qrMember}
          isOpen={!!qrMember}
          onClose={closeQRModal}
        />
      )}
    </div>
  );
}
