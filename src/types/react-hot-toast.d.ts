declare module 'react-hot-toast' {
  export type ToastPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

  export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'loading' | 'blank' | 'custom';
    icon?: JSX.Element;
    duration?: number;
    position?: ToastPosition;
  }

  export interface ToasterProps {
    position?: ToastPosition;
    reverseOrder?: boolean;
    toastOptions?: DefaultToastOptions;
    gutter?: number;
    containerStyle?: React.CSSProperties;
    containerClassName?: string;
  }

  export interface DefaultToastOptions {
    duration?: number;
    style?: React.CSSProperties;
    className?: string;
    success?: Partial<Toast>;
    error?: Partial<Toast>;
    loading?: Partial<Toast>;
  }

  export const Toaster: React.FC<ToasterProps>;

  export const toast: {
    (message: string, options?: Partial<Toast>): string;
    success: (message: string, options?: Partial<Toast>) => string;
    error: (message: string, options?: Partial<Toast>) => string;
    loading: (message: string, options?: Partial<Toast>) => string;
    custom: (jsx: JSX.Element, options?: Partial<Toast>) => string;
    dismiss: (toastId?: string) => void;
    remove: (toastId: string) => void;
  };

  export default toast;
}
