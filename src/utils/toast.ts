import { toast } from 'react-toastify';

/**
 * Display a success toast with accessibility improvements.
 * Uses the global ToastContainerWrapper configuration (8 seconds, pauseOnHover, etc.)
 * @param message - The success message to display
 */
export const toastSuccess = (message: string): void => {
  toast.success(message);
};

/**
 * Display an error toast with accessibility improvements.
 * Uses the global ToastContainerWrapper configuration (8 seconds, pauseOnHover, etc.)
 * @param message - The error message to display
 */
export const toastError = (message: string): void => {
  toast.error(message);
};

/**
 * Display an info toast with accessibility improvements.
 * Uses the global ToastContainerWrapper configuration (8 seconds, pauseOnHover, etc.)
 * @param message - The info message to display
 */
export const toastInfo = (message: string): void => {
  toast.info(message);
};

/**
 * Display a warning toast with accessibility improvements.
 * Uses the global ToastContainerWrapper configuration (8 seconds, pauseOnHover, etc.)
 * @param message - The warning message to display
 */
export const toastWarning = (message: string): void => {
  toast.warning(message);
};
