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
