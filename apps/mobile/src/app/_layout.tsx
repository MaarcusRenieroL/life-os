import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Login } from '@/login';
import { PlayerBar } from '@/player-bar';
import { QuickCapture } from '@/quick-capture';
import { SessionProvider, useSession } from '@/lib/session';
import { C } from '@/theme';

const TABS = [
  { name: 'index', title: 'Command', glyph: '◈' },
  { name: 'quests', title: 'Quests', glyph: '⚔' },
  { name: 'tasks', title: 'Tasks', glyph: '☑' },
  { name: 'habits', title: 'Habits', glyph: '↻' },
  { name: 'more', title: 'More', glyph: '≡' },
] as const;

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
          tabBarStyle: { backgroundColor: '#0c0f13', borderTopColor: C.line },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.4 },
        }}>
        {TABS.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{t.glyph}</Text> }} />
        ))}
      </Tabs>
      <Pressable accessibilityLabel="Quick capture" onPress={() => setCapturing(true)} style={{ position: 'absolute', right: 18, bottom: 72 + insets.bottom, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 }}>
        <Text style={{ fontSize: 28, color: '#06120d', marginTop: -2 }}>+</Text>
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
  const { ready, signedIn } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  return signedIn ? <Shell /> : <Login />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
