import React from 'react';

const COLORS = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
  { bg: '#10B981', text: '#FFFFFF' }, // Green
  { bg: '#F59E0B', text: '#FFFFFF' }, // Orange
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
  { bg: '#F97316', text: '#FFFFFF' }, // Orange
];

function getInitials(fullName, firstName, lastName) {
  if (fullName) {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
  
  const firstInitial = firstName ? firstName[0].toUpperCase() : '';
  const lastInitial = lastName ? lastName[0].toUpperCase() : '';
  
  if (firstInitial && lastInitial) {
    return firstInitial + lastInitial;
  }
  return (firstInitial || lastInitial || '?').toUpperCase();
}

function getColorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function MemberAvatar({ member, name, photo, firstName, lastName, size = 'md', className = '' }) {
  // Support both interfaces:
  // 1. member object: { full_name, first_name, last_name, photo_base64 }
  // 2. individual props: name, photo, firstName, lastName
  const full_name = member?.full_name || name;
  const first_name = member?.first_name || firstName;
  const last_name = member?.last_name || lastName;
  const photo_base64 = member?.photo_base64 || photo;
  
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };
  
  const sizeClass = sizes[size] || sizes.md;
  
  // If photo exists, show it
  if (photo_base64) {
    // Handle both formats: with or without data URL prefix
    const photoSrc = photo_base64.startsWith('data:') 
      ? photo_base64 
      : `data:image/jpeg;base64,${photo_base64}`;
      
    return (
      <img
        src={photoSrc}
        alt={full_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Member'}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }
  
  // Generate placeholder with initials
  const initials = getInitials(full_name, first_name, last_name);
  const displayName = full_name || `${first_name || ''} ${last_name || ''}`.trim();
  const color = getColorFromName(displayName || 'Default');
  
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold ${className}`}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {initials}
    </div>
  );
}
