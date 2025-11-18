import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * Currency input with automatic IDR formatting
 * @param {string} label - Input label
 * @param {number} value - Numeric value
 * @param {function} onChange - Callback with numeric value
 * @param {boolean} required - Required field
 */
const CurrencyInput = ({ label, value, onChange, required = false, ...props }) => {
  const handleChange = (e) => {
    const rawValue = e.target.value;
    // Remove all non-numeric characters except decimal
    const cleaned = rawValue.replace(/[^\d]/g, '');
    const numValue = cleaned ? parseInt(cleaned, 10) : 0;
    onChange(numValue);
  };

  const displayValue = value ? 
    new Intl.NumberFormat('id-ID').format(value) : '';

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          Rp
        </span>
        <Input
          type="text"
          value={displayValue}
          onChange={handleChange}
          className="pl-10"
          placeholder="0"
          {...props}
        />
      </div>
    </div>
  );
};

export default CurrencyInput;
