import { Check, Flag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Confetti } from './confetti';
import { HudLabel, XpBar } from './hud';

/**
 * A quest strip above a table: what is left to clear, as a progress bar. When the last item is cleared
 * during the visit (not when you arrive at an already-finished list) it plays a short celebration.
 */
export function TableQuest({
  title,
  done,
  total,
  unit,
  doneText,
}: {
  title: string;
  done: number;
  total: number;
  /** What is being counted, plural: "proposals", "transactions". */
  unit: string;
  /** Shown once everything is cleared. */
  doneText: string;
}) {
  const complete = total > 0 && done >= total;
  const wasComplete = useRef<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (wasComplete.current === false && complete) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 1800);
      return () => clearTimeout(timer);
    }
    wasComplete.current = complete;
  }, [complete]);

  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="hud-panel relative mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-quest={complete ? 'complete' : 'active'}>
      <div className="flex items-center gap-2">
        {complete ? <Check className="size-4 text-primary" /> : <Flag className="size-4 text-primary" />}
        <HudLabel>Quest</HudLabel>
        <span className="text-sm font-medium">{complete ? doneText : title}</span>
      </div>
      <div className="flex min-w-40 flex-1 items-center gap-3">
        <XpBar pct={pct} className="flex-1" />
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {done} / {total} {unit} · {pct}%
        </span>
      </div>
      {celebrate && <Confetti />}
    </div>
  );
}
