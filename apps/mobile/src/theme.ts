export const C = {
  bg: '#0a0c0f',
  panel: '#10141a',
  line: '#222a33',
  text: '#e7ecf2',
  muted: '#8791a0',
  accent: '#3ddc97',
  gold: '#f2b84b',
  magenta: '#ff4fa3',
  cyan: '#35c6e8',
  violet: '#9b7bff',
} as const;

export const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);
