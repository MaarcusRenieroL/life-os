// The website's HUD kit (apps/web/src/features/player/hud.tsx) for React Native.
import { RANK_HEX, type Attribute, type Rank } from '@life-os/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Dimensions, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/text';
import { C, F } from '@/theme';

/** Framed panel with a vertical gradient and corner brackets tinted by `accent`. */
export function HudPanel({ accent = C.accent, children, style, padding = 18 }: { accent?: string; children: ReactNode; style?: ViewStyle; padding?: number }) {
  return (
    <View style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 2, marginBottom: 16, overflow: 'visible' }, style]}>
      <LinearGradient colors={['#19191c', '#111114']} style={{ padding, borderRadius: 1 }}>
        {children}
      </LinearGradient>
      <View pointerEvents="none" style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderColor: accent }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderColor: accent }} />
    </View>
  );
}

export function HudLabel({ children, color = C.muted, size = 10.5 }: { children: ReactNode; color?: string; size?: number }) {
  return <Text style={{ color, fontFamily: F.display, fontSize: size, letterSpacing: size * 0.22, textTransform: 'uppercase' }}>{children}</Text>;
}

/** A section title with a rule trailing off to the right. */
export function HudHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <HudLabel color={`${C.text}cc`}>{children}</HudLabel>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      {aside}
    </View>
  );
}

export function XpBar({ pct, color = C.accent, height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: '#ffffff17', borderRadius: 1 }}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, shadowColor: color, shadowOpacity: 0.75, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
    </View>
  );
}

const HEX = [[50, 0], [93, 25], [93, 75], [50, 100], [7, 75], [7, 25]];
const hexPoints = (inset: number) => HEX.map(([x, y]) => `${inset + (x / 100) * (100 - inset * 2)},${inset + (y / 100) * (100 - inset * 2)}`).join(' ');

/** The player's level inside a hexagon whose colour is their rank. */
export function LevelBadge({ level, rank, size = 72 }: { level: number | string; rank: Rank; size?: number }) {
  const color = RANK_HEX[rank.letter];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Polygon points={hexPoints(0)} fill={color} opacity={0.55} />
        <Polygon points={hexPoints(2)} fill={C.panel} />
      </Svg>
      <Text style={{ color, fontFamily: F.display, fontSize: size * 0.11, letterSpacing: size * 0.02 }}>LV</Text>
      <Text style={{ color, fontFamily: F.displayBold, fontSize: size * 0.36, lineHeight: size * 0.4, textShadowColor: color, textShadowRadius: 10 }}>{level}</Text>
    </View>
  );
}

export function RankChip({ rank }: { rank: Rank }) {
  const color = RANK_HEX[rank.letter];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: `${color}73`, backgroundColor: `${color}1a`, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color, fontFamily: F.displayBold, fontSize: 14 }}>{rank.letter}</Text>
      <Text style={{ color, fontFamily: F.display, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' }}>{rank.title}</Text>
    </View>
  );
}

export function StreakFlame({ days, safe }: { days: number; safe: boolean }) {
  const lit = days > 0;
  const color = lit ? '#fb923c' : '#89898d66';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Flame size={24} color={color} fill={lit ? color : 'none'} style={lit && safe ? { shadowColor: '#fb923c', shadowOpacity: 0.8, shadowRadius: 8 } : undefined} />
      <View>
        <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 20, lineHeight: 22 }}>{days}</Text>
        <HudLabel size={8.5}>day streak</HudLabel>
      </View>
    </View>
  );
}

export function AttributeMeter({ attribute, color }: { attribute: Attribute; color?: string }) {
  const { value } = attribute;
  return (
    <View style={{ opacity: value == null ? 0.45 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <HudLabel color={`${C.text}bf`}>{attribute.key}</HudLabel>
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 14 }}>{value ?? '—'}</Text>
      </View>
      <XpBar pct={value ?? 0} color={color} />
      <Text numberOfLines={1} style={{ color: `${C.muted}b3`, fontSize: 10, marginTop: 4 }}>{attribute.label}</Text>
    </View>
  );
}

/** Seven attributes as a radar polygon. */
export function AttributeRadar({ attributes, size = 240 }: { attributes: Attribute[]; size?: number }) {
  const c = size / 2;
  const radius = size / 2 - 34;
  const n = attributes.length;
  const point = (i: number, scale: number): [number, number] => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(angle) * radius * scale, c + Math.sin(angle) * radius * scale];
  };
  const ring = (scale: number) => attributes.map((_, i) => point(i, scale).join(',')).join(' ');
  const shape = attributes.map((a, i) => point(i, (a.value ?? 0) / 100).join(',')).join(' ');
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((sc) => <Polygon key={sc} points={ring(sc)} fill="none" stroke={C.line} strokeWidth={sc === 1 ? 1.2 : 0.7} />)}
        {attributes.map((_, i) => { const [x, y] = point(i, 1); return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke={C.line} strokeWidth={0.7} />; })}
        <Polygon points={shape} fill={C.accent} fillOpacity={0.18} stroke={C.accent} strokeWidth={1.8} />
        {attributes.map((a, i) => {
          const [x, y] = point(i, (a.value ?? 0) / 100);
          const [lx, ly] = point(i, 1.2);
          return (
            <G key={a.key}>
              <Circle cx={x} cy={y} r={2.6} fill={a.value == null ? C.muted : C.accent} />
              <SvgText x={lx} y={ly + 3} textAnchor="middle" fill={`${C.text}cc`} fontSize={10} fontFamily={F.display} letterSpacing={1.2}>{a.key}</SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** The faint grid and top glow behind every page (hud-bg on the website). */
export function HudBackdrop() {
  const { width, height } = Dimensions.get('window');
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width={width} height={height * 1.2}>
        <Defs>
          <Pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <Path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" strokeOpacity={0.035} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
      </Svg>
      <LinearGradient colors={['#4fcb6f17', '#4fcb6f00']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }} />
    </View>
  );
}
