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
    // Remove all non-numeric characters
    const cleaned = rawValue.replace(/[^\d]/g, '');
    
    // Parse to integer, default to 0 if empty
    const numValue = cleaned ? parseInt(cleaned, 10) : 0;
    
    // Always call onChange with the numeric value
    if (onChange) {
      onChange(numValue);
    }
  };

  // Format value for display (handle 0, null, undefined)
  const displayValue = (value && value > 0) ? 
    new Intl.NumberFormat('id-ID').format(value) : '';

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          Rp
        </span>
        <Input
          type="text"
          inputMode="numeric"
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
