import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Checkbox from '../Checkbox';

describe('Checkbox', () => {
  describe('Basic functionality', () => {
    it('renders unchecked checkbox', () => {
      render(<Checkbox checked={false} onChangeCallback={vi.fn()} ariaLabel="Test checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('renders checked checkbox', () => {
      render(<Checkbox checked={true} onChangeCallback={vi.fn()} ariaLabel="Test checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls onChangeCallback when clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Checkbox checked={false} onChangeCallback={handleChange} ariaLabel="Test checkbox" />);

      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('can be toggled with keyboard (Space)', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Checkbox checked={false} onChangeCallback={handleChange} ariaLabel="Test checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      await user.keyboard(' ');

      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility - With label', () => {
    it('renders with visible label and proper association', () => {
      render(<Checkbox checked={false} onChangeCallback={vi.fn()} label="Accept terms" />);

      // Should be findable by accessible name
      const checkbox = screen.getByRole('checkbox', { name: /accept terms/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('associates label with checkbox via htmlFor/id', () => {
      render(<Checkbox checked={false} onChangeCallback={vi.fn()} label="Subscribe" id="subscribe-checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Subscribe');

      expect(checkbox).toHaveAttribute('id', 'subscribe-checkbox');
      expect(label).toHaveAttribute('for', 'subscribe-checkbox');
    });

    it('generates unique ID when not provided', () => {
      render(<Checkbox checked={false} onChangeCallback={vi.fn()} label="Option A" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id');
      expect(checkbox.id).toBeTruthy();
    });

    it('clicking label toggles checkbox', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Checkbox checked={false} onChangeCallback={handleChange} label="Click me" />);

      await user.click(screen.getByText('Click me'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility - Without label (aria-label)', () => {
    it('renders with aria-label when no visible label', () => {
      render(<Checkbox checked={false} onChangeCallback={vi.fn()} ariaLabel="Select row 1" />);

      const checkbox = screen.getByRole('checkbox', { name: /select row 1/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('aria-label', 'Select row 1');
    });
  });

  describe('Accessibility - aria-describedby', () => {
    it('supports aria-describedby for additional help text', () => {
      render(
        <>
          <Checkbox
            checked={false}
            onChangeCallback={vi.fn()}
            label="Newsletter"
            ariaDescribedBy="newsletter-help"
          />
          <p id="newsletter-help">We will send you weekly updates</p>
        </>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby', 'newsletter-help');
    });

    it('works with aria-describedby on standalone checkbox', () => {
      render(
        <>
          <Checkbox
            checked={false}
            onChangeCallback={vi.fn()}
            ariaLabel="Enable notifications"
            ariaDescribedBy="notif-desc"
          />
          <p id="notif-desc">You will receive push notifications</p>
        </>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby', 'notif-desc');
    });
  });

  describe('Accessibility - CSS classes and structure', () => {
    it('applies correct CSS classes with label', () => {
      const { container } = render(
        <Checkbox checked={false} onChangeCallback={vi.fn()} label="Option" />
      );

      expect(container.querySelector('.checkbox-wrapper')).toBeInTheDocument();
      expect(container.querySelector('.checkbox')).toBeInTheDocument();
      expect(container.querySelector('.checkbox-label')).toBeInTheDocument();
    });

    it('applies correct CSS class without label', () => {
      const { container } = render(
        <Checkbox checked={false} onChangeCallback={vi.fn()} ariaLabel="Option" />
      );

      expect(container.querySelector('.checkbox-wrapper')).not.toBeInTheDocument();
      expect(container.querySelector('.checkbox')).toBeInTheDocument();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations with label', async () => {
      const { container } = render(
        <Checkbox checked={false} onChangeCallback={vi.fn()} label="Accept terms and conditions" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with aria-label', async () => {
      const { container } = render(
        <Checkbox checked={false} onChangeCallback={vi.fn()} ariaLabel="Select all items" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations when checked', async () => {
      const { container } = render(
        <Checkbox checked={true} onChangeCallback={vi.fn()} label="I agree" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
