'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ToastContainerWrapper() {
  return <ToastContainer bodyClassName="toast-message" position="top-right" autoClose={3666} />;
}
