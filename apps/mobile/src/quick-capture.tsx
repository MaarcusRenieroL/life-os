import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useApi } from '@/lib/session';
import { C } from '@/theme';
import { Label, Muted, s, success } from '@/ui';

/** One line in, routed by the local model to the right module. */
export function QuickCapture({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const api = useApi();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.quickCapture(text.trim());
      success();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture that');
      setBusy(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000b' }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: C.panel, padding: 18, gap: 10, borderTopColor: C.accent, borderTopWidth: 1 }}>
          <Label>Quick capture</Label>
          <TextInput autoFocus style={s.input} value={text} onChangeText={setText} editable={!busy} placeholder='"call mom tomorrow" or "pay rent 12000 friday"' placeholderTextColor={C.muted} returnKeyType="send" onSubmitEditing={() => void submit()} />
          {error ? <Text style={{ color: C.magenta }}>{error}</Text> : null}
          <Pressable style={[s.primary, (!text.trim() || busy) && { opacity: 0.5 }]} disabled={!text.trim() || busy} onPress={() => void submit()}>
            <Text style={s.primaryText}>{busy ? 'ROUTING…' : 'SEND'}</Text>
          </Pressable>
          <Muted>Routed to tasks, finance or jobs by the local model.</Muted>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
