/**
 * MemberSearchSheet - Bottom sheet for searching and selecting members
 *
 * Used in:
 * - Child Dedication (selecting father/mother)
 * - Holy Matrimony (selecting spouse)
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, User, Check, X, UserPlus } from 'lucide-react-native';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

interface Member {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
}

interface MemberSearchSheetProps {
  onSelect: (member: Member) => void;
  onClose: () => void;
  onCreateNew?: () => void;
  title?: string;
  excludeIds?: string[];
}

export function MemberSearchSheet({
  onSelect,
  onClose,
  onCreateNew,
  title,
  excludeIds = [],
}: MemberSearchSheetProps) {
  const { t } = useTranslation();
  const { churchId } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search members when query changes
  React.useEffect(() => {
    const searchMembers = async () => {
      if (debouncedQuery.length < 3) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get('/public/kiosk/member-care/members/search', {
          params: {
            q: debouncedQuery,
            church_id: churchId,
          },
        });

        // Filter out excluded members
        const filtered = (response.data || []).filter(
          (m: Member) => !excludeIds.includes(m.id)
        );
        setResults(filtered);
        setHasSearched(true);
      } catch (error) {
        console.error('Member search error:', error);
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    };

    searchMembers();
  }, [debouncedQuery, churchId, excludeIds]);

  const renderMemberItem = useCallback(({ item }: { item: Member }) => (
    <Pressable
      style={styles.memberItem}
      onPress={() => onSelect(item)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={styles.avatar}>
            <User size={20} color="#6B7280" />
          </View>
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.full_name}</Text>
        <Text style={styles.memberPhone}>{item.phone}</Text>
      </View>
      <Check size={20} color="#10B981" style={{ opacity: 0.5 }} />
    </Pressable>
  ), [onSelect]);

  const renderEmpty = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            {t('requests.search.enterName', 'Enter at least 3 characters to search')}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <User size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>
          {t('requests.search.noResults', 'No members found')}
        </Text>
        {onCreateNew && (
          <Pressable style={styles.createNewButton} onPress={onCreateNew}>
            <UserPlus size={18} color="#3B82F6" />
            <Text style={styles.createNewText}>
              {t('requests.search.createNew', 'Create new member')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {title || t('requests.search.title', 'Search Member')}
        </Text>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#6B7280" />
        </Pressable>
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <Input variant="outline" size="lg">
          <InputSlot className="pl-3">
            <InputIcon as={Search} className="text-typography-400" />
          </InputSlot>
          <InputField
            placeholder={t('requests.search.placeholder', 'Search by name or phone...')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </Input>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create new option at bottom */}
      {onCreateNew && results.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.createNewFooterButton} onPress={onCreateNew}>
            <UserPlus size={18} color="#3B82F6" />
            <Text style={styles.createNewText}>
              {t('requests.search.notFound', "Can't find? Enter manually")}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  createNewText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  createNewFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});

export default MemberSearchSheet;
