import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { membersAPI } from '../../services/api';
import MemberAvatar from '../MemberAvatar';

export function LeaderSelector({ value, onChange, selectedLeader }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [currentLeader, setCurrentLeader] = React.useState(selectedLeader || null);

  // Fetch leader details if we have a leader_member_id but no selectedLeader object
  React.useEffect(() => {
    const fetchLeader = async () => {
      if (value && !currentLeader) {
        try {
          const res = await membersAPI.get(value);
          setCurrentLeader(res.data);
        } catch (error) {
          console.error('Failed to fetch leader details:', error);
        }
      }
    };
    fetchLeader();
  }, [value, currentLeader]);

  // Real-time search as user types (debounced)
  React.useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await membersAPI.list({ search: searchTerm, limit: 10 });
        const data = res.data?.data || res.data || [];
        setResults(data);
      } catch (e) {
        console.error('Failed to search members for leader', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelect = (member) => {
    onChange(member.id);
    setCurrentLeader(member);
    setResults([]);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setCurrentLeader(null);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      {currentLeader ? (
        <div className="flex items-center justify-between p-2 border rounded-md bg-muted/40">
          <div className="flex items-center gap-2">
            <MemberAvatar
              member={currentLeader}
              size="sm"
            />
            <div>
              <div className="font-medium text-sm">{currentLeader.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {currentLeader.phone_whatsapp}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {t('groups.form.noLeaderSelected') || 'No leader selected yet.'}
        </div>
      )}

      <div>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('groups.members.searchPlaceholder')}
          disabled={!!currentLeader}
        />
        {loading && searchTerm && (
          <div className="text-xs text-muted-foreground mt-1">
            {t('common.searching') || 'Searching...'}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="border rounded-md mt-2 max-h-56 overflow-y-auto bg-background">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
              onClick={() => handleSelect(m)}
            >
              <MemberAvatar
                member={m}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{m.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.phone_whatsapp || m.email || 'No contact'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {searchTerm && results.length === 0 && !loading && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('groups.form.noMembersFound') || 'No members found'}
        </div>
      )}
    </div>
  );
}
