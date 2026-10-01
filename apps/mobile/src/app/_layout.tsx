import { ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold, GeistMono_700Bold } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/text';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Login } from '@/login';
import { PlayerBar } from '@/player-bar';
import { QuickCapture } from '@/quick-capture';
import { SessionProvider, useSession } from '@/lib/session';
import { C, F } from '@/theme';

const TABS = [
  { name: 'index', title: 'Command', glyph: '◈' },
  { name: 'tasks', title: 'Tasks', glyph: '☑' },
  { name: 'habits', title: 'Habits', glyph: '↻' },
  { name: 'calendar', title: 'Calendar', glyph: '▦' },
  { name: 'more', title: 'More', glyph: '≡' },
] as const;

// Reachable from the More menu; kept in the router but out of the tab bar.
const HIDDEN = ['quests', 'goals', 'notes', 'workouts', 'finance', 'jobs', 'analytics', 'trophies', 'settings'] as const;

function Shell() {
  const insets = useSafeAreaInsets();
  const [capturing, setCapturing] = useState(false);
  // Bumped after a capture so screens refetch whatever it may have created.
  const [epoch, setEpoch] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <PlayerBar key={`bar-${epoch}`} />
      <Tabs
        key={epoch}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: C.bg },
          tabBarStyle: { backgroundColor: C.sidebar, borderTopColor: C.line },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: { fontSize: 10, letterSpacing: 1.2, fontFamily: F.display, textTransform: 'uppercase' },
        }}>
        {TABS.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{t.glyph}</Text> }} />
        ))}
        {HIDDEN.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
      <Pressable accessibilityLabel="Quick capture" onPress={() => setCapturing(true)} style={{ position: 'absolute', right: 18, bottom: 72 + insets.bottom, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }}>
        <Text style={{ fontSize: 28, color: C.accentFg, marginTop: -2 }}>+</Text>
      </Pressable>
      {capturing ? (
        <QuickCapture
          onClose={() => setCapturing(false)}
          onDone={() => {
            setCapturing(false);
            setEpoch((n) => n + 1);
          }}
        />
      ) : null}
    </View>
  );
}

function Gate() {
  const { ready, signedIn, settings } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  return signedIn ? <Shell /> : <Login key={`${settings.baseUrl}|${settings.cfClientId}|${settings.cfClientSecret}`} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ChakraPetch_600SemiBold, ChakraPetch_700Bold, GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold, GeistMono_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
