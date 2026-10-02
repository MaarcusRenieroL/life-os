import { useEffect } from 'react';
import { View } from 'react-native';

import { Btn } from '@/kit';
import { useLock } from '@/lib/lock';
import { useSession } from '@/lib/session';
import { Text } from '@/text';
import { C, F } from '@/theme';
import { Muted } from '@/ui';

/** Shown over the app while the fingerprint lock is on; asks as soon as it appears. */
export function LockScreen() {
  const { unlock } = useLock();
  const { signOut } = useSession();

  useEffect(() => {
    void unlock();
  }, [unlock]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 32, gap: 14 }}>
      <Text style={{ color: C.text, fontSize: 28, fontFamily: F.displayBold, letterSpacing: 8, textAlign: 'center' }}><Text style={{ color: C.accent }}>◆ </Text>LIFE_OS</Text>
      <Muted style={{ textAlign: 'center', marginBottom: 18 }}>Locked. Use your fingerprint or face to continue.</Muted>
      <Btn label="Unlock" onPress={() => void unlock()} />
      <Btn kind="ghost" label="Sign out instead" onPress={() => void signOut()} />
    </View>
  );
}
