/**
 * Community Members Page
 *
 * Manage members of a community (formerly "Group").
 */
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { useCommunity, useCommunityMembers, useAddCommunityMember, useRemoveCommunityMember } from '../../hooks/useCommunities';
import { CommunityMembersPanel } from '../../components/Communities/CommunityMembersPanel';
import MemberAvatar from '../../components/MemberAvatar';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import api from '../../services/api';
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

export default function CommunityMembersPage() {
  const { communityId } = useParams();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: community } = useCommunity(communityId);
  const { data: membersData, isLoading } = useCommunityMembers(communityId);
  const addMemberMutation = useAddCommunityMember();
  const removeMemberMutation = useRemoveCommunityMember();

  const [membershipToRemove, setMembershipToRemove] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const searchInputRef = React.useRef(null);

  // Real-time search with debounce
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        handleSearchMembers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  const handleSearchMembers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get('/members/', {
        params: { search: searchTerm, limit: 10 }
      });

      const members = response.data?.data || response.data || [];

      // Filter out members already in the community
      const currentMemberIds = (membersData || []).map(m => m.member_id);
      const availableMembers = members.filter(m => !currentMemberIds.includes(m.id));

      setSearchResults(availableMembers);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search members',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (member) => {
    try {
      await addMemberMutation.mutateAsync({
        communityId: communityId,
        memberId: member.id,
        role: 'member'
      });
      toast({
        title: 'Success',
        description: `${member.full_name} added to community`,
      });
      setSearchResults([]);
      setSearchTerm('');
    } catch (error) {
      const errorMessage = error.response?.data?.detail?.message ||
        error.response?.data?.detail ||
        'Failed to add member';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (membership) => {
    try {
      await removeMemberMutation.mutateAsync({
        communityId,
        memberId: membership.member_id,
      });
      toast({
        title: 'Success',
        description: 'Member removed from community',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const memberships = membersData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {community?.name || 'Community Members'}
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage community members
        </p>
      </div>

      {/* Search and Add Members */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold">Add Members</h3>
            </div>

            <div className="flex gap-2">
              <Input
                id="community-member-search"
                name="community-member-search"
                aria-label="Search members by name or phone"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members by name or phone..."
                className="flex-1"
              />
              {isSearching && (
                <div className="flex items-center px-3 text-sm text-gray-500">
                  Searching...
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="text-xs font-medium text-gray-500">
                  {searchResults.length} member(s) found
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-white border hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MemberAvatar member={member} size="md" />
                        <div>
                          <div className="font-medium">{member.full_name}</div>
                          <div className="text-xs text-gray-500">
                            {member.phone_whatsapp || member.email || 'No contact'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(member)}
                        disabled={addMemberMutation.isPending}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchTerm.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-sm text-gray-500 text-center py-4">
                No members found. Try a different search term.
              </div>
            )}

            {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
              <div className="text-xs text-gray-400">
                Type at least 2 characters to search...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Members List */}
      <CommunityMembersPanel
        members={memberships}
        isLoading={isLoading}
        onAddMember={() => {
          searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchInputRef.current?.focus();
        }}
        onRemoveMember={(membership) => setMembershipToRemove(membership)}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!membershipToRemove}
        onOpenChange={(open) => !open && setMembershipToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove Member from Community?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {membershipToRemove?.member?.full_name} from this community.
              They can rejoin later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMemberMutation.isPending}
              onClick={async () => {
                if (!membershipToRemove) return;
                await handleRemoveMember(membershipToRemove);
                setMembershipToRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
