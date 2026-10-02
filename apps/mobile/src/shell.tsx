// The website's app shell on a phone: a sticky header (menu, ~/path, player chip, quick capture) and the
// module sidebar as a slide-out sheet, in place of a bottom tab bar.
import { useRouter, usePathname, type Href } from 'expo-router';
import { Briefcase, Calendar as CalendarIcon, CalendarCheck, ChartNoAxesCombined, Dumbbell, Home as HomeIcon, ListChecks, ListTodo, LogOut, Mail, ShieldCheck, PanelLeft, Settings, StickyNote, Target, Trophy, Wallet, Zap, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LevelBadge } from '@/hud';
import { usePlayer } from '@/lib/player';
import { useSession } from '@/lib/session';
import { Text } from '@/text';
import { C, F } from '@/theme';

interface NavItem { label: string; href: string; icon: LucideIcon }

/** Same modules and order as the website's sidebar (those that exist natively). */
export const NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: HomeIcon },
  { label: 'Quests', href: '/quests', icon: CalendarCheck },
  { label: 'Email', href: '/email', icon: Mail },
  { label: 'Tasks', href: '/tasks', icon: ListTodo },
  { label: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { label: 'Job Tracker', href: '/jobs', icon: Briefcase },
  { label: 'Notes', href: '/notes', icon: StickyNote },
  { label: 'Password Manager', href: '/vault', icon: ShieldCheck },
  { label: 'Finance', href: '/finance', icon: Wallet },
  { label: 'Habits', href: '/habits', icon: ListChecks },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Workouts', href: '/workouts', icon: Dumbbell },
  { label: 'Trophies', href: '/trophies', icon: Trophy },
  { label: 'Analytics', href: '/analytics', icon: ChartNoAxesCombined },
];

const segment = (pathname: string) => pathname.split('/').filter(Boolean)[0] ?? 'home';

export function Header({ onMenu, onCapture }: { onMenu: () => void; onCapture: () => void }) {
  const pathname = usePathname();
  const { player } = usePlayer();
  const router = useRouter();
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: '#0d0d0fcc' }}>
      <Pressable hitSlop={10} onPress={onMenu} accessibilityLabel="Open menu"><PanelLeft size={20} color={C.text} /></Pressable>
      <View style={{ width: 1, height: 16, backgroundColor: C.line }} />
      <Text style={{ color: C.muted, fontSize: 12 }}><Text style={{ color: C.accent }}>~/</Text>{segment(pathname)}</Text>
      <View style={{ flex: 1 }} />
      {player.ready ? (
        <Pressable onPress={() => router.navigate('/' as Href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {player.streak.current > 0 ? <Text style={{ color: '#fb923c', fontFamily: F.display, fontSize: 12 }}>🔥{player.streak.current}</Text> : null}
          <LevelBadge level={player.progress.level} rank={player.rank} size={34} />
        </Pressable>
      ) : null}
      <Pressable hitSlop={8} onPress={onCapture} accessibilityLabel="Quick capture" style={{ width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: C.input, backgroundColor: '#ffffff0d', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={16} color={C.accent} />
      </Pressable>
    </View>
  );
}

function Item({ icon: Icon, label, active, onPress, danger }: { icon: LucideIcon; label: string; active?: boolean; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, backgroundColor: active ? '#4fcb6f1f' : 'transparent', borderLeftWidth: 2, borderLeftColor: active ? C.accent : 'transparent' }}>
      <Icon size={16} color={danger ? C.destructive : active ? C.accent : `${C.text}cc`} />
      <Text style={{ color: danger ? C.destructive : active ? C.text : `${C.text}cc`, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { player } = usePlayer();
  const { settings, signOut } = useSession();
  const width = Math.min(300, Dimensions.get('window').width * 0.82);
  const [x] = useState(() => new Animated.Value(-width));

  useEffect(() => {
    Animated.timing(x, { toValue: open ? 0 : -width, duration: 220, useNativeDriver: true }).start();
  }, [open, x, width]);

  const go = (href: string) => { onClose(); router.navigate(href as Href); };
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={{ width, transform: [{ translateX: x }], backgroundColor: C.sidebar, borderRightWidth: 1, borderRightColor: '#ffffff14', paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10 }}>
            <Text style={{ color: C.accent, textShadowColor: C.accent, textShadowRadius: 10 }}>◆</Text>
            <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 14, letterSpacing: 4.2 }}>LIFE_OS</Text>
          </View>
          {player.ready ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10 }}>
              <LevelBadge level={player.progress.level} rank={player.rank} size={40} />
              <View>
                <Text style={{ color: C.text, fontFamily: F.display, fontSize: 13 }}>{player.rank.letter} · {player.rank.title}</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{player.progress.into.toLocaleString()} / {player.progress.span.toLocaleString()} XP</Text>
              </View>
            </View>
          ) : null}
          <View style={{ height: 1, backgroundColor: '#ffffff14', marginTop: 6 }} />
          <ScrollView contentContainerStyle={{ padding: 10 }}>
            <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 2, paddingHorizontal: 12, paddingVertical: 8 }}>MODULES</Text>
            {NAV.map((n) => <Item key={n.href} icon={n.icon} label={n.label} active={isActive(n.href)} onPress={() => go(n.href)} />)}
          </ScrollView>
          <View style={{ height: 1, backgroundColor: '#ffffff14' }} />
          <View style={{ padding: 10, gap: 2 }}>
            <Item icon={Settings} label="Settings" active={isActive('/settings')} onPress={() => go('/settings')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: '#4fcb6f26', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.accent, fontSize: 9, fontWeight: '600' }}>{(settings.email || '?').slice(0, 1).toUpperCase()}</Text></View>
              <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, flex: 1 }}>{settings.email || 'Signed in'}</Text>
            </View>
            <Item icon={LogOut} label="Log out" danger onPress={() => { onClose(); void signOut(); }} />
          </View>
        </Animated.View>
        <Pressable style={{ flex: 1, backgroundColor: '#00000099' }} onPress={onClose} />
      </View>
    </Modal>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>;
}
