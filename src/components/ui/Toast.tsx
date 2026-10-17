import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: '#1f2937',
          color: '#f9fafb',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#14b8a6', secondary: '#f9fafb' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
      }}
    />
  );
}
