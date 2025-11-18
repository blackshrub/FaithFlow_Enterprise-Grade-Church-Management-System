import React from 'react';

/**
 * Display currency in Indonesian Rupiah format
 * @param {number|string} amount - Amount to display
 * @param {boolean} showSymbol - Show Rp symbol (default: true)
 */
const CurrencyDisplay = ({ amount, showSymbol = true }) => {
  if (amount === null || amount === undefined || amount === '') {
    return <span className="text-gray-400">-</span>;
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return <span className="text-gray-400">-</span>;
  }

  const formatted = new Intl.NumberFormat('id-ID', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numAmount);

  const colorClass = numAmount < 0 ? 'text-red-600' : 'text-gray-900';

  return <span className={colorClass}>{formatted}</span>;
};

export default CurrencyDisplay;
