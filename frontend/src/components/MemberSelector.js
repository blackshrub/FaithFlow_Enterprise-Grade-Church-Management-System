import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { membersAPI } from '../services/api';
import MemberAvatar from './MemberAvatar';

export default function MemberSelector({ value, onChange, selectedMember, placeholder }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [currentMember, setCurrentMember] = React.useState(selectedMember || null);

  // Fetch member details if we have ID but no member object
  React.useEffect(() => {
    const fetchMember = async () => {
      if (value && !currentMember) {
        try {
          const res = await membersAPI.get(value);
          setCurrentMember(res.data);
        } catch (error) {
          console.error('Failed to fetch member details:', error);
        }
      }
    };
    fetchMember();
  }, [value, currentMember]);

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
        console.error('Failed to search members', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelect = (member) => {
    // Call onChange with both ID and member data
    if (typeof onChange === 'function') {
      // Support both signatures: onChange(id) and onChange(id, memberData)
      onChange(member.id, member);
    }
    setCurrentMember(member);
    setResults([]);
    setSearchTerm('');
  };

  const handleClear = () => {
    if (typeof onChange === 'function') {
      onChange('', null);
    }
    setCurrentMember(null);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      {currentMember ? (
        <div className="flex items-center justify-between p-2 border rounded-md bg-muted/40">
          <div className="flex items-center gap-2">
            <MemberAvatar
              member={currentMember}
              size="sm"
            />
            <div>
              <div className="font-medium text-sm">{currentMember.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {currentMember.phone_whatsapp || currentMember.email || 'No contact'}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {t('prayerRequests.form.noMemberSelected') || 'No member selected yet.'}
        </div>
      )}

      <div>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder || t('prayerRequests.form.searchMemberPlaceholder') || 'Search for a member...'}
          disabled={!!currentMember}
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

      {searchTerm && searchTerm.length >= 2 && results.length === 0 && !loading && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('common.noResults') || 'No members found'}
        </div>
      )}
    </div>
  );
}
