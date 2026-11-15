import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { colors, font, radii, shadows, spacing } from '@/lib/theme';
import { haptics } from '@/lib/haptics';

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

const VISIBLE_MS = 3500;
const MAX_STACK = 3;
const STYLE: Record<ToastKind, { bg: string; Icon: typeof Info }> = {
  info: { bg: colors.indigo, Icon: Info },
  success: { bg: colors.tealeaf, Icon: CheckCircle2 },
  error: { bg: colors.achar, Icon: AlertCircle },
};

/**
 * Toasts drop in from the top (clear of the tab bar and keyboard) and can be tapped away.
 * Note: on iOS, native modal sheets sit above this layer, so screens presented as modals show
 * their errors inline as well.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();

  const api = useMemo<ToastApi>(
    () => ({
      show(message, kind = 'info') {
        const id = ++nextId.current;
        setToasts((t) => [...t.slice(-(MAX_STACK - 1)), { id, message, kind }]);
        if (kind === 'success') haptics.success();
        else if (kind === 'error') haptics.error();
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), VISIBLE_MS);
      },
    }),
    [],
  );

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, s.layer, { paddingTop: insets.top + 8 }]}>
        {toasts.map((t) => {
          const { bg, Icon } = STYLE[t.kind];
          return (
            <Animated.View
              key={t.id}
              entering={FadeInUp.springify().damping(16).stiffness(180)}
              exiting={FadeOutUp.duration(220)}
              layout={LinearTransition.springify().damping(18)}
              style={s.slot}
            >
              <Pressable
                onPress={() => dismiss(t.id)}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                accessibilityHint="Tap to dismiss"
                style={[s.toast, { backgroundColor: bg }]}
              >
                <Icon color={colors.white} size={20} />
                <Text style={s.text}>{t.message}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const s = StyleSheet.create({
  layer: { alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, zIndex: 2000 },
  slot: { width: '100%', maxWidth: 480 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadows.float,
  },
  text: { flex: 1, color: colors.white, fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
});
