import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/text';
import * as Haptics from 'expo-haptics';

import { C, F } from './theme';

export const tap = () => void Haptics.selectionAsync().catch(() => {});
export const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

/** Section label: glowing marker, display type, a rule trailing off (the web's SectionHeading). */
export function Label({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={{ width: 3, height: 11, backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }} />
      <Text style={s.label}>{String(children).toUpperCase()}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
    </View>
  );
}

/** Framed HUD panel: gradient body, corner brackets (the website's hud-panel). */
export function Panel({ title, accent, children, style }: { title?: string; accent?: string; children: ReactNode; style?: ViewStyle }) {
  const bracket = accent ?? C.accent;
  return (
    <View style={[s.panel, accent ? { borderColor: accent } : null, style]}>
      <LinearGradient colors={['#19191c', '#111114']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderColor: bracket }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderColor: bracket }} />
      {title ? <Label>{title}</Label> : null}
      {children}
    </View>
  );
}

export function Bar({ pct, color = C.accent }: { pct: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, shadowColor: color, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
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
      style={[s.check, on && { backgroundColor: C.accent, borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }, disabled && !on && { opacity: 0.35 }]}>
      {on ? <Text style={{ color: C.accentFg, fontWeight: '800' }}>✓</Text> : null}
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
  label: { color: C.muted, fontSize: 11, letterSpacing: 2.2, fontFamily: F.display },
  panel: { backgroundColor: C.panelBottom, borderColor: C.line, borderWidth: 1, borderRadius: 2, padding: 14, marginBottom: 14 },
  track: { height: 8, backgroundColor: '#ffffff17', borderRadius: 1, overflow: 'visible' },
  check: { width: 24, height: 24, borderWidth: 1, borderColor: C.input, backgroundColor: '#ffffff0d', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  xp: { borderColor: '#f0bb3b59', borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomColor: '#ffffff0f', borderBottomWidth: 1 },
  h2: { color: C.text, fontSize: 20, fontFamily: F.display, fontWeight: '600' },
  body: { color: C.text, fontSize: 14, flex: 1 },
  input: { backgroundColor: '#ffffff0d', borderColor: C.input, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontSize: 15 },
  primary: { backgroundColor: C.accent, padding: 12, borderRadius: 6, alignItems: 'center' },
  primaryText: { color: C.accentFg, fontWeight: '700', letterSpacing: 1 },
});
