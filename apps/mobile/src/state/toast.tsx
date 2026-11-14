import { createContext, useContext, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/lib/theme';

type ToastKind = 'info' | 'success' | 'error';
interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);

  const api = useMemo<ToastApi>(
    () => ({
      show(message, kind = 'info') {
        setToast({ message, kind });
        setTimeout(() => setToast(null), 3500);
      },
    }),
    [],
  );

  const bg =
    toast?.kind === 'success' ? colors.tealeaf : toast?.kind === 'error' ? colors.achar : colors.indigo;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View style={[s.wrap]} pointerEvents="none">
          <View style={[s.toast, { backgroundColor: bg }]}>
            <Text style={s.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center', paddingHorizontal: spacing.lg },
  toast: { borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, maxWidth: 480 },
  text: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
