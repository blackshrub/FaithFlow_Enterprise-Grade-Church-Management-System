import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCOATree } from '../../hooks/useAccounting';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const AccountSelector = ({ 
  label, 
  value, 
  onChange, 
  filterByType = null, 
  required = false,
  placeholder 
}) => {
  const { t } = useTranslation();
  const { data: coaTree, isLoading } = useCOATree();

  // Flatten tree to list
  const flattenTree = (nodes, level = 0) => {
    if (!nodes) return [];
    
    let result = [];
    nodes.forEach(node => {
      result.push({ ...node, displayLevel: level });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenTree(node.children, level + 1));
      }
    });
    return result;
  };

  const accounts = flattenTree(coaTree || []);
  
  // Handle filterByType as either string or array
  let filteredAccounts = accounts;
  if (filterByType) {
    if (Array.isArray(filterByType)) {
      filteredAccounts = accounts.filter(acc => filterByType.includes(acc.account_type));
    } else {
      filteredAccounts = accounts.filter(acc => acc.account_type === filterByType);
    }
  }

  // Debug logging
  if (accounts.length === 0 && !isLoading) {
    console.warn('AccountSelector: No accounts loaded. COA tree:', coaTree);
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || t('accounting.common.select')} />
        </SelectTrigger>
        <SelectContent>
          {filteredAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <span style={{ paddingLeft: `${account.displayLevel * 12}px` }}>
                {account.code} - {account.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AccountSelector;
