// Shared building blocks for the module screens: segmented tabs, bottom sheet, form fields, chips, charts.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, View, type TextInputProps } from 'react-native';
import { Text, TextInput } from '@/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F } from './theme';
import { Bar, Muted, s, tap } from './ui';

export const pretty = (x: string | null | undefined) => (x ? x.charAt(0) + x.slice(1).toLowerCase().replace(/_/g, ' ') : '');
export const money = (n: number | null | undefined, currency = 'INR') => (n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n));

/** A module screen. The header already shows the path, so (like the website) the page starts with its tabs; `action` sits top-right. */
export function Screen({ action, onRefresh, refreshing, children }: { title?: string; action?: ReactNode; onRefresh?: () => void; refreshing?: boolean; children: ReactNode; back?: boolean }) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} tintColor={C.accent} onRefresh={onRefresh} /> : undefined}>
      {action ? <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>{action}</View> : null}
      {children}
    </ScrollView>
  );
}

export function Btn({ label, onPress, kind = 'primary', disabled, style }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: object }) {
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? '#f75d5933' : '#ffffff0d';
  const border = kind === 'primary' ? C.accent : kind === 'danger' ? 'transparent' : C.input;
  const color = kind === 'primary' ? C.accentFg : kind === 'danger' ? C.destructive : C.text;
  return (
    <Pressable disabled={disabled} onPress={() => { tap(); onPress(); }} style={[{ backgroundColor: bg, borderColor: border, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', ...(kind === 'primary' ? { shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : null) }, disabled && { opacity: 0.45 }, style]}>
      <Text style={{ color, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** The web's module tab bar: uppercase display type, a lit bottom edge on the active tab. */
export function Seg<T extends string>({ tabs, value, onChange }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }} contentContainerStyle={{ gap: 4 }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <Pressable key={t.id} onPress={() => { tap(); onChange(t.id); }} style={{ paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: on ? C.accent : 'transparent', marginBottom: -1 }}>
            <Text style={{ color: on ? C.accent : C.muted, fontSize: 12, letterSpacing: 1.6, fontFamily: F.display, textTransform: 'uppercase', ...(on ? { textShadowColor: C.accent, textShadowRadius: 8 } : null) }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Single-select chips; tapping the active chip clears it when `clearable`. */
export function Chips<T extends string>({ value, onChange, options, clearable }: { value: T | ''; onChange: (v: T | '') => void; options: readonly { value: T; label: string }[]; clearable?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { tap(); onChange(on && clearable ? '' : o.value); }} style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 6, borderWidth: 1, borderColor: on ? C.accent : C.input, backgroundColor: on ? '#4fcb6f24' : '#ffffff0d' }}>
            <Text style={{ color: on ? C.accent : C.muted, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const opts = <T extends string>(values: readonly T[]) => values.map((v) => ({ value: v, label: pretty(v) }));

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.label, { marginBottom: 8, fontSize: 10, letterSpacing: 1.8 }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export function Input({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, style]} />;
}

/** ISO date entry with quick buttons; the keyboard shows digits and dashes only. */
export function DateInput({ value, onChange, placeholder = 'YYYY-MM-DD' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const iso = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  return (
    <View style={{ gap: 6 }}>
      <Input value={value} onChangeText={onChange} placeholder={placeholder} keyboardType="numbers-and-punctuation" maxLength={10} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[['Today', 0], ['Tomorrow', 1], ['+1 week', 7]].map(([label, off]) => (
          <Pressable key={String(label)} onPress={() => onChange(iso(off as number))} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: C.line }}><Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text></Pressable>
        ))}
        {value ? <Pressable onPress={() => onChange('')} style={{ paddingVertical: 4, paddingHorizontal: 10 }}><Text style={{ color: C.muted, fontSize: 12 }}>Clear</Text></Pressable> : null}
      </View>
    </View>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#000a' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: C.popover, borderTopLeftRadius: 8, borderTopRightRadius: 8, maxHeight: '88%', borderColor: C.line, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
            <Text style={s.h2}>{title}</Text>
            <Pressable hitSlop={12} onPress={onClose}><Text style={{ color: C.accent }}>Close</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 24 + insets.bottom }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Row({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return onPress ? <Pressable onPress={onPress} style={s.row}>{children}</Pressable> : <View style={s.row}>{children}</View>;
}

export function Pill({ label, color = C.muted }: { label: string; color?: string }) {
  return <View style={{ borderColor: color, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 }}><Text style={{ color, fontSize: 10, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text></View>;
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={{ width: '50%', marginBottom: 14 }}>
      <Muted>{label}</Muted>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      {sub ? <Muted style={{ fontSize: 11 }}>{sub}</Muted> : null}
    </View>
  );
}
export const StatGrid = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>;

export function Progress({ label, pct, right, color }: { label: string; pct: number; right?: string; color?: string }) {
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}><Text style={{ color: C.text, flex: 1 }}>{label}</Text><Muted>{right ?? `${Math.round(pct)}%`}</Muted></View>
      <Bar pct={pct} color={color} />
    </View>
  );
}

export function Bars({ rows, format = (n: number) => String(Math.round(n)) }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}><Muted>{r.label}</Muted><Text style={{ color: C.text, fontSize: 12 }}>{format(r.value)}</Text></View>
          <Bar pct={(r.value / max) * 100} />
        </View>
      ))}
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Muted>{children}</Muted>;
}
