import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
import {
  useCounselors,
  useCreateCounselor,
  useUpdateCounselor,
  useDeleteCounselor,
  useStaffUsers
} from '../../hooks/useCounseling';

const CounselorsPage = () => {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState(null);
  const [deletingCounselor, setDeletingCounselor] = useState(null);
  const [formData, setFormData] = useState({
    staff_user_id: '',
    display_name: '',
    whatsapp_number: '',
    max_daily_appointments: 8,
    bio: '',
    specialties: []
  });
  const [specialtyInput, setSpecialtyInput] = useState('');

  const { data: counselors = [], isLoading } = useCounselors();
  const { data: staffUsers = [] } = useStaffUsers();
  const createMutation = useCreateCounselor();
  const updateMutation = useUpdateCounselor();
  const deleteMutation = useDeleteCounselor();

  const handleOpenForm = (counselor = null) => {
    if (counselor) {
      setEditingCounselor(counselor);
      setFormData({
        staff_user_id: counselor.staff_user_id,
        display_name: counselor.display_name,
        whatsapp_number: counselor.whatsapp_number || '',
        max_daily_appointments: counselor.max_daily_appointments || 8,
        bio: counselor.bio || '',
        specialties: counselor.specialties || []
      });
    } else {
      setEditingCounselor(null);
      setFormData({
        staff_user_id: '',
        display_name: '',
        whatsapp_number: '',
        max_daily_appointments: 8,
        bio: '',
        specialties: []
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCounselor) {
        await updateMutation.mutateAsync({
          id: editingCounselor.id,
          data: formData
        });
        toast({
          title: t('success_counselor_updated'),
          variant: 'default'
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: t('success_counselor_created'),
          variant: 'default'
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deletingCounselor.id);
      toast({
        title: t('success_counselor_deleted'),
        variant: 'default'
      });
      setIsDeleteDialogOpen(false);
      setDeletingCounselor(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialtyInput.trim()]
      });
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialty) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty)
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('counselors')}</h1>
          <p className="text-gray-500 mt-1">Manage counselor profiles and availability</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_counselor')}
        </Button>
      </div>

      {/* Counselors Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : counselors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('no_counselors')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('counselor_name')}</TableHead>
                  <TableHead>{t('whatsapp_number')}</TableHead>
                  <TableHead>{t('specialties')}</TableHead>
                  <TableHead>{t('max_daily_appointments')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselors.map((counselor) => (
                  <TableRow key={counselor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{counselor.display_name}</div>
                        {counselor.staff_user_email && (
                          <div className="text-sm text-gray-500">{counselor.staff_user_email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{counselor.whatsapp_number || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {counselor.specialties?.slice(0, 3).map((specialty, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {counselor.specialties?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{counselor.specialties.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{counselor.max_daily_appointments || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={counselor.is_active ? 'default' : 'secondary'}>
                        {counselor.is_active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm(counselor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingCounselor(counselor);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCounselor ? t('edit_counselor') : t('add_counselor')}
            </DialogTitle>
            <DialogDescription>
              Configure counselor profile and availability settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="staff_user_id">{t('select_staff_user')} *</Label>
                <Select
                  value={formData.staff_user_id}
                  onValueChange={(value) => setFormData({ ...formData, staff_user_id: value })}
                  disabled={!!editingCounselor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_staff_user')} />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">{t('display_name')} *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Pastor John Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">{t('whatsapp_number')}</Label>
                <Input
                  id="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+6281234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_daily_appointments">{t('max_daily_appointments')}</Label>
                <Input
                  id="max_daily_appointments"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.max_daily_appointments}
                  onChange={(e) => setFormData({ ...formData, max_daily_appointments: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{t('bio')}</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief description of experience and areas of expertise"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('specialties')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    placeholder="e.g., Marriage, Grief, Addiction"
                  />
                  <Button type="button" onClick={addSpecialty}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialties.map((specialty, idx) => (
                    <Badge key={idx} variant="secondary">
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="ml-2 text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCounselor ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirm_delete_counselor')}</DialogTitle>
            <DialogDescription>
              This will deactivate the counselor. They will no longer appear in the counselors list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CounselorsPage;
