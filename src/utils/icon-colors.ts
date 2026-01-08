/**
 * Icon Color Constants
 *
 * Standard colors used across icon components for brand consistency.
 * These colors match the Episciences brand guidelines and design system.
 */

export const ICON_COLORS = {
  /** Episciences brand red - Primary brand color */
  red: '#C1002A',

  /** Primary blue - Used for interactive elements and links */
  blue: '#2563EB',

  /** Grey 500 - Standard grey for inactive/secondary elements */
  grey: '#6B7280',

  /** Grey 300 - Light grey for disabled states */
  greyLight: '#D1D5DB',

  /** Black - High contrast text and icons */
  black: '#000000',

  /** White - Icons on dark backgrounds */
  white: '#FFFFFF',
} as const;

/**
 * Type for icon color values
 */
export type IconColor = (typeof ICON_COLORS)[keyof typeof ICON_COLORS];
