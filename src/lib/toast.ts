'use client';

import { toast as reactToast, ToastOptions } from 'react-toastify';

type Theme = 'light' | 'dark' | 'colored';

interface CustomToastOptions extends ToastOptions {
  rtl?: boolean;
  theme?: Theme;
}

const defaultOptions: CustomToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'dark',
  rtl: true,
};

type ToastFunction = (message: string, options?: CustomToastOptions) => void;

export const toast: Record<'success' | 'error' | 'info' | 'warning', ToastFunction> = {
  success: (message, options) => {
    reactToast.success(message, { ...defaultOptions, ...options });
  },
  error: (message, options) => {
    reactToast.error(message, { ...defaultOptions, ...options });
  },
  info: (message, options) => {
    reactToast.info(message, { ...defaultOptions, ...options });
  },
  warning: (message, options) => {
    reactToast.warning(message, { ...defaultOptions, ...options });
  },
};

export const showToast = toast;
export default toast;
