import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { C } from './theme';

export const tap = () => void Haptics.selectionAsync().catch(() => {});
export const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{String(children).toUpperCase()}</Text>;
}

export function Panel({ title, accent, children, style }: { title?: string; accent?: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[s.panel, accent ? { borderColor: accent } : null, style]}>
      {title ? <Label>{title}</Label> : null}
      {children}
    </View>
  );
}

export function Bar({ pct, color = C.accent }: { pct: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </View>
  );
}

export function Check({ on, disabled, onPress }: { on: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled || on}
      hitSlop={10}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.check, on && { backgroundColor: C.accent, borderColor: C.accent }, disabled && !on && { opacity: 0.35 }]}>
      {on ? <Text style={{ color: '#06120d', fontWeight: '800' }}>✓</Text> : null}
    </Pressable>
  );
}

export function Xp({ value }: { value: number }) {
  return (
    <View style={s.xp}>
      <Text style={{ color: C.gold, fontWeight: '700', fontSize: 12 }}>+{value}</Text>
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[{ color: C.muted, fontSize: 13 }, style]}>{children}</Text>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.magenta }}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry}>
          <Text style={{ color: C.accent, textDecorationLine: 'underline' }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const s = StyleSheet.create({
  label: { color: C.muted, fontSize: 11, letterSpacing: 1.6, marginBottom: 8 },
  panel: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 12 },
  track: { height: 7, backgroundColor: '#171c23', borderRadius: 2, overflow: 'hidden' },
  check: { width: 26, height: 26, borderWidth: 1, borderColor: C.muted, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  xp: { borderColor: '#4a3a16', borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomColor: '#171c23', borderBottomWidth: 1 },
  h2: { color: C.text, fontSize: 20, fontWeight: '700' },
  body: { color: C.text, fontSize: 15, flex: 1 },
  input: { backgroundColor: '#0b0e12', borderColor: C.line, borderWidth: 1, borderRadius: 4, padding: 12, color: C.text, fontSize: 16 },
  primary: { backgroundColor: C.accent, padding: 13, borderRadius: 4, alignItems: 'center' },
  primaryText: { color: '#06120d', fontWeight: '800', letterSpacing: 1 },
});
