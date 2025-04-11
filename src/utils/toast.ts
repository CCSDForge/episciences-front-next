import { toast, Bounce } from 'react-toastify';

export const toastSuccess = (message: string): void => {
  toast.success(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: true,
    closeButton: false,
    pauseOnHover: false,
    theme: "light",
    transition: Bounce,
  });
} 