import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: '12px',
          background: '#1f2937',
          color: '#f9fafb',
          fontSize: '14px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          duration: 3000,
          iconTheme: { primary: '#14b8a6', secondary: '#f9fafb' },
        },
        error: {
          duration: 3000,
          iconTheme: { primary: '#ef4444', secondary: '#f9fafb' },
        },
      }}
    />
  );
}
