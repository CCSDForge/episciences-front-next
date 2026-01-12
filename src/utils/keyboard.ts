/**
 * Keyboard Interaction Utilities
 *
 * Provides standardized keyboard event handling for accessible interactive elements.
 * Use these utilities when converting non-native interactive elements (divs, spans)
 * to be keyboard accessible.
 *
 * WCAG 2.1.1 Keyboard (Level A): All functionality must be available via keyboard.
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
 */

/**
 * Standard key codes for keyboard interactions
 */
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Handle click-like keyboard events (Enter and Space)
 *
 * Use this for elements that should behave like buttons:
 * - Toggles (expand/collapse, show/hide)
 * - Navigation items
 * - Custom controls
 *
 * @param event - Keyboard event
 * @param callback - Function to call when Enter or Space is pressed
 * @param options - Optional configuration
 *
 * @example
 * <div
 *   role="button"
 *   tabIndex={0}
 *   onClick={handleClick}
 *   onKeyDown={(e) => handleKeyboardClick(e, handleClick)}
 * >
 *   Click me
 * </div>
 */
export function handleKeyboardClick(
  event: React.KeyboardEvent,
  callback: (event: React.KeyboardEvent | React.MouseEvent) => void,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {}
): void {
  const { preventDefault = true, stopPropagation = false } = options;

  // Only handle Enter and Space keys
  if (event.key === Keys.ENTER || event.key === Keys.SPACE) {
    if (preventDefault) {
      event.preventDefault(); // Prevent default behavior (e.g., page scroll on Space)
    }
    if (stopPropagation) {
      event.stopPropagation();
    }

    callback(event);
  }
}

/**
 * Handle navigation keyboard events (Arrow keys, Home, End)
 *
 * Use this for navigating lists, menus, or collections of items.
 *
 * @param event - Keyboard event
 * @param callbacks - Object with callback functions for each navigation action
 *
 * @example
 * <div
 *   role="listbox"
 *   onKeyDown={(e) => handleKeyboardNavigation(e, {
 *     onArrowDown: () => selectNext(),
 *     onArrowUp: () => selectPrevious(),
 *     onHome: () => selectFirst(),
 *     onEnd: () => selectLast(),
 *   })}
 * >
 *   {items.map(item => ...)}
 * </div>
 */
export function handleKeyboardNavigation(
  event: React.KeyboardEvent,
  callbacks: {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
  }
): void {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    onEnter,
    onSpace,
    onEscape,
  } = callbacks;

  let handled = false;

  switch (event.key) {
    case Keys.ARROW_UP:
      if (onArrowUp) {
        onArrowUp();
        handled = true;
      }
      break;
    case Keys.ARROW_DOWN:
      if (onArrowDown) {
        onArrowDown();
        handled = true;
      }
      break;
    case Keys.ARROW_LEFT:
      if (onArrowLeft) {
        onArrowLeft();
        handled = true;
      }
      break;
    case Keys.ARROW_RIGHT:
      if (onArrowRight) {
        onArrowRight();
        handled = true;
      }
      break;
    case Keys.HOME:
      if (onHome) {
        onHome();
        handled = true;
      }
      break;
    case Keys.END:
      if (onEnd) {
        onEnd();
        handled = true;
      }
      break;
    case Keys.ENTER:
      if (onEnter) {
        onEnter();
        handled = true;
      }
      break;
    case Keys.SPACE:
      if (onSpace) {
        event.preventDefault(); // Prevent page scroll
        onSpace();
        handled = true;
      }
      break;
    case Keys.ESCAPE:
      if (onEscape) {
        onEscape();
        handled = true;
      }
      break;
  }

  if (handled) {
    event.preventDefault();
  }
}

/**
 * Create props for making a div/span behave like a button
 *
 * Returns an object with role, tabIndex, and keyboard event handlers.
 * Spread these props onto your element.
 *
 * @param onClick - Click handler function
 * @param options - Optional configuration
 *
 * @example
 * <div
 *   {...createButtonProps(handleClick, { ariaLabel: 'Close dialog' })}
 *   className="custom-button"
 * >
 *   Close
 * </div>
 *
 * // Equivalent to:
 * <div
 *   role="button"
 *   tabIndex={0}
 *   aria-label="Close dialog"
 *   onClick={handleClick}
 *   onKeyDown={(e) => handleKeyboardClick(e, handleClick)}
 *   className="custom-button"
 * >
 *   Close
 * </div>
 */
export function createButtonProps(
  onClick: (event: React.KeyboardEvent | React.MouseEvent) => void,
  options: {
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaPressed?: boolean;
    ariaDisabled?: boolean;
    disabled?: boolean;
  } = {}
) {
  const { ariaLabel, ariaExpanded, ariaPressed, ariaDisabled, disabled } = options;

  return {
    role: 'button' as const,
    tabIndex: disabled ? -1 : 0,
    onClick: disabled ? undefined : onClick,
    onKeyDown: disabled ? undefined : (e: React.KeyboardEvent) => handleKeyboardClick(e, onClick),
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
    'aria-pressed': ariaPressed,
    'aria-disabled': ariaDisabled || disabled,
  };
}

/**
 * Check if an element should be focusable
 *
 * @param disabled - Whether the element is disabled
 * @returns tabIndex value (-1 if disabled, 0 if focusable)
 */
export function getTabIndex(disabled: boolean = false): number {
  return disabled ? -1 : 0;
}
