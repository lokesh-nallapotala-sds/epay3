import { createContext, type ReactNode, useContext } from 'react';

import { Bounce, toast, ToastContainer, ToastOptions } from 'react-toastify';
import { isMaintenanceUnavailableRedirectPending } from 'utilities/maintenance';

type ToastMessageValue =
  | string
  | Error
  | {
      message?: string;
      text?: string;
      error?: string;
      message_line_string?: string;
    };

interface ToastType {
  showToastMessage: (
    type: 'error' | 'success' | 'info' | 'warning',
    message: ToastMessageValue,
    showIndefinite?: boolean | undefined,
  ) => void;
  clearMessages: () => void;
}

export const EpayToastContext = createContext<ToastType | undefined>(undefined);

export const useEpayToast = () => {
  const context = useContext(EpayToastContext);

  if (!context) {
    throw new Error('Toast context can only be used within EpayToast provider');
  }

  return context;
};

const resolveToastMessage = (
  message: ToastMessageValue,
  fallback: string = 'An error occurred',
): string => {
  if (message && typeof message === 'object') {
    const errorRecord = message as {
      message?: unknown;
      text?: unknown;
      error?: unknown;
    };

    if (
      typeof errorRecord.message === 'string' &&
      errorRecord.message.length > 0
    ) {
      return resolveToastMessage(errorRecord.message, fallback);
    }

    if (typeof errorRecord.text === 'string' && errorRecord.text.length > 0) {
      return errorRecord.text;
    }

    if (typeof errorRecord.error === 'string' && errorRecord.error.length > 0) {
      return errorRecord.error;
    }
  }

  const rawMessage =
    typeof message === 'string' ? message : String(message ?? fallback);

  try {
    const parsed = JSON.parse(rawMessage);
    return (
      parsed?.message_line_string ||
      parsed?.message ||
      parsed?.error ||
      fallback
    );
  } catch {
    return rawMessage;
  }
};

export default function EpayToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const options: ToastOptions = {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    theme: 'light',
    transition: Bounce,
  };

  const clearMessages = () => {
    toast.dismiss();
  };

  const showToastMessage = (
    type: 'error' | 'success' | 'info' | 'warning',
    message: ToastMessageValue,
    showIndefinite?: boolean | undefined,
  ) => {
    if (type === 'error' && isMaintenanceUnavailableRedirectPending()) {
      return;
    }

    const newOptions = JSON.parse(JSON.stringify(options));
    const toastMessage =
      typeof message === 'string' ? message : String(message ?? '');
    const normalizedMessage = resolveToastMessage(message, toastMessage);

    if (showIndefinite) {
      newOptions.autoClose = false;
    }

    switch (type) {
      case 'error':
        toast.error(normalizedMessage, newOptions);
        break;
      case 'success':
        toast.success(normalizedMessage, newOptions);
        break;
      case 'info':
        toast.info(normalizedMessage, newOptions);
        break;
      case 'warning':
        toast.warning(normalizedMessage, newOptions);
        break;
    }
  };

  return (
    <EpayToastContext.Provider
      value={{
        clearMessages,
        showToastMessage,
      }}
    >
      <ToastContainer />
      {children}
    </EpayToastContext.Provider>
  );
}
