import { ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold, GeistMono_700Bold } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import '@/alerts';
import { LockScreen } from '@/lock-screen';
import { LockProvider, useLock } from '@/lib/lock';
import { Login } from '@/login';
import { HudBackdrop } from '@/hud';
import { Drawer, Header } from '@/shell';
import { QuickCapture } from '@/quick-capture';
import { SessionProvider, useSession } from '@/lib/session';
import { C } from '@/theme';

const SCREENS = ['index', 'quests', 'tasks', 'habits', 'calendar', 'goals', 'notes', 'workouts', 'finance', 'jobs', 'analytics', 'trophies', 'settings', 'more', 'email', 'vault'] as const;

function Shell() {
  const insets = useSafeAreaInsets();
  const [capturing, setCapturing] = useState(false);
  const [menu, setMenu] = useState(false);
  // Bumped after a capture so screens refetch whatever it may have created.
  const [epoch, setEpoch] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <Header onMenu={() => setMenu(true)} onCapture={() => setCapturing(true)} />
      {/* The website has no tab bar: modules live in the sidebar sheet, so the router's own bar is off. */}
      <View style={{ flex: 1 }}>
      <Tabs key={epoch} tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
        {SCREENS.map((name) => <Tabs.Screen key={name} name={name} />)}
      </Tabs>
      <HudBackdrop />
      </View>
      <Drawer open={menu} onClose={() => setMenu(false)} />
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

function Locked({ children }: { children: React.ReactNode }) {
  const { locked, ready } = useLock();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return locked ? <LockScreen /> : <>{children}</>;
}

function Gate() {
  const { ready, signedIn, settings } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  return signedIn ? <LockProvider signedIn><Locked><Shell /></Locked></LockProvider> : <Login key={`${settings.baseUrl}|${settings.cfClientId}|${settings.cfClientSecret}`} />;
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
