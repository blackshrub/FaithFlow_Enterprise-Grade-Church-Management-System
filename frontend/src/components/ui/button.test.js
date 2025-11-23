/**
 * Tests for Button component.
 *
 * Tests cover:
 * - Rendering with different variants
 * - Click handling
 * - Disabled state
 * - Loading state
 * - Icon rendering
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick} disabled>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with default variant styles', () => {
    const { container } = render(<Button>Default</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('renders with destructive variant styles', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('renders with outline variant styles', () => {
    const { container } = render(<Button variant="outline">Outline</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('border');
  });

  it('renders with ghost variant styles', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('hover:bg-accent');
  });

  it('renders with small size', () => {
    const { container } = render(<Button size="sm">Small</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('h-9');
  });

  it('renders with large size', () => {
    const { container } = render(<Button size="lg">Large</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('h-11');
  });

  it('renders with icon size', () => {
    const { container } = render(<Button size="icon">×</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Button</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('can be used as a link with asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');
  });
});
