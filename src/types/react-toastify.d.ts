declare module 'react-toastify' {
  import { ReactNode, Component } from 'react';

  export interface ToastContainerProps {
    position?:
      | 'top-right'
      | 'top-center'
      | 'top-left'
      | 'bottom-right'
      | 'bottom-center'
      | 'bottom-left';
    autoClose?: number | false;
    hideProgressBar?: boolean;
    newestOnTop?: boolean;
    closeOnClick?: boolean;
    rtl?: boolean;
    pauseOnFocusLoss?: boolean;
    draggable?: boolean;
    pauseOnHover?: boolean;
    theme?: 'light' | 'dark' | 'colored';
  }

  export class ToastContainer extends Component<ToastContainerProps> {}

  export interface ToastOptions {
    position?: ToastContainerProps['position'];
    autoClose?: ToastContainerProps['autoClose'];
    hideProgressBar?: boolean;
    closeOnClick?: boolean;
    pauseOnHover?: boolean;
    draggable?: boolean;
    progress?: number;
    theme?: 'light' | 'dark' | 'colored';
  }

  export const toast: {
    (message: ReactNode, options?: ToastOptions): React.ReactText;
    success(message: ReactNode, options?: ToastOptions): React.ReactText;
    info(message: ReactNode, options?: ToastOptions): React.ReactText;
    error(message: ReactNode, options?: ToastOptions): React.ReactText;
    warning(message: ReactNode, options?: ToastOptions): React.ReactText;
    dark(message: ReactNode, options?: ToastOptions): React.ReactText;
  };
}
