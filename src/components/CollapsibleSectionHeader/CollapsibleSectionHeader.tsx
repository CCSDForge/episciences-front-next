'use client';

import { ElementType, ReactNode } from 'react';
import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
import { handleKeyboardClick } from '@/utils/keyboard';

export interface CollapsibleSectionHeaderProps {
  /** Class(es) for the clickable trigger element. Pass the full string, including any conditional modifier. */
  readonly triggerClassName: string;
  /** Class for the heading/text element. Omitted entirely (no attribute) when not provided. */
  readonly headingClassName?: string;
  /** Class for the caret icon. Omitted entirely (no attribute) when not provided. */
  readonly caretClassName?: string;
  /** Element type wrapping `title` - a heading level, or a plain tag when the trigger isn't a real heading. Defaults to 'h2'. */
  readonly as?: ElementType;
  /** id placed on the heading element, e.g. as a scroll anchor target. */
  readonly headingId?: string;
  /** id of the content region this header controls; wired to aria-controls when provided. */
  readonly controlsId?: string;
  readonly title: ReactNode;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly collapseLabel?: string;
  readonly expandLabel?: string;
  readonly caretSize?: number;
}

/**
 * Trigger for a collapsible content section: role="button" + heading + caret icon,
 * with click/keyboard toggling and aria-expanded wired up.
 *
 * Used by every "page with collapsible H2 sections" pattern in the app (About, Credits,
 * For Authors, Boards, Statistics, Article details) so the toggle wiring only needs to
 * be reasoned about - and fixed - in one place.
 */
export default function CollapsibleSectionHeader({
  triggerClassName,
  headingClassName,
  caretClassName,
  as: HeadingTag = 'h2',
  headingId,
  controlsId,
  title,
  isOpen,
  onToggle,
  collapseLabel = 'Collapse section',
  expandLabel = 'Expand section',
  caretSize = 16,
}: CollapsibleSectionHeaderProps): React.JSX.Element {
  return (
    <div
      className={triggerClassName}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-controls={controlsId}
      onClick={onToggle}
      onKeyDown={e => handleKeyboardClick(e, onToggle)}
    >
      <HeadingTag id={headingId} className={headingClassName}>
        {title}
      </HeadingTag>
      {isOpen ? (
        <CaretUpBlackIcon size={caretSize} className={caretClassName} ariaLabel={collapseLabel} />
      ) : (
        <CaretDownBlackIcon size={caretSize} className={caretClassName} ariaLabel={expandLabel} />
      )}
    </div>
  );
}
