import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

const AccountTypeBadge = ({ type }) => {
  const { t } = useTranslation();

  const colorMap = {
    'Asset': 'bg-blue-100 text-blue-800 border-blue-200',
    'Liability': 'bg-red-100 text-red-800 border-red-200',
    'Equity': 'bg-purple-100 text-purple-800 border-purple-200',
    'Income': 'bg-green-100 text-green-800 border-green-200',
    'Expense': 'bg-orange-100 text-orange-800 border-orange-200'
  };

  const translationMap = {
    'Asset': t('accounting.coa.asset'),
    'Liability': t('accounting.coa.liability'),
    'Equity': t('accounting.coa.equity'),
    'Income': t('accounting.coa.income'),
    'Expense': t('accounting.coa.expense')
  };

  return (
    <Badge variant="outline" className={colorMap[type] || 'bg-gray-100 text-gray-800'}>
      {translationMap[type] || type}
    </Badge>
  );
};

export default AccountTypeBadge;
