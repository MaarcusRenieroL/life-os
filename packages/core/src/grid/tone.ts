export type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

const WORDS: [Tone, RegExp][] = [
  ['success', /\b(done|active|paid|success(ful)?|succeeded|strong|applied|categori[sz]ed|reconciled|completed?|on|yes|connected|money in|offer|accepted)\b/i],
  ['danger', /\b(failed|cancell?ed|overdue|duplicate|urgent|weak|rejected|dismissed|disputed|expired|deleted|money out|ghosted)\b/i],
  ['warn', /\b(needs|pending|review|paused|reused|waiting|high|undone|low use|due|archived)\b/i],
  ['info', /\b(task|bill|event|subscription|medium|interested|new|transfer|interview(ing)?|screening)\b/i],
];

/** A status word's tone, or `neutral` when the text isn't a status at all (names, places, free text). */
export function toneFor(text: string): Tone {
  for (const [tone, re] of WORDS) if (re.test(text)) return tone;
  return 'neutral';
}
