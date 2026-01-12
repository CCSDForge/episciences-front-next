'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Toast notification container with accessibility improvements.
 *
 * Features:
 * - autoClose set to 8000ms (8 seconds) per WCAG 2.2.1 Level A
 * - pauseOnHover and pauseOnFocusLoss for user control
 * - ARIA attributes for screen reader announcements
 * - Non-draggable for better accessibility
 * - Progress bar visible to show remaining time
 *
 * WCAG Compliance:
 * - 2.2.1 Timing Adjustable (Level A): 8 seconds minimum for messages
 * - 4.1.3 Status Messages (Level AA): ARIA live region announcements
 */
export default function ToastContainerWrapper() {
  return (
    <ToastContainer
      bodyClassName="toast-message"
      position="top-right"
      autoClose={8000} // 8 seconds (WCAG 2.2.1 Level A minimum)
      closeOnClick={true}
      pauseOnFocusLoss={true}
      pauseOnHover={true}
      draggable={false}
      hideProgressBar={false} // Show progress bar for timing visibility
      newestOnTop={false}
      rtl={false}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    />
  );
}
