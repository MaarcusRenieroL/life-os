// Shared building blocks for the module screens: segmented tabs, bottom sheet, form fields, chips, charts.
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from './theme';
import { Bar, Muted, s, tap } from './ui';

export const pretty = (x: string | null | undefined) => (x ? x.charAt(0) + x.slice(1).toLowerCase().replace(/_/g, ' ') : '');
export const money = (n: number | null | undefined, currency = 'INR') => (n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n));

/** A module screen: back button, title, optional action, pull-to-refresh. */
export function Screen({ title, action, onRefresh, refreshing, children, back = true }: { title: string; action?: ReactNode; onRefresh?: () => void; refreshing?: boolean; children: ReactNode; back?: boolean }) {
  const router = useRouter();
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 140 }} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} tintColor={C.accent} onRefresh={onRefresh} /> : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        {back ? <Pressable hitSlop={12} onPress={() => router.canGoBack() ? router.back() : router.navigate('/more')}><Text style={{ color: C.accent, fontSize: 24 }}>‹</Text></Pressable> : null}
        <Text style={[s.h2, { flex: 1 }]}>{title}</Text>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}

export function Btn({ label, onPress, kind = 'primary', disabled, style }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: object }) {
  const bg = kind === 'primary' ? C.accent : 'transparent';
  const border = kind === 'danger' ? C.magenta : kind === 'ghost' ? C.line : C.accent;
  const color = kind === 'primary' ? '#06120d' : kind === 'danger' ? C.magenta : C.text;
  return (
    <Pressable disabled={disabled} onPress={() => { tap(); onPress(); }} style={[{ backgroundColor: bg, borderColor: border, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 4, alignItems: 'center' }, disabled && { opacity: 0.45 }, style]}>
      <Text style={{ color, fontWeight: kind === 'primary' ? '800' : '600', letterSpacing: kind === 'primary' ? 0.8 : 0 }}>{label}</Text>
    </Pressable>
  );
}

export function Seg<T extends string>({ tabs, value, onChange }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
      {tabs.map((t) => (
        <Pressable key={t.id} onPress={() => { tap(); onChange(t.id); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: t.id === value ? C.accent : C.line, backgroundColor: t.id === value ? '#101a17' : 'transparent' }}>
          <Text style={{ color: t.id === value ? C.accent : C.muted, fontSize: 13 }}>{t.label}</Text>
        </Pressable>
      ))}
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
          <Pressable key={o.value} onPress={() => { tap(); onChange(on && clearable ? '' : o.value); }} style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? '#101a17' : 'transparent' }}>
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
      <Text style={s.label}>{label.toUpperCase()}</Text>
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
        <View style={{ backgroundColor: C.panel, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '88%', borderColor: C.line, borderWidth: 1 }}>
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
