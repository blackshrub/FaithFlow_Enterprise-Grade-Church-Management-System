import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { membersAPI } from '../../services/api';
import MemberAvatar from '../MemberAvatar';

export function LeaderSelector({ value, onChange, selectedLeader }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [currentLeader, setCurrentLeader] = React.useState(selectedLeader || null);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await membersAPI.list({ search: searchTerm, limit: 10 });
      const data = res.data?.data || res.data || [];
      setResults(data);
    } catch (e) {
      console.error('Failed to search members for leader', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (member) => {
    onChange(member.id);
    setCurrentLeader(member);
    setResults([]);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setCurrentLeader(null);
  };

  return (
    <div className="space-y-2">
      {currentLeader ? (
        <div className="flex items-center justify-between p-2 border rounded-md bg-muted/40">
          <div className="flex items-center gap-2">
            <MemberAvatar
              name={currentLeader.full_name}
              photoBase64={currentLeader.photo_base64}
            />
            <div>
              <div className="font-medium text-sm">{currentLeader.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {currentLeader.phone_whatsapp}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            {t('common.clear') || 'Clear'}
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {t('groups.form.noLeaderSelected') || 'No leader selected yet.'}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('groups.members.searchPlaceholder')}
        />
        <Button type="button" variant="outline" onClick={handleSearch} disabled={loading}>
          {loading ? t('common.loading') : t('common.search')}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-md mt-2 max-h-56 overflow-y-auto bg-background">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-muted/50"
              onClick={() => handleSelect(m)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{m.full_name}</span>
                <span className="text-xs text-muted-foreground">{m.phone_whatsapp}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
