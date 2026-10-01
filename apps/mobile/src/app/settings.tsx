import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '@/text';

import { Btn, Screen } from '@/kit';
import { useSession } from '@/lib/session';
import { C } from '@/theme';
import { Label, Muted, Panel, s } from '@/ui';

export default function Settings() {
  const { settings, updateSettings, signOut } = useSession();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const field = (key: keyof typeof draft, name: string, secure = false) => (
    <View style={{ marginBottom: 12 }}>
      <Label>{name}</Label>
      <TextInput style={s.input} value={draft[key]} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} placeholderTextColor={C.muted} onChangeText={(v) => { setDraft({ ...draft, [key]: v }); setSaved(false); }} />
    </View>
  );
  return (
    <Screen title="Settings">
      <Panel title="Server">
        {field('baseUrl', 'Gateway address')}
        <Muted style={{ marginBottom: 12 }}>Use your Mac&apos;s address on the same Wi-Fi (for example http://192.168.1.2), or https://life-os.maarcus.dev with an Access service token.</Muted>
        {field('cfClientId', 'Access client id (optional)')}
        {field('cfClientSecret', 'Access client secret (optional)', true)}
        <Btn label="SAVE" onPress={() => void updateSettings({ ...draft, baseUrl: draft.baseUrl.trim().replace(/\/+$/, '') }).then(() => setSaved(true))} />
        {saved ? <Text style={{ color: C.muted, marginTop: 8 }}>Saved.</Text> : null}
      </Panel>
      <Panel title="Account"><Btn kind="danger" label="Sign out" onPress={() => void signOut()} /></Panel>
    </Screen>
  );
}
