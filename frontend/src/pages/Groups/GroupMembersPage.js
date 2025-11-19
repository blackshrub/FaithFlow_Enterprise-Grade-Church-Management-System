import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup, useGroupMembers, useAddGroupMember, useRemoveGroupMember } from '../../hooks/useGroups';
import { GroupMembersPanel } from '../../components/Groups/GroupMembersPanel';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { membersAPI } from '../../services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

export default function GroupMembersPage() {
  const { groupId } = useParams();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: group } = useGroup(groupId);
  const { data: membersData, isLoading } = useGroupMembers(groupId);
  const addMemberMutation = useAddGroupMember();
  const removeMemberMutation = useRemoveGroupMember();

  const [membershipToRemove, setMembershipToRemove] = React.useState(null);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);

  const handleSearchMembers = async () => {
    if (!searchTerm) return;
    try {
      const res = await membersAPI.list({ search: searchTerm, limit: 10 });
      setSearchResults(res.data?.data || res.data || []);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.members.messages.searchError'),
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async (member) => {
    try {
      await addMemberMutation.mutateAsync({ groupId, memberId: member.id });
      toast({
        title: t('common.success'),
        description: t('groups.members.messages.addSuccess'),
      });
      setSearchResults([]);
      setSearchTerm('');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.members.messages.addError'),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (membership) => {
    try {
      await removeMemberMutation.mutateAsync({
        groupId,
        memberId: membership.member_id,
      });
      toast({
        title: t('common.success'),
        description: t('groups.members.messages.removeSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.members.messages.removeError'),
        variant: 'destructive',
      });
    }
  };

  const memberships = membersData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {group?.name || t('groups.members.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('groups.members.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex-1 flex gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('groups.members.searchPlaceholder')}
            />
            <Button variant="outline" onClick={handleSearchMembers}>
              {t('common.search')}
            </Button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground">
              {t('groups.members.searchResults')}
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {searchResults.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-background cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{m.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.phone_whatsapp}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAddMember(m)}>
                    {t('groups.members.actions.addToGroup')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <GroupMembersPanel
        members={memberships}
        isLoading={isLoading}
        onAddMember={() => {}}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
}
