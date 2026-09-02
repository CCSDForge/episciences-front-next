import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CollapsibleSectionHeader from '../CollapsibleSectionHeader';

describe('CollapsibleSectionHeader', () => {
  it('renders the title inside an h2 by default, with the given classes', () => {
    const { container } = render(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        headingClassName="section-subtitle-text"
        caretClassName="section-subtitle-caret"
        title="Aim & Scope"
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Aim & Scope' });
    expect(heading).toHaveClass('section-subtitle-text');
    expect(container.querySelector('.section-subtitle')).toHaveAttribute('role', 'button');
    expect(container.querySelector('.section-subtitle-caret')).toBeInTheDocument();
  });

  it('renders as a plain element (not a heading) when `as` is overridden', () => {
    render(
      <CollapsibleSectionHeader
        as="div"
        triggerClassName="row-title"
        title="At a glance"
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('At a glance')).toBeInTheDocument();
  });

  it('omits the heading className attribute entirely when none is given', () => {
    render(
      <CollapsibleSectionHeader
        triggerClassName="group-title"
        title="Editors"
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Editors' });
    expect(heading).not.toHaveAttribute('class');
  });

  it('reflects isOpen via aria-expanded and swaps the caret icon', () => {
    const { rerender } = render(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        title="Section"
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Collapse section')).toBeInTheDocument();

    rerender(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        title="Section"
        isOpen={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Expand section')).toBeInTheDocument();
  });

  it('uses custom collapse/expand labels when provided', () => {
    render(
      <CollapsibleSectionHeader
        triggerClassName="group-title"
        title="Editors"
        isOpen={true}
        onToggle={vi.fn()}
        collapseLabel="Collapse group"
        expandLabel="Expand group"
      />
    );

    expect(screen.getByLabelText('Collapse group')).toBeInTheDocument();
  });

  it('wires aria-controls to the given id, and heading id to headingId', () => {
    render(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        headingId="aim-scope"
        controlsId="section-content-aim-scope"
        title="Aim & Scope"
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-controls',
      'section-content-aim-scope'
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'aim-scope');
  });

  it('calls onToggle on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        title="Section"
        isOpen={true}
        onToggle={onToggle}
      />
    );

    await user.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle on Enter and Space, and ignores other keys', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        title="Section"
        isOpen={true}
        onToggle={onToggle}
      />
    );

    const trigger = screen.getByRole('button');
    trigger.focus();

    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(2);

    await user.keyboard('{Escape}');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('is keyboard-focusable via tabIndex', () => {
    render(
      <CollapsibleSectionHeader
        triggerClassName="section-subtitle"
        title="Section"
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });
});
