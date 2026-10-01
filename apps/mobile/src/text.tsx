// Drop-in Text/TextInput that default to the web's mono face. Custom font families ignore fontWeight on
// Android, so the weight picks the right file instead.
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

import { F } from './theme';

function family(style: unknown): string {
  const flat = StyleSheet.flatten(style as never) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  if (flat?.fontFamily) return flat.fontFamily;
  const w = Number(flat?.fontWeight === 'bold' ? 700 : flat?.fontWeight ?? 400);
  return w >= 800 ? F.monoBold : w >= 700 ? F.monoBold : w >= 600 ? F.monoSemi : w >= 500 ? F.monoMedium : F.mono;
}

export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={[style, { fontFamily: family(style) }]} />;
}

export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput {...rest} style={[style, { fontFamily: family(style) }]} />;
}
