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

  // Flatten tree to list (recursive for all levels)
  const flattenTree = (nodes, level = 0) => {
    if (!nodes || !Array.isArray(nodes)) return [];
    
    let result = [];
    nodes.forEach(node => {
      // Add current node
      result.push({ ...node, displayLevel: level });
      
      // Recursively add all children
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        const childResults = flattenTree(node.children, level + 1);
        result = result.concat(childResults);
      }
    });
    return result;
  };

  const accounts = flattenTree(coaTree || []);
  
  console.log('AccountSelector: COA Tree data:', coaTree);
  console.log('AccountSelector: Flattened accounts:', accounts.length, 'accounts');
  
  // Handle filterByType as either string or array
  let filteredAccounts = accounts;
  if (filterByType) {
    if (Array.isArray(filterByType)) {
      filteredAccounts = accounts.filter(acc => filterByType.includes(acc.account_type));
    } else {
      filteredAccounts = accounts.filter(acc => acc.account_type === filterByType);
    }
  }
  
  console.log('AccountSelector: Filtered accounts:', filteredAccounts.length, 'accounts', 'Filter:', filterByType);

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
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <SelectItem value="_loading" disabled>Loading accounts...</SelectItem>
          ) : filteredAccounts.length === 0 ? (
            <SelectItem value="_empty" disabled>No accounts found</SelectItem>
          ) : (
            filteredAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <span style={{ paddingLeft: `${account.displayLevel * 12}px` }}>
                  {account.code} - {account.name}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AccountSelector;
