import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Text, TextInput } from '@/text';

import { isMock } from '@/lib/runtime';
import { useSession } from '@/lib/session';
import { C, F } from '@/theme';
import { Label, Muted, s } from '@/ui';

export function Login() {
  const { signIn, settings } = useSession();
  const [email, setEmail] = useState(isMock ? 'player@life.os' : '');
  const [password, setPassword] = useState(isMock ? 'preview' : '');
  const [server, setServer] = useState(settings.baseUrl);
  const [cfId, setCfId] = useState(settings.cfClientId);
  const [cfSecret, setCfSecret] = useState(settings.cfClientSecret);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const url = server.trim().replace(/\/+$/, '');
      await signIn(email.trim(), password, { ...settings, baseUrl: url, cfClientId: cfId.trim(), cfClientSecret: cfSecret.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: C.text, fontSize: 30, fontFamily: F.displayBold, letterSpacing: 9, textAlign: 'center' }}><Text style={{ color: C.accent }}>◆ </Text>LIFE_OS</Text>
      <Muted style={{ textAlign: 'center', marginBottom: 24 }}>Press start to continue your run.</Muted>
      <Label>Email</Label>
      <TextInput style={[s.input, { marginBottom: 14 }]} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholderTextColor={C.muted} />
      <Label>Password</Label>
      <TextInput style={[s.input, { marginBottom: 14 }]} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholderTextColor={C.muted} />
      <Label>Server</Label>
      <TextInput style={[s.input, { marginBottom: 14 }]} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.1.2" placeholderTextColor={C.muted} />
      <Label>Access client id (only for https://life-os.maarcus.dev)</Label>
      <TextInput style={[s.input, { marginBottom: 14 }]} value={cfId} onChangeText={setCfId} autoCapitalize="none" autoCorrect={false} placeholder="optional" placeholderTextColor={C.muted} />
      <Label>Access client secret</Label>
      <TextInput style={[s.input, { marginBottom: 14 }]} value={cfSecret} onChangeText={setCfSecret} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="optional" placeholderTextColor={C.muted} />
      {error ? <Text style={{ color: C.magenta, marginBottom: 10 }}>{error}</Text> : null}
      <Pressable style={[s.primary, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void submit()}>
        <Text style={s.primaryText}>{busy ? 'CONNECTING…' : 'PRESS START'}</Text>
      </Pressable>
      <View style={{ height: 8 }} />
    </KeyboardAvoidingView>
  );
}
