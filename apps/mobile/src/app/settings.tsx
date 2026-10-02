import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text, TextInput } from '@/text';

import { Btn, Screen, Seg } from '@/kit';
import { IntegrationsTab, ModulesTab, NotificationsTab, ProfileTab, SetupTab } from '@/modules/settings-extra';
import { useLock } from '@/lib/lock';
import { useSession } from '@/lib/session';
import { C } from '@/theme';
import { Label, Muted, Panel, s } from '@/ui';

const TABS = [{ id: 'general', label: 'General' }, { id: 'profile', label: 'Profile' }, { id: 'modules', label: 'Modules' }, { id: 'setup', label: 'Setup' }, { id: 'integrations', label: 'Integrations' }, { id: 'notifications', label: 'Notifications' }] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Settings() {
  const [tab, setTab] = useState<TabId>('general');
  const { settings, updateSettings, signOut } = useSession();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const lock = useLock();
  const [lockError, setLockError] = useState<string | null>(null);
  const field = (key: keyof typeof draft, name: string, secure = false) => (
    <View style={{ marginBottom: 12 }}>
      <Label>{name}</Label>
      <TextInput style={s.input} value={draft[key]} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} placeholderTextColor={C.muted} onChangeText={(v) => { setDraft({ ...draft, [key]: v }); setSaved(false); }} />
    </View>
  );
  return (
    <Screen title="Settings">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'profile' ? <ProfileTab /> : tab === 'modules' ? <ModulesTab /> : tab === 'setup' ? <SetupTab /> : tab === 'integrations' ? <IntegrationsTab /> : tab === 'notifications' ? <NotificationsTab /> : (
      <>
      <Panel title="Server">
        {field('baseUrl', 'Gateway address')}
        <Muted style={{ marginBottom: 12 }}>Use your Mac&apos;s address on the same Wi-Fi (for example http://192.168.1.2), or https://life-os-api.maarcus.dev from anywhere.</Muted>
        {field('cfClientId', 'Access client id (optional)')}
        {field('cfClientSecret', 'Access client secret (optional)', true)}
        <Btn label="SAVE" onPress={() => void updateSettings({ ...draft, baseUrl: draft.baseUrl.trim().replace(/\/+$/, '') }).then(() => setSaved(true))} />
        {saved ? <Text style={{ color: C.muted, marginTop: 8 }}>Saved.</Text> : null}
      </Panel>
      <Panel title="Security">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text }}>Unlock with fingerprint</Text>
            <Muted>{lock.available ? 'Ask for your fingerprint or face when the app opens and after it has been in the background.' : 'Set up a fingerprint, face or screen lock in your phone settings first.'}</Muted>
          </View>
          <Switch value={lock.enabled} disabled={!lock.available && !lock.enabled} trackColor={{ true: C.accent }} onValueChange={(on) => { setLockError(null); void lock.setEnabled(on).then((ok) => { if (!ok) setLockError('Could not confirm your fingerprint, so the setting is unchanged.'); }); }} />
        </View>
        {lockError ? <Text style={{ color: C.destructive, marginTop: 8 }}>{lockError}</Text> : null}
      </Panel>
      <Panel title="Account"><Btn kind="danger" label="Sign out" onPress={() => void signOut()} /></Panel>
      </>
      )}
    </Screen>
  );
}
