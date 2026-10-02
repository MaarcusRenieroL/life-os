// The web app's palette (apps/web/src/index.css, oklch converted to sRGB) so native reads as the same product.
export const C = {
  bg: '#0d0d0f',
  sidebar: '#09090b',
  panel: '#161618',
  panelTop: '#19191c',
  panelBottom: '#111114',
  popover: '#18181a',
  secondary: '#242426',
  muted2: '#1f1f21',
  line: '#26262a', // oklch(1 0 0 / 10%) over the background
  input: '#2c2c30',
  text: '#ebebec',
  muted: '#89898d',
  accent: '#4fcb6f',
  accentFg: '#071009',
  gold: '#f0bb3b',
  magenta: '#fb55b1',
  cyan: '#2ad5e5',
  violet: '#a883ff',
  destructive: '#f75d59',
} as const;

/** Chakra Petch for headings/labels, Geist Mono for everything else - same pairing as the web. */
export const F = {
  display: 'ChakraPetch_600SemiBold',
  displayBold: 'ChakraPetch_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  monoSemi: 'GeistMono_600SemiBold',
  monoBold: 'GeistMono_700Bold',
} as const;

export const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);
