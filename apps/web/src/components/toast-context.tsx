'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type ToastKind = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}
interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const api = useMemo<ToastApi>(
    () => ({
      show(message: string, kind: ToastKind = 'info') {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, message, kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.kind === 'info' ? '' : `toast-${t.kind}`}`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
