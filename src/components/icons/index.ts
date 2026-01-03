/**
 * Icon Components Barrel Export
 *
 * Centralized export file for all icon components.
 * Import icons from this file for tree-shaking and easy access:
 *
 * @example
 * import { CaretUpRedIcon, DownloadIcon, SearchIcon } from '@/components/icons';
 */

// ============================================================
// NAVIGATION ICONS
// ============================================================

// Caret Up Icon (6 variants)
export { default as CaretUpIcon } from './navigation/CaretUpIcon';
export {
  CaretUpRedIcon,
  CaretUpGreyIcon,
  CaretUpGreyLightIcon,
  CaretUpBlueIcon,
  CaretUpBlackIcon,
  CaretUpWhiteIcon,
} from './navigation/CaretUpIcon';
export type { CaretUpIconProps } from './navigation/CaretUpIcon';

// Caret Down Icon (6 variants)
export { default as CaretDownIcon } from './navigation/CaretDownIcon';
export {
  CaretDownRedIcon,
  CaretDownGreyIcon,
  CaretDownGreyLightIcon,
  CaretDownBlueIcon,
  CaretDownBlackIcon,
  CaretDownWhiteIcon,
} from './navigation/CaretDownIcon';
export type { CaretDownIconProps } from './navigation/CaretDownIcon';

// Caret Left Icon (6 variants)
export { default as CaretLeftIcon } from './navigation/CaretLeftIcon';
export {
  CaretLeftRedIcon,
  CaretLeftGreyIcon,
  CaretLeftGreyLightIcon,
  CaretLeftBlueIcon,
  CaretLeftBlackIcon,
  CaretLeftWhiteIcon,
} from './navigation/CaretLeftIcon';
export type { CaretLeftIconProps } from './navigation/CaretLeftIcon';

// Caret Right Icon (6 variants)
export { default as CaretRightIcon } from './navigation/CaretRightIcon';
export {
  CaretRightRedIcon,
  CaretRightGreyIcon,
  CaretRightGreyLightIcon,
  CaretRightBlueIcon,
  CaretRightBlackIcon,
  CaretRightWhiteIcon,
} from './navigation/CaretRightIcon';
export type { CaretRightIconProps } from './navigation/CaretRightIcon';

// Arrow Right Icon (4 variants)
export { default as ArrowRightIcon } from './navigation/ArrowRightIcon';
export {
  ArrowRightBlueIcon,
  ArrowRightWhiteIcon,
  ArrowRightRedIcon,
  ArrowRightBlackIcon,
} from './navigation/ArrowRightIcon';
export type { ArrowRightIconProps } from './navigation/ArrowRightIcon';

// ============================================================
// ACTION ICONS
// ============================================================

// Download Icon (3 variants)
export { default as DownloadIcon } from './actions/DownloadIcon';
export {
  DownloadRedIcon,
  DownloadBlueIcon,
  DownloadBlackIcon,
} from './actions/DownloadIcon';
export type { DownloadIconProps } from './actions/DownloadIcon';

// Share Icon
export { default as ShareIcon } from './actions/ShareIcon';
export type { ShareIconProps } from './actions/ShareIcon';

// External Link Icon (4 variants)
export { default as ExternalLinkIcon } from './actions/ExternalLinkIcon';
export {
  ExternalLinkRedIcon,
  ExternalLinkBlueIcon,
  ExternalLinkBlackIcon,
  ExternalLinkWhiteIcon,
} from './actions/ExternalLinkIcon';
export type { ExternalLinkIconProps } from './actions/ExternalLinkIcon';

// Quote Icon (2 variants)
export { default as QuoteIcon } from './actions/QuoteIcon';
export {
  QuoteRedIcon,
  QuoteBlackIcon,
} from './actions/QuoteIcon';
export type { QuoteIconProps } from './actions/QuoteIcon';

// ============================================================
// UI ICONS
// ============================================================

// Burger Menu Icon
export { default as BurgerIcon } from './ui/BurgerIcon';
export type { BurgerIconProps } from './ui/BurgerIcon';

// Search Icon
export { default as SearchIcon } from './ui/SearchIcon';
export type { SearchIconProps } from './ui/SearchIcon';

// Close Icon (2 variants)
export { default as CloseIcon } from './ui/CloseIcon';
export {
  CloseRedIcon,
  CloseBlackIcon,
} from './ui/CloseIcon';
export type { CloseIconProps } from './ui/CloseIcon';

// File Icon (2 variants)
export { default as FileIcon } from './ui/FileIcon';
export {
  FileGreyIcon,
  FileBlueIcon,
} from './ui/FileIcon';
export type { FileIconProps } from './ui/FileIcon';

// User Icon
export { default as UserIcon } from './ui/UserIcon';
export type { UserIconProps } from './ui/UserIcon';

// ============================================================
// SOCIAL ICONS
// ============================================================

// Facebook Icon
export { default as FacebookIcon } from './social/FacebookIcon';
export type { FacebookIconProps } from './social/FacebookIcon';

// Twitter/X Icon
export { default as TwitterIcon } from './social/TwitterIcon';
export type { TwitterIconProps } from './social/TwitterIcon';

// LinkedIn Icon
export { default as LinkedinIcon } from './social/LinkedinIcon';
export type { LinkedinIconProps } from './social/LinkedinIcon';

// Mail Icon
export { default as MailIcon } from './social/MailIcon';
export type { MailIconProps } from './social/MailIcon';

/**
 * Icon Color Constants
 *
 * Standard colors used across icon components for brand consistency
 */
export const ICON_COLORS = {
  red: '#C1002A',        // Episciences brand red
  blue: '#2563EB',       // Primary blue
  grey: '#6B7280',       // Grey 500
  greyLight: '#D1D5DB',  // Grey 300
  black: '#000000',
  white: '#FFFFFF',
} as const;
