import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Button from '../Button';

const MockIcon = ({ size, className }: { size?: number; className?: string }) => (
  <svg data-testid="button-icon" width={size} className={className} />
);

describe('Button', () => {
  describe('rendering without icon', () => {
    it('renders the button text', () => {
      render(<Button text="Click me" onClickCallback={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('applies the base CSS class', () => {
      const { container } = render(<Button text="Test" onClickCallback={vi.fn()} />);
      expect(container.querySelector('.button')).toBeInTheDocument();
    });

    it('does not apply button-withIcon class when no icon', () => {
      const { container } = render(<Button text="No icon" onClickCallback={vi.fn()} />);
      expect(container.querySelector('.button-withIcon')).not.toBeInTheDocument();
    });
  });

  describe('rendering with icon', () => {
    it('renders the icon component', () => {
      render(<Button text="With icon" onClickCallback={vi.fn()} IconComponent={MockIcon} />);
      expect(screen.getByTestId('button-icon')).toBeInTheDocument();
    });

    it('applies button-withIcon class when icon is present', () => {
      const { container } = render(
        <Button text="With icon" onClickCallback={vi.fn()} IconComponent={MockIcon} />
      );
      expect(container.querySelector('.button-withIcon')).toBeInTheDocument();
    });

    it('passes default iconSize of 16 to icon', () => {
      render(<Button text="Icon" onClickCallback={vi.fn()} IconComponent={MockIcon} />);
      expect(screen.getByTestId('button-icon')).toHaveAttribute('width', '16');
    });

    it('passes custom iconSize to icon', () => {
      render(
        <Button text="Icon" onClickCallback={vi.fn()} IconComponent={MockIcon} iconSize={24} />
      );
      expect(screen.getByTestId('button-icon')).toHaveAttribute('width', '24');
    });

    it('passes button-withIcon-icon className to icon', () => {
      render(<Button text="Icon" onClickCallback={vi.fn()} IconComponent={MockIcon} />);
      expect(screen.getByTestId('button-icon')).toHaveClass('button-withIcon-icon');
    });
  });

  describe('click behaviour', () => {
    it('calls onClickCallback on click', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(<Button text="Click" onClickCallback={callback} />);
      await user.click(screen.getByRole('button'));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('calls onClickCallback via keyboard Enter', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(<Button text="Click" onClickCallback={callback} />);
      screen.getByRole('button').focus();
      await user.keyboard('{Enter}');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('calls onClickCallback via keyboard Space', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(<Button text="Click" onClickCallback={callback} />);
      screen.getByRole('button').focus();
      await user.keyboard(' ');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call callback when not interacted', () => {
      const callback = vi.fn();
      render(<Button text="Passive" onClickCallback={callback} />);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have no violations without icon', async () => {
      const { container } = render(<Button text="Accessible button" onClickCallback={vi.fn()} />);
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with icon', async () => {
      const { container } = render(
        <Button text="With icon" onClickCallback={vi.fn()} IconComponent={MockIcon} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
