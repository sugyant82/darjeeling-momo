'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

type ToastKind = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  /** Set shortly before removal so the toast can animate out. */
  leaving?: boolean;
}
interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

const VISIBLE_MS = 4000;
const EXIT_MS = 300; // matches the .toast.is-leaving animation in globals.css

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle } as const;

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const api = useMemo<ToastApi>(
    () => ({
      show(message: string, kind: ToastKind = 'info') {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, message, kind }]);
        setTimeout(
          () => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))),
          VISIBLE_MS - EXIT_MS,
        );
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), VISIBLE_MS);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={`toast${t.kind === 'info' ? '' : ` toast-${t.kind}`}${t.leaving ? ' is-leaving' : ''}`}
              role="status"
            >
              <Icon size={20} aria-hidden="true" />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
