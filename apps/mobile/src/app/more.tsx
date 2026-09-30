import { MEDAL_HEX, TIER_NAMES } from '@life-os/core';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { usePlayer } from '@/lib/player';
import { useApi, useSession } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { C, inr } from '@/theme';
import { Bar, ErrorNote, Label, Muted, Panel, s } from '@/ui';

const SECTIONS = ['Jobs', 'Finance', 'Trophies', 'Settings'] as const;
type Section = (typeof SECTIONS)[number];
const STAGES = ['INTERESTED', 'WAITING_FOR_REFERRAL', 'REFERRED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
const label = (x: string) => x.toLowerCase().replace(/_/g, ' ');

function Jobs() {
  const api = useApi();
  const jobs = useAsync(() => api.jobs.list(), [api]);
  const list = jobs.data ?? [];
  if (jobs.error && !jobs.data) return <ErrorNote message={jobs.error} onRetry={jobs.reload} />;
  if (list.length === 0 && !jobs.loading) return <Muted>No applications yet.</Muted>;
  return (
    <>
      {STAGES.map((stage) => {
        const inStage = list.filter((j) => j.status === stage);
        return inStage.length === 0 ? null : (
          <Panel key={stage} title={`${label(stage)} · ${inStage.length}`}>
            {inStage.map((j) => (
              <View key={j.id} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{j.title}</Text>
                  <Muted>{j.company}</Muted>
                </View>
                {j.fitScore != null ? <Text style={{ color: C.accent }}>{j.fitScore}%</Text> : null}
              </View>
            ))}
          </Panel>
        );
      })}
    </>
  );
}

function Finance() {
  const api = useApi();
  const summary = useAsync(() => api.finance.summary(), [api]);
  if (summary.error && !summary.data) return <ErrorNote message={summary.error} onRetry={summary.reload} />;
  const d = summary.data;
  const cell = (name: string, value: string) => (
    <View style={{ width: '50%', marginBottom: 14 }}>
      <Muted>{name}</Muted>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>{value}</Text>
    </View>
  );
  return (
    <Panel title="This month">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cell('Income', inr(d?.totalIncome))}
        {cell('Spent', inr(d?.totalExpenses))}
        {cell('Saved', inr(d?.savings))}
        {cell('Fixed income', inr(d?.fixedMonthlyIncome))}
      </View>
    </Panel>
  );
}

function Trophies() {
  const { player } = usePlayer();
  const earned = player.achievements.reduce((sum, a) => sum + a.tier, 0);
  const total = player.achievements.reduce((sum, a) => sum + a.def.tiers.length, 0);
  return (
    <>
      <Panel title="Trophy room">
        <Text style={s.h2}>{earned} / {total} medals</Text>
        <View style={{ marginTop: 8 }}><Bar pct={(earned / total) * 100} color={C.gold} /></View>
      </Panel>
      {player.achievements.map((a) => {
        const color = a.tier > 0 ? MEDAL_HEX[a.tier - 1] : C.line;
        return (
          <Panel key={a.def.id} accent={a.tier > 0 ? color : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{a.def.name}</Text>
              <Text style={{ color: a.tier > 0 ? color : C.muted, fontSize: 12 }}>{a.tier > 0 ? TIER_NAMES[a.tier - 1] : 'Locked'}</Text>
            </View>
            <Muted style={{ marginBottom: 8 }}>{a.def.blurb}</Muted>
            <Bar pct={a.pct} color={color} />
            <Muted style={{ marginTop: 4 }}>{a.value.toLocaleString()}{a.next != null ? ` / ${a.next.toLocaleString()}` : ''} {a.def.unit}</Muted>
          </Panel>
        );
      })}
    </>
  );
}

function Settings() {
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
    <>
      <Panel title="Server">
        {field('baseUrl', 'Gateway address')}
        <Muted style={{ marginBottom: 12 }}>Use your Mac's address on the same Wi-Fi (for example http://192.168.1.2), or https://life-os.maarcus.dev with an Access service token.</Muted>
        {field('cfClientId', 'Access client id (optional)')}
        {field('cfClientSecret', 'Access client secret (optional)', true)}
        <Pressable style={s.primary} onPress={() => void updateSettings({ ...draft, baseUrl: draft.baseUrl.trim().replace(/\/+$/, '') }).then(() => setSaved(true))}><Text style={s.primaryText}>SAVE</Text></Pressable>
        {saved ? <Muted style={{ marginTop: 8 }}>Saved.</Muted> : null}
      </Panel>
      <Panel title="Account">
        <Pressable onPress={() => void signOut()} style={{ borderColor: C.magenta, borderWidth: 1, padding: 12, borderRadius: 4, alignItems: 'center' }}><Text style={{ color: C.magenta }}>Sign out</Text></Pressable>
      </Panel>
    </>
  );
}

export default function More() {
  const [section, setSection] = useState<Section>('Jobs');
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={false} tintColor={C.accent} onRefresh={() => setRefreshKey((n) => n + 1)} />}>
      <View style={{ flexDirection: 'row', marginBottom: 14, borderColor: C.line, borderWidth: 1, borderRadius: 4, overflow: 'hidden' }}>
        {SECTIONS.map((name) => (
          <Pressable key={name} onPress={() => setSection(name)} style={{ flex: 1, padding: 10, alignItems: 'center', backgroundColor: name === section ? '#101a17' : 'transparent' }}>
            <Text style={{ color: name === section ? C.accent : C.muted, fontSize: 12 }}>{name}</Text>
          </Pressable>
        ))}
      </View>
      <View key={`${section}-${refreshKey}`}>
        {section === 'Jobs' ? <Jobs /> : section === 'Finance' ? <Finance /> : section === 'Trophies' ? <Trophies /> : <Settings />}
      </View>
    </ScrollView>
  );
}
