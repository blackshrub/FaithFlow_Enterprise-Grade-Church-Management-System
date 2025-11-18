import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useMembers, useMemberStats, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Plus, Search, Edit, Trash2, UserX, Phone, Mail, Loader2, QrCode } from 'lucide-react';
import MemberForm from '../components/MemberForm';
import MemberAvatar from '../components/MemberAvatar';
import MemberQRModal from '../components/Members/MemberQRModal';

const initialFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone_whatsapp: '',
  date_of_birth: '',
  gender: '',
  address: '',
  city: '',
  marital_status: '',
  occupation: '',
  baptism_date: '',
  membership_date: '',
  notes: ''
};

export default function Members() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [qrMember, setQrMember] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  // React Query hooks - now includes incomplete_data filter
  const { data: members = [], isLoading, error } = useMembers({ 
    is_active: true,
    incomplete_data: showIncompleteOnly || undefined
  });
  const { data: stats } = useMemberStats();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleCreateMember = async (e) => {
    e.preventDefault();
    // Clean up empty fields
    const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== '') acc[key] = value;
      return acc;
    }, {});

    createMember.mutate(
      { ...cleanData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
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

    updateMember.mutate(
      { id: selectedMember.id, data: cleanData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
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
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone_whatsapp: member.phone_whatsapp || '',
      date_of_birth: member.date_of_birth || '',
      gender: member.gender || '',
      address: member.address || '',
      city: member.city || '',
      marital_status: member.marital_status || '',
      occupation: member.occupation || '',
      baptism_date: member.baptism_date || '',
      membership_date: member.membership_date || '',
      notes: member.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedMember(null);
  };

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.first_name?.toLowerCase().includes(query) ||
      member.last_name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.phone_whatsapp?.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('members.title')}</h1>
          <p className="text-gray-600 mt-1">{t('members.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showIncompleteOnly ? "default" : "outline"}
            onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
          >
            {showIncompleteOnly ? (
              <>
                {t('members.showAll')}
                {stats?.incomplete_data_count > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {stats.incomplete_data_count}
                  </Badge>
                )}
              </>
            ) : (
              <>
                {t('members.showIncomplete')}
                {stats?.incomplete_data_count > 0 && (
                  <Badge className="ml-2" variant="destructive">
                    {stats.incomplete_data_count}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>
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
            <form onSubmit={handleCreateMember} className="space-y-4">
              <MemberForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
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

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('members.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('members.membersList')}</CardTitle>
          <CardDescription>
            {t('members.total', { count: filteredMembers.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">{t('members.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{t('members.loadError')}</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserX className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('members.noMembers')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('members.name')}</TableHead>
                    <TableHead>{t('members.contact')}</TableHead>
                    <TableHead>{t('members.gender')}</TableHead>
                    <TableHead>{t('members.status')}</TableHead>
                    <TableHead>{t('members.membership')}</TableHead>
                    <TableHead className="text-right">{t('members.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={member} size="md" />
                          <div>
                            <div className="font-medium">
                              {member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || t('common.na')}
                            </div>
                            <div className="text-sm text-gray-500">{member.occupation || t('common.na')}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.phone_whatsapp}
                          </div>
                          {member.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="h-3 w-3 mr-1" />
                              {member.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.gender ? (
                          <Badge variant="outline">
                            {t(`members.${member.gender}`)}
                          </Badge>
                        ) : t('common.na')}
                      </TableCell>
                      <TableCell>
                        {member.marital_status ? (
                          <Badge variant="secondary">
                            {t(`members.${member.marital_status}`)}
                          </Badge>
                        ) : t('common.na')}
                      </TableCell>
                      <TableCell>
                        {member.membership_date ? new Date(member.membership_date).toLocaleDateString() : t('common.na')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQrMember(member)}
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('members.editMember')}</DialogTitle>
            <DialogDescription>
              {t('members.updateMember')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <MemberForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
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
          onClose={() => setQrMember(null)} 
        />
      )}
    </div>
  );
}
