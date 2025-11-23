/**
 * Tests for MemberAvatar component.
 *
 * Tests cover:
 * - Rendering initials when no photo
 * - Rendering photo when URL provided
 * - Different size variants
 * - Error handling for broken images
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MemberAvatar from './MemberAvatar';

describe('MemberAvatar', () => {
  it('renders member initials when no photo provided', () => {
    render(<MemberAvatar name="John Doe" size="md" />);

    const avatar = screen.getByText('JD');
    expect(avatar).toBeInTheDocument();
  });

  it('renders single initial for single name', () => {
    render(<MemberAvatar name="John" size="md" />);

    const avatar = screen.getByText('J');
    expect(avatar).toBeInTheDocument();
  });

  it('renders photo when URL provided', () => {
    render(<MemberAvatar name="John Doe" photo="/photo.jpg" size="md" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/photo.jpg');
    expect(img).toHaveAttribute('alt', 'John Doe');
  });

  it('renders photo when base64 data provided', () => {
    const base64Photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    render(<MemberAvatar name="John Doe" photo={base64Photo} size="md" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', base64Photo);
  });

  it('applies correct size classes for small size', () => {
    const { container } = render(<MemberAvatar name="John Doe" size="sm" />);

    // Check for small size classes (h-8 w-8 text-xs)
    const avatar = container.firstChild;
    expect(avatar).toHaveClass('h-8', 'w-8');
  });

  it('applies correct size classes for medium size', () => {
    const { container } = render(<MemberAvatar name="John Doe" size="md" />);

    const avatar = container.firstChild;
    expect(avatar).toHaveClass('h-10', 'w-10');
  });

  it('applies correct size classes for large size', () => {
    const { container } = render(<MemberAvatar name="John Doe" size="lg" />);

    const avatar = container.firstChild;
    expect(avatar).toHaveClass('h-12', 'w-12');
  });

  it('shows fallback initials when image fails to load', () => {
    render(<MemberAvatar name="John Doe" photo="/broken.jpg" />);

    const img = screen.getByRole('img');

    // Simulate image error
    img.dispatchEvent(new Event('error'));

    // Should show initials fallback after error
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles empty name gracefully', () => {
    render(<MemberAvatar name="" size="md" />);

    // Should render without crashing
    const avatar = screen.getByText('?');
    expect(avatar).toBeInTheDocument();
  });

  it('handles null name gracefully', () => {
    render(<MemberAvatar name={null} size="md" />);

    // Should render without crashing
    const avatar = screen.getByText('?');
    expect(avatar).toBeInTheDocument();
  });
});
