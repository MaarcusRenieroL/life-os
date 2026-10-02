import { CheckCircle2, CircleDot, Clock, XCircle } from 'lucide-react';

type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

const TONES: Record<Tone, { cls: string; icon: typeof CircleDot | null }> = {
  success: { cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  warn: { cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400', icon: Clock },
  danger: { cls: 'border-red-500/30 bg-red-500/10 text-red-400', icon: XCircle },
  info: { cls: 'border-sky-500/30 bg-sky-500/10 text-sky-400', icon: CircleDot },
  neutral: { cls: 'border-border bg-muted/40 text-muted-foreground', icon: null },
};

const WORDS: [Tone, RegExp][] = [
  ['success', /\b(done|active|paid|success(ful)?|succeeded|strong|applied|categori[sz]ed|reconciled|completed?|on|yes|connected|money in)\b/i],
  ['danger', /\b(failed|cancell?ed|overdue|duplicate|urgent|weak|rejected|dismissed|disputed|expired|deleted|money out)\b/i],
  ['warn', /\b(needs|pending|review|paused|reused|waiting|high|undone|low use|due)\b/i],
  ['info', /\b(task|bill|event|subscription|medium|interested|new|transfer)\b/i],
];

/** A status word's tone, or `neutral` when the text isn't a status at all (names, places, free text). */
export function toneFor(text: string): Tone {
  for (const [tone, re] of WORDS) if (re.test(text)) return tone;
  return 'neutral';
}

/** A small coloured status pill with an icon, in the HUD's palette. */
export function DataChip({ children, tone }: { children: string; tone?: Tone }) {
  const resolved = tone ?? toneFor(children);
  const { cls, icon: Icon } = TONES[resolved];
  return (
    <span className={`inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}
