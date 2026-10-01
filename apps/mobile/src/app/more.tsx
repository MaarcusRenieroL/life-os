import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/kit';
import { C } from '@/theme';
import { Muted, s } from '@/ui';

const ITEMS: { href: string; title: string; blurb: string; glyph: string }[] = [
  { href: '/quests', title: 'Quests', blurb: 'Today’s missions and XP', glyph: '⚔' },
  { href: '/goals', title: 'Goals', blurb: 'Milestones, metrics, reviews', glyph: '◎' },
  { href: '/notes', title: 'Notes', blurb: 'Write, pin, search', glyph: '✎' },
  { href: '/workouts', title: 'Workouts', blurb: 'Log sets, routines, records', glyph: '♥' },
  { href: '/finance', title: 'Finance', blurb: 'Spending, budgets, subscriptions', glyph: '₹' },
  { href: '/jobs', title: 'Job tracker', blurb: 'Pipeline and follow-ups', glyph: '✦' },
  { href: '/analytics', title: 'Analytics', blurb: 'Weekly review and trends', glyph: '∿' },
  { href: '/trophies', title: 'Trophies', blurb: 'Medals and achievements', glyph: '★' },
  { href: '/settings', title: 'Settings', blurb: 'Server and account', glyph: '⚙' },
];

export default function More() {
  const router = useRouter();
  return (
    <Screen title="More" back={false}>
      {ITEMS.map((item) => (
        <Pressable key={item.title} onPress={() => router.push(item.href as Href)} style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
          <Text style={{ color: C.accent, fontSize: 22, width: 28, textAlign: 'center' }}>{item.glyph}</Text>
          <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text><Muted>{item.blurb}</Muted></View>
          <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
